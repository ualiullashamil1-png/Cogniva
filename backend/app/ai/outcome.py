"""Итоги урока: сравнение диагностики ДО и итогового теста ПОСЛЕ.
Связь с уроком без изменения базы: «до» = последний завершённый тест по теме перед уроком,
«после» = первый завершённый итоговый тест, начатый после начала урока."""
from sqlalchemy.orm import Session

from app.ai.lesson_models import LessonSession
from app.database.models import DiagnosticTest, LearningStrategy, Student

DELTA = 0.03       # изменение освоения меньше этого считаем шумом
CAVEAT = ("Это результат одного итогового теста: он показывает динамику, но не доказывает, "
          "что именно этот способ объяснения помог. Вывод станет надёжнее после нескольких уроков.")


def _brief(s):
    return None if s is None else {"correct": s["correct"], "total": s["total"], "accuracy": s["accuracy"]}


def _recommendation(rows: list, post: dict | None) -> str:
    if post is None:
        return "Пройдите итоговый тест, чтобы увидеть, что изменилось после урока."
    names = {r["key"]: r["name"] for r in rows}
    parts = []
    improved = [names[r["key"]] for r in rows if r["status"] == "improved"]
    if improved:
        parts.append("Улучшение: " + ", ".join(f"«{n}»" for n in improved) + ".")
    weak = post.get("weak_subtopics", [])
    if weak:
        parts.append("Ещё требуют внимания: " + ", ".join(f"«{names.get(k, k)}»" for k in weak) + ".")
        mis = [m["label"] for r in rows if r["key"] in weak for m in r["misconceptions"]]
        if mis:
            parts.append("Замечены ошибки: " + "; ".join(dict.fromkeys(mis)) + ".")
        parts.append("Рекомендуем повторить их в новом уроке, возможно, другим способом объяснения.")
    else:
        parts.append("Слабых мест по итоговому тесту не осталось: можно переходить к более сложным задачам.")
    return " ".join(parts)


def compare_results(pre: dict | None, post: dict | None, focus: list) -> dict:
    """Чистая функция (без базы): принимает result двух тестов, возвращает сравнение."""
    pre_map = {s["key"]: s for s in (pre or {}).get("subtopics", [])}
    post_map = {s["key"]: s for s in (post or {}).get("subtopics", [])}
    keys = list(dict.fromkeys([k for k in focus if k in pre_map or k in post_map]
                              + list(post_map) + list(pre_map)))
    rows = []
    for k in keys:
        a, b = pre_map.get(k), post_map.get(k)
        m0 = a["mastery_after"] if a else None
        m1 = b["mastery_after"] if b else None
        if m0 is None or m1 is None:
            delta, status = None, "no_data"
        else:
            delta = round(m1 - m0, 3)
            status = "improved" if delta > DELTA else "declined" if delta < -DELTA else "same"
        rows.append({"key": k, "name": (b or a)["name"], "pre": _brief(a), "post": _brief(b),
                     "mastery_before": m0, "mastery_after": m1, "delta": delta, "status": status,
                     "misconceptions": b["misconceptions"] if b else []})
    return {"state": "ready" if post else "waiting_post",
            "has_pre": pre is not None, "has_post": post is not None,
            "pre_score": pre["score"] if pre else None, "post_score": post["score"] if post else None,
            "subtopics": rows,
            "improved": [r["key"] for r in rows if r["status"] == "improved"],
            "remaining_weak": post.get("weak_subtopics", []) if post else [],
            "recommendation": _recommendation(rows, post), "caveat": CAVEAT}


def compute_outcome(db: Session, student: Student, lesson: LessonSession) -> dict:
    base = db.query(DiagnosticTest).filter_by(student_id=student.id, topic_id=lesson.topic_id,
                                              status="finished")
    pre = (base.filter(DiagnosticTest.finished_at <= lesson.created_at)
           .order_by(DiagnosticTest.finished_at.desc()).first())
    post = (base.filter(DiagnosticTest.kind == "post_lesson", DiagnosticTest.started_at >= lesson.created_at)
            .order_by(DiagnosticTest.finished_at.asc()).first())
    out = compare_results(pre.result if pre else None, post.result if post else None,
                          (lesson.plan or {}).get("focus_subtopics", []))
    out["lesson_id"] = lesson.id
    return out


def record_strategies(db: Session, student: Student, lesson: LessonSession, out: dict) -> None:
    """Сохраняет, как изменился результат по подтемам урока (данные для будущих рекомендаций, D5).
    Один тест не разделяет подходы, поэтому все подходы урока получают один и тот же результат."""
    if out["state"] != "ready":
        return
    for key in (lesson.plan or {}).get("focus_subtopics", []):
        row = next((r for r in out["subtopics"] if r["key"] == key), None)
        if not row or row["pre"] is None or row["post"] is None:
            continue
        for ap in (lesson.plan or {}).get("approaches", []):
            exists = db.query(LearningStrategy).filter(
                LearningStrategy.student_id == student.id, LearningStrategy.subtopic_key == key,
                LearningStrategy.approach == ap[:40], LearningStrategy.created_at >= lesson.created_at).first()
            if not exists:
                db.add(LearningStrategy(student_id=student.id, subtopic_key=key, approach=ap[:40],
                                        score_before=row["pre"]["accuracy"], score_after=row["post"]["accuracy"]))
    db.commit()