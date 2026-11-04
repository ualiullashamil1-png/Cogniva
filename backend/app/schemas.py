"""Что приходит в API и что уходит из него (проверка данных через Pydantic)."""
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Literal


class _Base(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)


class RegisterIn(_Base):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=72)
    display_name: str = Field(min_length=1, max_length=100)
    grade_level: int = Field(default=9, ge=1, le=12)


class LoginIn(_Base):
    username: str
    password: str


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    display_name: str
    grade_level: int


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: StudentOut


class NameIn(_Base):
    name: str = Field(min_length=1, max_length=100)


class SubtopicIn(_Base):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=2000)
    key: str | None = Field(default=None, pattern=r"^[a-z0-9_]{1,60}$")


class GradeIn(_Base):
    subject_id: int
    subtopic_id: int | None = None
    score: float = Field(ge=0)
    max_score: float = Field(default=10, gt=0)
    title: str = Field(default="", max_length=200)
    kind: Literal["sor", "soch", "other"] = "other"

    @model_validator(mode="after")
    def _score_not_above_max(self):
        if self.score > self.max_score:
            raise ValueError("Оценка не может быть больше максимальной")
        return self


class GradePatch(_Base):
    score: float | None = Field(default=None, ge=0)
    max_score: float | None = Field(default=None, gt=0)
    title: str | None = Field(default=None, max_length=200)
    kind: Literal["sor", "soch", "other"] | None = None
