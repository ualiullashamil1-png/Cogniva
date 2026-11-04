"""Завершение теста: подсчёт, определение ошибок, обновление профиля ученика."""
from collections import Counter, defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from app.database.models import (DiagnosticTest, Student, StudentAnswer, SubtopicProgress, TestQuestion, Topic)
from app.diagnostics.misconceptions import label
from app.learning.knowledge_model import update_mastery

WEAK_BELOW = 0.6


class FinishedError(Exception):
    """Тест уже завершён."""


class NoAnswersError(Exception):
    """В тесте нет ни одного ответа."""


def _recommendation(weak: list[dict]) -> str:
    if not weak:
        return "Хороший результат: основные понятия усвоены. Можно переходить к более сложным задачам."
    names = ", ".join(f"«{w['name']}»" for w in weak)
    text = f"Начните с подтем: {names}."
    mis = [m["label"] for w in weak for m in w["misconceptions"]]
    if mis:
        text += " Замечены ошибки: " + "; ".join(dict.fromkeys(mis)) + "."
    return text


def finish_test(db: Session, student: Student, test: DiagnosticTest) -> dict:
    if test.status != "in_progress":
        raise FinishedError
    qs = db.query(TestQuestion).filter_by(test_id=test.id).order_by(TestQuestion.order).all()
    answers = {a.question_id: a for a in db.query(StudentAnswer).filter(
        StudentAnswer.question_id.in_([q.id for q in qs]))}
    answered = [(q, answers[q.id]) for q in qs if q.id in answers]
    if not answered:
        raise NoAnswersError

    per = defaultdict(lambda: {"correct": 0, "total": 0, "mis": Counter()})
    for q, a in answered:                        # неотвеченные вопросы просто не учитываются
        p = per[q.subtopic_key]
        p["total"] += 1
        p["correct"] += 1 if a.is_correct else 0
        if a.misconception:
            p["mis"][a.misconception] += 1

    topic = db.get(Topic, test.topic_id)
    sub_by_key = {s.key: s for s in topic.subtopics}
    subtopics = []
    for key, d in per.items():
        st = sub_by_key[key]
        prog = db.query(SubtopicProgress).filter_by(student_id=student.id, subtopic_id=st.id).first()
        if not prog:
            prog = SubtopicProgress(student_id=student.id, subtopic_id=st.id, mastery=0.5,
                                    tasks_done=0, correct=0, incorrect=0, difficulties=[])
            db.add(prog)
        before = prog.mastery if prog.tasks_done > 0 else None
        after = update_mastery(prog, d["correct"], d["total"])
        mis = [{"key": k, "label": label(k), "count": n} for k, n in d["mis"].most_common()]
        prog.difficulties = list(dict.fromkeys(list(prog.difficulties or []) + [m["label"] for m in mis]))
        accuracy = d["correct"] / d["total"]
        prog.recommendation = ("Подтема усвоена на хорошем уровне." if accuracy >= WEAK_BELOW and after >= WEAK_BELOW
                               else "Нужно повторить эту подтему.")
        subtopics.append({"key": key, "name": st.name, "correct": d["correct"], "total": d["total"],
                          "accuracy": round(accuracy, 3), "mastery_before": before, "mastery_after": after,
                          "misconceptions": mis})
    subtopics.sort(key=lambda s: s["mastery_after"])
    weak = [s for s in subtopics if s["accuracy"] < WEAK_BELOW or s["mastery_after"] < WEAK_BELOW]
    correct_total = sum(s["correct"] for s in subtopics)
    result = {"length": test.result["length"], "answered": len(answered),
              "incomplete": len(answered) < test.result["length"],
              "score": round(correct_total / len(answered), 3), "subtopics": subtopics,
              "weak_subtopics": [w["key"] for w in weak], "recommendation": _recommendation(weak)}
    test.result = result
    test.status = "finished"
    test.finished_at = datetime.utcnow()
    db.commit()
    return result