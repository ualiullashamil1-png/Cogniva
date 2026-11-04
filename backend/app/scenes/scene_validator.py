"""Проверка описания сцены ПЕРЕД построением. Неизвестное или неподходящее отбрасывается
с пояснением для ученика (notices); неверные числа отклоняются ошибкой."""
from dataclasses import dataclass, field
from typing import Optional

from pydantic import ValidationError

from app.physics.common import PhysicsError, check
from app.scenes.registry import (COMPONENTS, DEFAULT_COMPONENTS, EXTRA_INTERACTIONS, OBJECTS, TEMPLATES,
                                 ObjectDef, TemplateDef)
from app.scenes.scene_schema import SceneSpec


class SceneError(ValueError):
    """Описание сцены невозможно использовать."""


@dataclass
class ValidatedScene:
    template: TemplateDef
    obj: ObjectDef
    components: list
    params: dict
    interactions: list
    goal: Optional[str]
    notices: list = field(default_factory=list)


def _s(value, limit: int = 40) -> str:
    return str(value)[:limit]


def _resolve_object(tpl: TemplateDef, spec: SceneSpec, notices: list) -> ObjectDef:
    default = OBJECTS[tpl.default_object]
    moving = [e for e in spec.entities if e.role == "moving_object"]
    for e in spec.entities:
        if e.role not in tpl.roles:
            notices.append(f"Роль «{_s(e.role)}» не поддерживается этой сценой и пропущена.")
    if not moving:
        return default
    asked = moving[0]
    obj = OBJECTS.get(asked.asset_id)
    if obj is None:
        notices.append(f"Объекта «{_s(asked.asset_id)}» нет в библиотеке. Показан объект «{default.name}».")
        return default
    if tpl.id not in obj.templates:
        sub = OBJECTS[obj.fallback]
        notices.append(f"Объект «{obj.name}» не подходит для сцены «{tpl.title}»: {obj.why_not}. "
                       f"Показан объект «{sub.name}»; формулы движения не изменились.")
        return sub
    return obj


def _resolve_params(tpl: TemplateDef, raw: dict, notices: list) -> dict:
    known = {p.key for p in tpl.params}
    for key in raw:
        if key not in known:
            notices.append(f"Параметр «{_s(key)}» не используется в этой сцене и пропущен.")
    params = {}
    for p in tpl.params:
        value = raw.get(p.key, p.default)
        try:
            params[p.key] = check(p.key, value, p.min, p.max)
        except PhysicsError as e:
            raise SceneError(str(e)) from e
    return params


def validate_scene(raw) -> ValidatedScene:
    if not isinstance(raw, dict):
        raise SceneError("Описание сцены должно быть объектом")
    try:
        spec = SceneSpec.model_validate(raw)
    except ValidationError as e:
        raise SceneError("Неверная структура описания сцены") from e
    tpl = TEMPLATES.get(spec.template_id)
    if tpl is None:
        raise SceneError(f"Неизвестный шаблон сцены: {_s(spec.template_id)}")

    notices: list = []
    if spec.physics_model and spec.physics_model != tpl.physics_model:
        notices.append("Физическая модель определяется шаблоном сцены и не может быть изменена.")
    obj = _resolve_object(tpl, spec, notices)
    params = _resolve_params(tpl, spec.parameters, notices)

    components: list = []
    for c in spec.components:
        if c in components:
            continue
        if c not in COMPONENTS:
            notices.append(f"Компонента «{_s(c)}» нет в библиотеке, он пропущен.")
        elif c not in tpl.components:
            notices.append(f"Компонент «{COMPONENTS[c].label}» не подходит для сцены «{tpl.title}» и пропущен.")
        else:
            components.append(c)
    if not spec.components:
        components = list(DEFAULT_COMPONENTS)

    allowed = [f"change_{p.key}" for p in tpl.params] + list(EXTRA_INTERACTIONS)
    interactions = [i for i in dict.fromkeys(spec.interactions) if i in allowed]
    for i in spec.interactions:
        if i not in allowed:
            notices.append(f"Взаимодействие «{_s(i)}» не поддерживается и пропущено.")
    if not interactions:
        interactions = allowed

    return ValidatedScene(tpl, obj, components, params, interactions, spec.educational_goal, notices)