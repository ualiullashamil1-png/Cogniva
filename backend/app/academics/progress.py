"""Сводка для дашборда: предметы, сильные и слабые подтемы, последние оценки."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import GradeRecord, Student, Subject, Subtopic, SubtopicProgress, Topic
from app.deps import current_student

router = APIRouter(prefix="/api", tags=["profile"])
ATTENTION_BELOW = 0.6


def _avg(xs):
    return round(sum(xs) / len(xs), 3) if xs else None


@router.get("/profile/overview")
def overview(student: Student = Depends(current_student), db: Session = Depends(get_db)):
    grades = db.query(GradeRecord).filter_by(student_id=student.id).order_by(GradeRecord.date, GradeRecord.id).all()
    rows = (db.query(SubtopicProgress, Subtopic, Topic, Subject)
            .join(Subtopic, Subtopic.id == SubtopicProgress.subtopic_id)
            .join(Topic, Topic.id == Subtopic.topic_id)
            .join(Subject, Subject.id == Topic.subject_id)
            .filter(SubtopicProgress.student_id == student.id, SubtopicProgress.tasks_done > 0).all())
    subjects = []
    for s in db.query(Subject).filter_by(student_id=student.id).order_by(Subject.id):
        pct = [g.score / g.max_score for g in grades if g.subject_id == s.id]
        mastery = [p.mastery for p, _, _, subj in rows if subj.id == s.id]
        subjects.append({"id": s.id, "name": s.name, "grades_count": len(pct),
                         "avg_grade_percent": None if not pct else round(_avg(pct) * 100, 1),
                         "avg_mastery": _avg(mastery), "assessed_subtopics": len(mastery)})

    def item(p, st, t, subj):
        return {"subtopic_id": st.id, "name": st.name, "topic": t.name, "subject": subj.name,
                "mastery": p.mastery, "difficulties": p.difficulties}

    items = [item(*r) for r in rows]
    return {"student": {"id": student.id, "display_name": student.display_name, "grade_level": student.grade_level},
            "subjects": subjects,
            "strongest": sorted(items, key=lambda i: -i["mastery"])[:3],
            "needs_attention": sorted([i for i in items if i["mastery"] < ATTENTION_BELOW], key=lambda i: i["mastery"])[:5],
            "grade_history": [{"id": g.id, "subject_id": g.subject_id, "percent": round(g.score / g.max_score * 100, 1),
                               "title": g.title, "date": g.date.isoformat()} for g in grades],
            "recent_grades": [{"id": g.id, "subject_id": g.subject_id, "score": g.score, "max_score": g.max_score,
                               "title": g.title} for g in grades[-5:][::-1]]}
