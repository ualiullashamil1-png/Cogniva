"""Школьные оценки. Важно: оценка НЕ меняет mastery (это разные вещи)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.academics.subjects import owned_subject, owned_subtopic
from app.database.connection import get_db
from app.database.models import GradeRecord, Student, Topic
from app.deps import current_student
from app.schemas import GradeIn, GradePatch

router = APIRouter(prefix="/api", tags=["grades"])


def _out(g: GradeRecord) -> dict:
            return {"id": g.id, "subject_id": g.subject_id, "subtopic_id": g.subtopic_id, "kind": g.kind, "score": g.score,
            "max_score": g.max_score, "percent": round(g.score / g.max_score * 100, 1),
            "title": g.title, "date": g.date.isoformat()}


def _owned_grade(db: Session, student: Student, grade_id: int) -> GradeRecord:
    g = db.get(GradeRecord, grade_id)
    if not g or g.student_id != student.id:
        raise HTTPException(404, "Оценка не найдена")
    return g


@router.post("/grades", status_code=201)
def add_grade(data: GradeIn, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    subject = owned_subject(db, student, data.subject_id)
    if data.kind in ("sor", "soch") and data.subtopic_id is None:
        raise HTTPException(422, "Для СОР и СОЧ выберите подтему")
    if data.subtopic_id is not None:
        st = owned_subtopic(db, student, data.subtopic_id)
        if db.get(Topic, st.topic_id).subject_id != subject.id:
            raise HTTPException(422, "Подтема относится к другому предмету")
    g = GradeRecord(student_id=student.id, **data.model_dump())
    db.add(g); db.commit()
    return _out(g)


@router.get("/grades")
def list_grades(subject_id: int | None = None, student: Student = Depends(current_student),
                db: Session = Depends(get_db)):
    q = db.query(GradeRecord).filter_by(student_id=student.id)
    if subject_id is not None:
        q = q.filter_by(subject_id=subject_id)
    return [_out(g) for g in q.order_by(GradeRecord.date, GradeRecord.id).all()]


@router.patch("/grades/{grade_id}")
def edit_grade(grade_id: int, data: GradePatch, student: Student = Depends(current_student),
               db: Session = Depends(get_db)):
    g = _owned_grade(db, student, grade_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(g, k, v)
    if g.score > g.max_score:
        raise HTTPException(422, "Оценка не может быть больше максимальной")
    db.commit()
    return _out(g)


@router.delete("/grades/{grade_id}", status_code=204)
def delete_grade(grade_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    db.delete(_owned_grade(db, student, grade_id)); db.commit()
