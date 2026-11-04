"""Построение сцены: проверка -> расчёт физикой -> готовое описание для 3D-рендерера.
Внешний вид объекта и математика разделены: смена объекта не меняет блок "physics"."""
from dataclasses import asdict
from typing import Optional

from app.physics import kinematics as kin
from app.physics import projectile_motion as pm
from app.physics.common import PhysicsError
from app.scenes.registry import COMPONENTS, OBJECTS, TEMPLATES
from app.scenes.scene_validator import SceneError, ValidatedScene, validate_scene

STEPS = 100


def _physics(v: ValidatedScene) -> dict:
    p, tid = v.params, v.template.id
    if tid == "projectile_motion":
        pp = pm.ProjectileParams(p["v0"], p["angle_deg"], p["h0"], p["g"])
        return {"summary": pm.summary(pp), "state": asdict(pm.state_at(pp, p["time"])),
                "trajectory": [asdict(s) for s in pm.trajectory(pp, STEPS)],
                "assumptions": list(pm.ASSUMPTIONS)}
    if tid == "uniform_acceleration":
        x0, v0, a, t = p["x0"], p["v0"], p["a"], p["time"]
    else:                                                   # linear_motion
        x0, v0, a, t = p["x0"], p["v"], 0.0, p["time"]
    return {"state": asdict(kin.uniform_acceleration(x0, v0, a, t)),
            "trajectory": [asdict(s) for s in kin.trajectory(x0, v0, a, t, STEPS)],
            "time_to_zero_velocity": kin.time_to_zero_velocity(v0, a)}


def build_scene(raw) -> dict:
    v = validate_scene(raw)
    try:
        physics = _physics(v)
    except PhysicsError as e:
        raise SceneError(str(e)) from e
    t = v.template
    return {
        "template_id": t.id, "title": t.title, "physics_model": t.physics_model,
        "educational_goal": v.goal,
        "object": {"id": v.obj.id, "name": v.obj.name, "category": v.obj.category, "scale": v.obj.scale},
        "components": v.components, "interactions": v.interactions,
        "parameters": v.params, "parameter_specs": [asdict(p) for p in t.params],
        "camera": t.camera, "restrictions": list(t.restrictions),
        "physics": physics, "notices": v.notices,
    }


def default_scene(hint: Optional[str] = None) -> dict:
    """Сцена по умолчанию. hint — scene_hint из плана урока (Фаза 6)."""
    tid = hint if hint in TEMPLATES else "projectile_motion"
    tpl = TEMPLATES[tid]
    return build_scene({"template_id": tid,
                        "entities": [{"role": "moving_object", "asset_id": tpl.default_object}],
                        "components": list(tpl.components)})


def catalog() -> dict:
    """Что умеет движок. Позже этот список пойдёт в инструкцию для ИИ."""
    return {
        "templates": [{"id": t.id, "title": t.title, "subject": t.subject, "physics_model": t.physics_model,
                       "roles": list(t.roles), "components": list(t.components),
                       "parameters": [asdict(p) for p in t.params], "restrictions": list(t.restrictions)}
                      for t in TEMPLATES.values()],
        "objects": [{"id": o.id, "name": o.name, "category": o.category, "templates": list(o.templates)}
                    for o in OBJECTS.values()],
        "components": [{"id": c.id, "label": c.label, "description": c.description}
                       for c in COMPONENTS.values()],
    }