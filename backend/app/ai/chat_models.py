"""Таблицы чата с ИИ: разговоры, сообщения и память об ученике."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


def _now():
    return datetime.utcnow()


class ChatConversation(Base):
    __tablename__ = "chat_conversations"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    title: Mapped[str] = mapped_column(String(120), default="Новый разговор")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("chat_conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(12))          # user | assistant
    content: Mapped[str] = mapped_column(Text)
    mode: Mapped[str] = mapped_column(String(10), default="")   # ai | demo (для ответов ИИ)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ChatMemory(Base):
    """Факт об ученике, который он сам подтвердил («любит Симпсонов»)."""
    __tablename__ = "chat_memories"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    text: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)