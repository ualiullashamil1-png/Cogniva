"""Создаёт frontend/src/scene-lab/fixtures.json: контрольные числа из Python-физики.
Тест на TypeScript сверяет с ними свою копию формул."""
import json
from dataclasses import asdict
from pathlib import Path

from app.physics import kinematics as kin
from app.physics import projectile_motion as pm
from app.physics.projectile_motion import ProjectileParams

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "scene-lab" / "fixtures.json"

PROJECTILE = [(20, 45, 0, 9.81), (30, 30, 0, 10), (10, 0, 45, 10), (60, 90, 0, 9.81),
              (25, 40, 5, 9.81), (0, 0, 10, 9.81), (15, 89, 2, 3.7)]
KINEMATICS = [(0, 5, 2, 4), (3, -2, 1.5, 6), (10, 10, -5, 4), (0, 0, 0, 3), (-5, 12, -3, 10)]

data = {"projectile": [], "kinematics": []}
for v0, ang, h0, g in PROJECTILE:
    p = ProjectileParams(v0, ang, h0, g)
    total = pm.flight_time(p)
    states = []
    for k in (0, 0.25, 0.5, 0.75, 1, 1.5):
        t = total * k
        states.append({"t_in": t, **asdict(pm.state_at(p, t))})
    data["projectile"].append({"params": {"v0": v0, "angle_deg": ang, "h0": h0, "g": g},
                               "summary": pm.summary(p), "states": states})
for x0, v0, a, T in KINEMATICS:
    for t in (0, T / 2, T):
        data["kinematics"].append({"params": {"x0": x0, "v0": v0, "a": a}, "t": t,
                                   "expected": asdict(kin.uniform_acceleration(x0, v0, a, t))})

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
print("Записано:", OUT)