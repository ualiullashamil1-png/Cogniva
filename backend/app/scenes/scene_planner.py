"""Выбор сцены для урока: заготовки для демо-режима, очистка сцены от ИИ и инструкция для ИИ.
ИИ предлагает scene_spec, но решает сервер: всё проходит через validate_scene (Фаза 7)."""
import copy
import json
from typing import Optional

from pydantic import ValidationError

from app.scenes.registry import TEMPLATES
from app.scenes.scene_schema import SceneSpec
from app.scenes.scene_service import build_scene, catalog, default_scene
from app.scenes.scene_validator import SceneError

MAX_SPEC_JSON = 4000


def _spec(template: str, asset: str, components: list, params: dict, goal: Optional[str]) -> dict:
    return {"template_id": template, "educational_goal": goal,
            "entities": [{"role": "moving_object", "asset_id": asset}],
            "components": components, "parameters": params, "interactions": []}


# Ключ = подтема (focus). Чтобы добавить сцену для новой подтемы, допишите строку сюда.
DEMO_SCENES = {
    "vectors": _spec("projectile_motion", "ball",
                     ["coordinate_axes", "velocity_vector", "velocity_components", "trajectory",
                      "angle_indicator", "labels"],
                     {"v0": 20, "angle_deg": 45, "time": 1.5}, "velocity_vector_components"),
    "projectile_motion": _spec("projectile_motion", "ball",
                               ["coordinate_axes", "velocity_vector", "velocity_components",
                                "acceleration_vector", "trajectory", "angle_indicator", "measurement", "labels"],
                               {"v0": 20, "angle_deg": 45, "time": 1.5}, "projectile_trajectory"),
    "acceleration": _spec("uniform_acceleration", "minecart",
                          ["coordinate_axes", "velocity_vector", "acceleration_vector", "trajectory",
                           "labels", "graph_vt"],
                          {"v0": 5, "a": 2, "time": 2}, "acceleration_changes_velocity"),
    "motion_graphs": _spec("uniform_acceleration", "sphere",
                           ["coordinate_axes", "velocity_vector", "trajectory", "labels", "graph_xt", "graph_vt"],
                           {"v0": 2, "a": 1.5, "time": 3}, "read_motion_graphs"),
    "velocity": _spec("linear_motion", "car",
                      ["coordinate_axes", "velocity_vector", "trajectory", "labels", "measurement", "graph_xt"],
                      {"v": 8, "time": 3}, "constant_velocity"),
}


def demo_scene_spec(focus_key: str, hint: Optional[str] = None) -> dict:
    if focus_key in DEMO_SCENES:
        return copy.deepcopy(DEMO_SCENES[focus_key])
    tid = hint if hint in TEMPLATES else "projectile_motion"
    tpl = TEMPLATES[tid]
    return _spec(tid, tpl.default_object, list(tpl.components), {}, None)


def sanitize_spec(raw) -> Optional[dict]:
    """Описание сцены от ИИ -> безопасный dict или None. Лишние поля вырезаются."""
    if not isinstance(raw, dict):
        return None
    try:
        spec = SceneSpec.model_validate(raw).model_dump()
        build_scene(spec)                      # пробная сборка: неверные числа и шаблоны отсеются здесь
    except (ValidationError, SceneError):
        return None
    return spec if len(json.dumps(spec, ensure_ascii=False)) <= MAX_SPEC_JSON else None


def scene_for_plan(plan: dict) -> dict:
    """Готовая сцена для урока. Старые уроки без scene_spec получают сцену по scene_hint."""
    try:
        return build_scene((plan or {}).get("scene_spec") or {})
    except SceneError:
        return default_scene((plan or {}).get("scene_hint"))


def scene_instructions() -> str:
    """Дополнение к системной инструкции планировщика: что ИИ может выбирать для сцены."""
    c = catalog()
    tpls = []
    for t in c["templates"]:
        params = ", ".join(f'{p["key"]} ({p["min"]}..{p["max"]})' for p in t["parameters"])
        tpls.append(f'- {t["id"]} ({t["title"]}). Компоненты: {", ".join(t["components"])}. Параметры: {params}')
    objs = []
    for o in c["objects"]:
        only = "" if len(o["templates"]) == len(c["templates"]) else f' (только в: {", ".join(o["templates"])})'
        objs.append(o["id"] + only)
    return (
        "\n\nДополнительно добавь в тот же JSON поле scene_spec: 3D-сцена для этого урока. Формат:\n"
        '{"template_id": "...", "educational_goal": "коротко", '
        '"entities": [{"role": "moving_object", "asset_id": "..."}], '
        '"components": ["..."], "parameters": {"ключ": число}}\n'
        "Правила: используй ТОЛЬКО id из списков ниже; числа результата (дальность, время) не придумывай, "
        "их считает приложение; параметры необязательны. Подбирай сцену под слабую подтему и способ "
        "объяснения. Для ускорения через вектор скорости включай velocity_vector и acceleration_vector. "
        "Для вектора скорости в броске включай velocity_components.\n"
        "Шаблоны:\n" + "\n".join(tpls) + "\nОбъекты: " + ", ".join(objs)
    )