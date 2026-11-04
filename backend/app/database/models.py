"""Таблицы базы данных. Иерархия: Subject -> Topic -> Subtopic.
Школьная оценка (GradeRecord) и освоение понятия (SubtopicProgress.mastery)
хранятся ОТДЕЛЬНО."""
from datetime import datetime
from sqlalchemy import (JSON, DateTime, Float, ForeignKey, Integer, String, Text,
                        Boolean, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


def now():
    return datetime.utcnow()


class Student(Base):
    __tablename__ = "students"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100))
    grade_level: Mapped[int] = mapped_column(Integer, default=9)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    topics: Mapped[list["Topic"]] = relationship(cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    subtopics: Mapped[list["Subtopic"]] = relationship(cascade="all, delete-orphan")


class Subtopic(Base):
    __tablename__ = "subtopics"
    id: Mapped[int] = mapped_column(primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    key: Mapped[str] = mapped_column(String(60), default="")  # напр. "projectile_motion"


class GradeRecord(Base):
    """Школьная оценка. НЕ равна освоению понятия."""
    __tablename__ = "grade_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    subtopic_id: Mapped[int | None] = mapped_column(ForeignKey("subtopics.id"), nullable=True)
    score: Mapped[float] = mapped_column(Float)
    max_score: Mapped[float] = mapped_column(Float, default=10) 
    kind: Mapped[str] = mapped_column(String(10), default="other", server_default="other")
    title: Mapped[str] = mapped_column(String(200), default="")
    date: Mapped[datetime] = mapped_column(DateTime, default=now)


class SubtopicProgress(Base):
    """Оценка освоения (0..1), вычисляется системой по доказательствам."""
    __tablename__ = "subtopic_progress"
    __table_args__ = (UniqueConstraint("student_id", "subtopic_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    subtopic_id: Mapped[int] = mapped_column(ForeignKey("subtopics.id"))
    mastery: Mapped[float] = mapped_column(Float, default=0.5)
    tasks_done: Mapped[int] = mapped_column(Integer, default=0)
    correct: Mapped[int] = mapped_column(Integer, default=0)
    incorrect: Mapped[int] = mapped_column(Integer, default=0)
    difficulties: Mapped[list] = mapped_column(JSON, default=list)
    recommendation: Mapped[str] = mapped_column(Text, default="")
    last_assessed: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class DiagnosticTest(Base):
    __tablename__ = "diagnostic_tests"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"))
    kind: Mapped[str] = mapped_column(String(20), default="diagnostic")  # diagnostic | post_lesson
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    result: Mapped[dict] = mapped_column(JSON, default=dict)
    questions: Mapped[list["TestQuestion"]] = relationship(cascade="all, delete-orphan")


class TestQuestion(Base):
    __tablename__ = "test_questions"
    id: Mapped[int] = mapped_column(primary_key=True)
    test_id: Mapped[int] = mapped_column(ForeignKey("diagnostic_tests.id"), index=True)
    bank_id: Mapped[str] = mapped_column(String(60))
    subtopic_key: Mapped[str] = mapped_column(String(60))
    qtype: Mapped[str] = mapped_column(String(20))
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    payload: Mapped[dict] = mapped_column(JSON)
    order: Mapped[int] = mapped_column(Integer, default=0)


class StudentAnswer(Base):
    __tablename__ = "student_answers"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("test_questions.id"), index=True)
    answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    misconception: Mapped[str | None] = mapped_column(String(100), nullable=True)
    evaluation: Mapped[dict] = mapped_column(JSON, default=dict)


class LearningSession(Base):
    __tablename__ = "learning_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"))
    strategy: Mapped[dict] = mapped_column(JSON, default=dict)
    scene_plan: Mapped[dict] = mapped_column(JSON, default=dict)
    messages: Mapped[list] = mapped_column(JSON, default=list)
    pre_test_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    post_test_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class LearningStrategy(Base):
    """Результаты после объяснений разными подходами (D5)."""
    __tablename__ = "learning_strategies"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    subtopic_key: Mapped[str] = mapped_column(String(60))
    approach: Mapped[str] = mapped_column(String(40))
    score_before: Mapped[float] = mapped_column(Float)
    score_after: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)


class SceneInteraction(Base):
    __tablename__ = "scene_interactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), index=True)
    action: Mapped[str] = mapped_column(String(60))
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
