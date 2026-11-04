"""Предметы -> темы -> подтемы. Каждый запрос проверяет, что запись принадлежит вошедшему ученику."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Student, Subject, Subtopic, SubtopicProgress, Topic
from app.deps import current_student
from app.schemas import NameIn, SubtopicIn

router = APIRouter(prefix="/api", tags=["subjects"])


def owned_subject(db: Session, student: Student, subject_id: int) -> Subject:
    s = db.get(Subject, subject_id)
    if not s or s.student_id != student.id:
        raise HTTPException(404, "Предмет не найден")   # 404, а не 403: не раскрываем чужие данные
    return s


def owned_topic(db: Session, student: Student, topic_id: int) -> Topic:
    t = db.get(Topic, topic_id)
    if not t or not db.get(Subject, t.subject_id) or db.get(Subject, t.subject_id).student_id != student.id:
        raise HTTPException(404, "Тема не найдена")
    return t


def owned_subtopic(db: Session, student: Student, subtopic_id: int) -> Subtopic:
    st = db.get(Subtopic, subtopic_id)
    if not st:
        raise HTTPException(404, "Подтема не найдена")
    owned_topic(db, student, st.topic_id)
    return st


def _progress_out(p: SubtopicProgress | None) -> dict:
    if not p:
        return {"mastery": None, "assessed": False, "tasks_done": 0, "correct": 0, "incorrect": 0,
                "difficulties": [], "recommendation": "", "last_assessed": None}
    return {"mastery": p.mastery if p.tasks_done > 0 else None, "assessed": p.tasks_done > 0,
            "tasks_done": p.tasks_done, "correct": p.correct, "incorrect": p.incorrect,
            "difficulties": p.difficulties, "recommendation": p.recommendation,
            "last_assessed": p.last_assessed.isoformat() if p.last_assessed else None}


def subject_tree(db: Session, student: Student, subject: Subject) -> dict:
    prog = {p.subtopic_id: p for p in db.query(SubtopicProgress).filter_by(student_id=student.id)}
    return {"id": subject.id, "name": subject.name, "topics": [
        {"id": t.id, "name": t.name, "subtopics": [
            {"id": st.id, "name": st.name, "description": st.description, "key": st.key,
             "progress": _progress_out(prog.get(st.id))} for st in t.subtopics]}
        for t in subject.topics]}


@router.get("/subjects")
def list_subjects(student: Student = Depends(current_student), db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter_by(student_id=student.id).order_by(Subject.id).all()
    return [subject_tree(db, student, s) for s in subjects]


@router.post("/subjects", status_code=201)
def create_subject(data: NameIn, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    if db.query(Subject).filter_by(student_id=student.id, name=data.name).first():
        raise HTTPException(409, "Такой предмет уже есть")
    s = Subject(student_id=student.id, name=data.name)
    db.add(s); db.commit()
    return subject_tree(db, student, s)


@router.post("/subjects/{subject_id}/topics", status_code=201)
def create_topic(subject_id: int, data: NameIn, student: Student = Depends(current_student),
                 db: Session = Depends(get_db)):
    subject = owned_subject(db, student, subject_id)
    if any(t.name == data.name for t in subject.topics):
        raise HTTPException(409, "Такая тема уже есть")
    db.add(Topic(subject_id=subject.id, name=data.name)); db.commit()
    db.refresh(subject)
    return subject_tree(db, student, subject)


@router.post("/topics/{topic_id}/subtopics", status_code=201)
def create_subtopic(topic_id: int, data: SubtopicIn, student: Student = Depends(current_student),
                    db: Session = Depends(get_db)):
    topic = owned_topic(db, student, topic_id)
    if any(st.name == data.name for st in topic.subtopics):
        raise HTTPException(409, "Такая подтема уже есть")
    st = Subtopic(topic_id=topic.id, name=data.name, description=data.description, key=data.key or "")
    db.add(st); db.flush()
    if not st.key:
        st.key = f"custom_{st.id}"
    db.add(SubtopicProgress(student_id=student.id, subtopic_id=st.id, mastery=0.5, tasks_done=0))
    db.commit()
    return {"id": st.id, "name": st.name, "description": st.description, "key": st.key,
            "progress": _progress_out(None)}
