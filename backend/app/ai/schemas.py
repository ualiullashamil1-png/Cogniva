"""Схемы (формы) ответов ИИ. Всё, что вернул ИИ, обязано пройти эту проверку."""
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

Approach = Literal["mathematical", "visual", "step_by_step", "analogy",
                   "interactive", "comparative", "practical"]
SceneHint = Literal["projectile_motion", "uniform_acceleration", "linear_motion"]


class LessonStep(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    content: str = Field(min_length=1, max_length=1500)
    approach: Approach


class Checkpoint(BaseModel):
    question: str = Field(min_length=1, max_length=400)
    hint: str = Field(default="", max_length=400)


class LessonPlan(BaseModel):
    focus_subtopics: list[str] = Field(min_length=1, max_length=3)   # ключи подтем
    approaches: list[Approach] = Field(min_length=1, max_length=3)
    rationale: str = Field(max_length=600)
    steps: list[LessonStep] = Field(min_length=2, max_length=6)
    checkpoints: list[Checkpoint] = Field(min_length=1, max_length=3)
    scene_hint: Optional[SceneHint] = None
    # Описание сцены от ИИ. Здесь любая форма; настоящую проверку делает scene_planner.sanitize_spec.
    scene_spec: Optional[Any] = None