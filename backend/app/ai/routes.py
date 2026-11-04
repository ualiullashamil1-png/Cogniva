"""API репетитора: статус ИИ, начать урок, диалог."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.academics.subjects import owned_topic
from app.ai import provider, tutor
from app.ai.context import NoSubtopicsError, build_context
from app.ai.lesson_models import LessonSession
from app.ai.planner import build_plan
from app.database.connection import get_db
from app.database.models import Student, Topic
from app.deps import current_student
from app.scenes.scene_planner import scene_for_plan
from app.ai.outcome import compute_outcome, record_strategies

router = APIRouter(prefix="/api", tags=["ai"])
MAX_MESSAGES = 100


class LessonStart(BaseModel):
    topic_id: int


class MessageIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=1000)
    intent: Literal["free", "simpler", "math", "analogy", "example"] = "free"


def _owned(db: Session, student: Student, lesson_id: int) -> LessonSession:
    s = db.get(LessonSession, lesson_id)
    if not s or s.student_id != student.id:
        raise HTTPException(404, "Урок не найден")
    return s


def _public(s: LessonSession, note=None) -> dict:
    return {"id": s.id, "topic_id": s.topic_id, "mode": s.mode, "plan": s.plan,
            "messages": s.messages, "note": note, "scene": scene_for_plan(s.plan)}

@router.get("/ai/status")
def ai_status(student: Student = Depends(current_student)):
    p = provider.get_provider()
    return {"mode": "ai" if p else "demo", "provider": p.name if p else None,
            "model": p.model if p else None}


@router.post("/lessons", status_code=201)
def start_lesson(data: LessonStart, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    topic = owned_topic(db, student, data.topic_id)
    try:
        ctx = build_context(db, student, topic)
    except NoSubtopicsError:
        raise HTTPException(422, "В этой теме нет подтем для урока")
    plan, mode, note = build_plan(ctx)
    s = LessonSession(student_id=student.id, topic_id=topic.id, plan=plan, messages=[], mode=mode)
    db.add(s)
    db.commit()
    db.refresh(s)
    return _public(s, note)


@router.get("/lessons/{lesson_id}")
def get_lesson(lesson_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    return _public(_owned(db, student, lesson_id))


@router.post("/lessons/{lesson_id}/messages")
def send_message(lesson_id: int, data: MessageIn, student: Student = Depends(current_student),
                 db: Session = Depends(get_db)):
    s = _owned(db, student, lesson_id)
    if len(s.messages) >= MAX_MESSAGES:
        raise HTTPException(409, "Слишком длинный диалог, начните новый урок")
    ctx = build_context(db, student, db.get(Topic, s.topic_id))
    text, mode = tutor.reply(ctx, s.plan, s.messages, data.text, data.intent)
    s.messages = list(s.messages) + [{"role": "user", "content": data.text, "intent": data.intent},
                                     {"role": "assistant", "content": text, "mode": mode}]
    db.commit()
    return {"reply": text, "mode": mode}
@router.get("/lessons/{lesson_id}/results")
def lesson_results(lesson_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    s = _owned(db, student, lesson_id)
    out = compute_outcome(db, student, s)
    record_strategies(db, student, s, out)
    return out