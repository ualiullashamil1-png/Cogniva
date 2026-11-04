"""Какие данные ученика уходят в ИИ. Принцип: только нужное, без имени, логина и школьных оценок."""
from sqlalchemy.orm import Session

from app.database.models import DiagnosticTest, Student, SubtopicProgress, Topic


class NoSubtopicsError(Exception):
    """В теме нет подтем с ключами — урок построить не из чего."""


def build_context(db: Session, student: Student, topic: Topic) -> dict:
    last = (db.query(DiagnosticTest)
            .filter_by(student_id=student.id, topic_id=topic.id, status="finished")
            .order_by(DiagnosticTest.finished_at.desc()).first())
    last_by_key = {}
    if last and isinstance(last.result, dict):
        last_by_key = {s["key"]: s for s in last.result.get("subtopics", [])}

    subs = []
    for st in topic.subtopics:
        if not st.key:
            continue
        p = db.query(SubtopicProgress).filter_by(student_id=student.id, subtopic_id=st.id).first()
        assessed = bool(p and p.tasks_done > 0)
        mis = last_by_key.get(st.key, {}).get("misconceptions", [])
        subs.append({
            "key": st.key, "name": st.name,
            "mastery": round(p.mastery, 2) if assessed else None,     # None = ещё не оценивали
            "tasks_done": p.tasks_done if p else 0,
            "difficulties": list(p.difficulties or [])[:5] if p else [],
            "misconception_keys": [m["key"] for m in mis],
        })
    if not subs:
        raise NoSubtopicsError
    return {
        "topic": topic.name,
        "subtopics": subs,
        "last_test": ({"score": last.result.get("score"),
                       "weak_subtopics": last.result.get("weak_subtopics", [])} if last else None),
    }