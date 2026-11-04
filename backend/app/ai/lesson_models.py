"""Таблица истории уроков. Создаётся автоматически при запуске сервера."""
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String

from app.database.connection import Base


class LessonSession(Base):
    __tablename__ = "lesson_sessions"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, index=True, nullable=False)
    topic_id = Column(Integer, nullable=False)
    mode = Column(String(10), nullable=False, default="demo")
    plan = Column(JSON, nullable=False)
    messages = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)