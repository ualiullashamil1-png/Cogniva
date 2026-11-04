"""Форма описания сцены, которое присылает ИИ. Это только данные: никакого кода."""
from typing import Any, Optional

from pydantic import BaseModel, Field


class EntitySpec(BaseModel):
    role: str = Field(max_length=40)
    asset_id: str = Field(max_length=60)
    display_name: Optional[str] = Field(default=None, max_length=80)   # игнорируется: имя берётся из реестра


class SceneSpec(BaseModel):
    template_id: str = Field(min_length=1, max_length=60)
    physics_model: Optional[str] = Field(default=None, max_length=60)
    educational_goal: Optional[str] = Field(default=None, max_length=200)
    entities: list[EntitySpec] = Field(default_factory=list, max_length=10)
    components: list[str] = Field(default_factory=list, max_length=20)
    parameters: dict[str, Any] = Field(default_factory=dict)
    interactions: list[str] = Field(default_factory=list, max_length=20)