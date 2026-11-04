"""Чат с ИИ: разговоры хранятся на сервере, ИИ видит оценки, освоение и память об ученике.
ИИ ничего не меняет в базе сам: он только отвечает текстом и может ПРЕДЛОЖИТЬ запомнить факт,
а сохраняет его ученик, нажав кнопку."""
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.ai import provider
from app.ai.chat_models import ChatConversation, ChatMemory, ChatMessage
from app.database.connection import get_db
from app.database.models import GradeRecord, Student, Subject, Subtopic, SubtopicProgress, Topic
from app.deps import current_student

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_MESSAGES = 200       # сообщений в одном разговоре
MAX_MEMORIES = 100       # фактов в памяти
HISTORY_FOR_AI = 20      # сколько последних сообщений уходит в ИИ
DEFAULT_TITLE = "Новый разговор"
MEMORY_RE = re.compile(r"\[\[\s*ЗАПОМНИТЬ\s*:\s*(.+?)\s*\]\]", re.S)

SYSTEM = """Ты — ИИ-репетитор платформы Cogniva для школьника. Отвечай по-русски, дружелюбно и коротко (обычно до 8 предложений), простым языком.
Правила:
- Опирайся только на данные ниже и на то, что ученик сам написал. Если данных не хватает, так и скажи и предложи пройти диагностику в разделе «Учёба». Ничего не выдумывай: ни оценки, ни проценты, ни достижения.
- Школьная оценка и освоение — разные вещи. Освоение считает система по тестам. Слово «освоено» используй только если освоение не меньше 85% и заданий не меньше 8.
- Оценки и освоение ты менять не можешь.
- Не проси пароли, ключи, адреса, телефоны и другие личные данные.
- Пиши обычным текстом без Markdown-разметки (без звёздочек и решёток); списки — строками с дефисом.
- Когда объясняешь тему, дай пример и в конце одну короткую проверочную задачу или вопрос.

Память об ученике (факты, которые он сам подтвердил). Используй их, чтобы примеры и задачи были ближе к его интересам, но только уместно и без навязчивости, и ничего не добавляй от себя:
{memory}

Запоминание: если ученик в этом сообщении сам рассказал устойчивый факт о себе (интерес, цель, как ему удобнее учиться, что ему трудно), добавь в самый конец ответа отдельную строку вида [[ЗАПОМНИТЬ: короткий факт]]. Не больше двух таких строк, без догадок. Не предлагай запоминать пароли, адреса, телефоны, здоровье, семейные дела и другие личные данные. Не повторяй то, что уже есть в памяти. Сохранять или нет, решает ученик.

Данные ученика (класс: {grade}):
{facts}"""


class MessageIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=1000)


class MemoryIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=200)


def _owned(db: Session, student: Student, conv_id: int) -> ChatConversation:
    c = db.get(ChatConversation, conv_id)
    if not c or c.student_id != student.id:
        raise HTTPException(404, "Разговор не найден")
    return c


def _conv_out(c: ChatConversation) -> dict:
    return {"id": c.id, "title": c.title, "updated_at": c.updated_at.isoformat()}


def _msg_out(m: ChatMessage) -> dict:
    return {"id": m.id, "role": m.role, "content": m.content, "mode": m.mode,
            "created_at": m.created_at.isoformat()}


def _memory_out(m: ChatMemory) -> dict:
    return {"id": m.id, "text": m.text, "created_at": m.created_at.isoformat()}


def _memories(db: Session, student: Student) -> list[ChatMemory]:
    return list(db.scalars(select(ChatMemory).where(ChatMemory.student_id == student.id)
                           .order_by(ChatMemory.id)).all())


def _pct(items) -> int | None:
    """Сумма набранных / сумма максимумов (как на платформе)."""
    total = sum(g.max_score for g in items)
    if total <= 0:
        return None
    return round(sum(g.score for g in items) / total * 100)


def _student_facts(db: Session, student: Student) -> tuple[str, list[str]]:
    """Короткая сводка для ИИ: оценки по предметам и подтемам, освоение по проверенным подтемам.
    Возвращает (текст, список слабых подтем для демо-режима)."""
    lines: list[str] = []
    weak: list[str] = []

    subjects = db.scalars(select(Subject).where(Subject.student_id == student.id)).all()
    grades = db.scalars(select(GradeRecord).where(GradeRecord.student_id == student.id)).all()
    grade_lines = []
    for s in subjects:
        counted = [g for g in grades if g.subject_id == s.id and g.kind != "other"]
        if not counted:
            continue
        parts = []
        for label, kind in (("СОР", "sor"), ("СОЧ", "soch")):
            p = _pct([g for g in counted if g.kind == kind])
            if p is not None:
                parts.append(f"{label} {p}%")
        grade_lines.append(f"- {s.name}: общий {_pct(counted)}% ({', '.join(parts)})")
    lines.append("Школьные оценки (в процентах):")
    lines += grade_lines or ["- оценок пока нет"]

    subj_name = {s.id: s.name for s in subjects}
    sub_ids = {g.subtopic_id for g in grades if g.subtopic_id}
    sub_name: dict[int, str] = {}
    if sub_ids:
        sub_name = {st.id: st.name for st in db.scalars(select(Subtopic).where(Subtopic.id.in_(sub_ids)))}
    by_sub = sorted([g for g in grades if g.subtopic_id in sub_name], key=lambda g: g.date, reverse=True)[:30]
    if by_sub:
        lines.append("Оценки по подтемам (последние):")
        for g in by_sub:
            kind = {"sor": "СОР", "soch": "СОЧ"}.get(g.kind, "Другое")
            pct = round(g.score / g.max_score * 100) if g.max_score else 0
            lines.append(f"- {subj_name.get(g.subject_id, 'Предмет')} / {sub_name[g.subtopic_id]}: "
                         f"{kind} {g.score:g}/{g.max_score:g} ({pct}%)")

    rows = db.execute(
        select(Subject.name, Subtopic.name, SubtopicProgress)
        .select_from(SubtopicProgress)
        .join(Subtopic, Subtopic.id == SubtopicProgress.subtopic_id)
        .join(Topic, Topic.id == Subtopic.topic_id)
        .join(Subject, Subject.id == Topic.subject_id)
        .where(SubtopicProgress.student_id == student.id, SubtopicProgress.tasks_done > 0)
    ).all()
    rows = sorted(rows, key=lambda r: r[2].mastery)[:30]
    lines.append("Освоение подтем по результатам тестов:")
    if not rows:
        lines.append("- тесты ещё не проходились")
    for subj, sub, p in rows:
        mis = list(p.difficulties or [])[:2]
        extra = f"; замечено: {', '.join(mis)}" if mis else ""
        lines.append(f"- {subj} / {sub}: освоение {round(p.mastery * 100)}%, заданий {p.tasks_done}{extra}")
        if p.mastery < 0.6 and len(weak) < 3:
            weak.append(f"{sub} ({subj}) — {round(p.mastery * 100)}%")
    return "\n".join(lines), weak


def _split_proposals(text: str, known: set[str]) -> tuple[str, list[str]]:
    """Достаёт из ответа ИИ предложения «запомнить» и убирает служебные строки из текста."""
    found: list[str] = []
    for raw in MEMORY_RE.findall(text):
        t = " ".join(raw.split())[:200]
        low = t.lower()
        if t and low not in known and low not in [f.lower() for f in found]:
            found.append(t)
    clean = MEMORY_RE.sub("", text).strip()
    return clean or "Хорошо, понял.", found[:2]


def _demo_reply(weak: list[str]) -> str:
    text = "ДЕМО-РЕЖИМ: ключ ИИ не подключён, поэтому настоящий диалог сейчас недоступен."
    if weak:
        return text + "\nПо вашим тестам стоит повторить:\n" + "\n".join(f"- {w}" for w in weak)
    return text + "\nПроверенных подтем с низким освоением пока нет. Пройдите диагностику в разделе «Учёба»."


# ---------- Память ----------
@router.get("/memory")
def list_memory(student: Student = Depends(current_student), db: Session = Depends(get_db)):
    return [_memory_out(m) for m in _memories(db, student)]


@router.post("/memory", status_code=201)
def add_memory(data: MemoryIn, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    items = _memories(db, student)
    if len(items) >= MAX_MEMORIES:
        raise HTTPException(409, "Память заполнена, удалите лишнее")
    if any(m.text.lower() == data.text.lower() for m in items):
        raise HTTPException(409, "Это уже записано")
    m = ChatMemory(student_id=student.id, text=data.text)
    db.add(m)
    db.commit()
    db.refresh(m)
    return _memory_out(m)


@router.delete("/memory/{memory_id}", status_code=204)
def delete_memory(memory_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    m = db.get(ChatMemory, memory_id)
    if not m or m.student_id != student.id:
        raise HTTPException(404, "Запись не найдена")
    db.delete(m)
    db.commit()
    return Response(status_code=204)


# ---------- Разговоры ----------
@router.get("/conversations")
def list_conversations(student: Student = Depends(current_student), db: Session = Depends(get_db)):
    rows = db.scalars(select(ChatConversation).where(ChatConversation.student_id == student.id)
                      .order_by(ChatConversation.updated_at.desc(), ChatConversation.id.desc())).all()
    return [_conv_out(c) for c in rows]


@router.post("/conversations", status_code=201)
def create_conversation(student: Student = Depends(current_student), db: Session = Depends(get_db)):
    c = ChatConversation(student_id=student.id, title=DEFAULT_TITLE)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _conv_out(c)


@router.get("/conversations/{conv_id}")
def get_conversation(conv_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    c = _owned(db, student, conv_id)
    msgs = db.scalars(select(ChatMessage).where(ChatMessage.conversation_id == c.id)
                      .order_by(ChatMessage.id)).all()
    return {**_conv_out(c), "messages": [_msg_out(m) for m in msgs]}


@router.delete("/conversations/{conv_id}", status_code=204)
def delete_conversation(conv_id: int, student: Student = Depends(current_student), db: Session = Depends(get_db)):
    c = _owned(db, student, conv_id)
    db.execute(delete(ChatMessage).where(ChatMessage.conversation_id == c.id))
    db.delete(c)
    db.commit()
    return Response(status_code=204)


@router.post("/conversations/{conv_id}/messages")
def send_message(conv_id: int, data: MessageIn, student: Student = Depends(current_student),
                 db: Session = Depends(get_db)):
    c = _owned(db, student, conv_id)
    history = db.scalars(select(ChatMessage).where(ChatMessage.conversation_id == c.id)
                         .order_by(ChatMessage.id)).all()
    if len(history) >= MAX_MESSAGES:
        raise HTTPException(409, "Слишком длинный разговор, начните новый")

    facts, weak = _student_facts(db, student)
    memories = _memories(db, student)
    memory_text = "\n".join(f"- {m.text}" for m in memories) or "- пока ничего"
    proposals: list[str] = []

    p = provider.get_provider()
    if p is None:
        reply, mode = _demo_reply(weak), "demo"
    else:
        msgs = [{"role": m.role, "content": m.content} for m in history[-HISTORY_FOR_AI:]]
        while msgs and msgs[0]["role"] != "user":      # Gemini ждёт, что диалог начинается с ученика
            msgs.pop(0)
        msgs.append({"role": "user", "content": data.text})
        system = SYSTEM.format(grade=student.grade_level, facts=facts, memory=memory_text)
        try:
            raw = p.complete(system, msgs, max_tokens=800).strip()
        except provider.AIUnavailable:
            raise HTTPException(503, "ИИ сейчас недоступен. Проверьте ключ и интернет, затем повторите.")
        reply, proposals = _split_proposals(raw, {m.text.lower() for m in memories})
        mode = "ai"

    db.add_all([ChatMessage(conversation_id=c.id, role="user", content=data.text),
                ChatMessage(conversation_id=c.id, role="assistant", content=reply, mode=mode)])
    if c.title == DEFAULT_TITLE:
        c.title = data.text[:60]
    c.updated_at = datetime.utcnow()
    db.commit()
    return {"reply": reply, "mode": mode, "title": c.title, "proposals": proposals}