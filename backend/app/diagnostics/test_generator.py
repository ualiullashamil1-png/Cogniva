"""Адаптивный подбор вопросов: следующий вопрос зависит от профиля и прошлых ответов в этом тесте."""
from collections import defaultdict

from sqlalchemy.orm import Session

from app.database.models import (DiagnosticTest, Student, StudentAnswer, SubtopicProgress, TestQuestion, Topic)
from app.diagnostics.question_bank import BANK, Question

LENGTH = {"diagnostic": 8, "post_lesson": 5}


class NoQuestionsError(Exception):
    """Для выбранной темы нет вопросов в банке."""


def _topic_pool(topic: Topic) -> list[Question]:
    keys = {st.key for st in topic.subtopics if st.key}
    return [q for q in BANK if q.subtopic_key in keys]


def create_test(db: Session, student: Student, topic: Topic, kind: str) -> DiagnosticTest:
    pool = _topic_pool(topic)
    if not pool:
        raise NoQuestionsError
    used = {row[0] for row in db.query(TestQuestion.bank_id)            # вопросы, на которые ученик уже отвечал
            .join(DiagnosticTest, DiagnosticTest.id == TestQuestion.test_id)
            .join(StudentAnswer, StudentAnswer.question_id == TestQuestion.id)
            .filter(DiagnosticTest.student_id == student.id, DiagnosticTest.topic_id == topic.id)}
    length = min(LENGTH[kind], len(pool))
    fresh = [q for q in pool if q.id not in used]
    avoid = sorted(used) if len(fresh) >= length else []               # избегаем повторов, только если хватает новых
    test = DiagnosticTest(student_id=student.id, topic_id=topic.id, kind=kind,
                          result={"length": length, "avoid": avoid})
    db.add(test)
    db.flush()
    add_next_question(db, student, test, topic)
    return test


def _target_difficulty(last: tuple[int, bool] | None, mastery: float) -> int:
    if last:                                   # уже спрашивали эту подтему в тесте
        difficulty, ok = last
        return min(3, difficulty + 1) if ok else max(1, difficulty - 1)
    return 1 if mastery < 0.45 else 2 if mastery < 0.75 else 3


def add_next_question(db: Session, student: Student, test: DiagnosticTest, topic: Topic) -> TestQuestion | None:
    """Выбирает следующий вопрос и сохраняет его в тест. None — тест набрал нужную длину."""
    length = test.result["length"]
    asked = db.query(TestQuestion).filter_by(test_id=test.id).order_by(TestQuestion.order).all()
    if len(asked) >= length:
        return None
    answers = {a.question_id: a for a in db.query(StudentAnswer).filter(
        StudentAnswer.question_id.in_([q.id for q in asked]))}
    stats = defaultdict(lambda: {"count": 0, "wrong": 0, "last": None})
    for tq in asked:
        s, a = stats[tq.subtopic_key], answers.get(tq.id)
        s["count"] += 1
        if a is not None:
            s["wrong"] += 0 if a.is_correct else 1
            s["last"] = (tq.difficulty, bool(a.is_correct))
    mastery = {}
    for st in topic.subtopics:
        p = db.query(SubtopicProgress).filter_by(student_id=student.id, subtopic_id=st.id).first()
        mastery[st.key] = p.mastery if p and p.tasks_done > 0 else 0.5

    asked_ids = {tq.bank_id for tq in asked}
    candidates = [q for q in _topic_pool(topic) if q.id not in asked_ids]
    avoid = set(test.result.get("avoid", []))
    candidates = [q for q in candidates if q.id not in avoid] or candidates
    if not candidates:
        return None

    def priority(q: Question):
        s = stats[q.subtopic_key]
        target = _target_difficulty(s["last"], mastery[q.subtopic_key])
        # 1) сначала охватить все подтемы, 2) потом добирать там, где были ошибки,
        # 3) слабые подтемы раньше, 4) сложность ближе к целевой
        return (s["count"] - 0.5 * s["wrong"], mastery[q.subtopic_key], abs(q.difficulty - target), q.id)

    q = min(candidates, key=priority)
    tq = TestQuestion(test_id=test.id, bank_id=q.id, subtopic_key=q.subtopic_key, qtype=q.qtype,
                      difficulty=q.difficulty, order=len(asked),
                      payload={"text": q.text, "options": list(q.options), "unit": q.unit, "graph": q.graph})
    db.add(tq)
    db.flush()
    return tq