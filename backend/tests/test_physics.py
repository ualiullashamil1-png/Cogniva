import math

import pytest

from app.diagnostics.question_bank import get_question
from app.physics import kinematics as kin
from app.physics import projectile_motion as pm
from app.physics.common import PhysicsError
from app.physics.projectile_motion import ProjectileParams


def test_uniform_acceleration_basic():
    s = kin.uniform_acceleration(0, 5, 2, 4)
    assert s.v == pytest.approx(13) and s.x == pytest.approx(36) and s.a == 2 and s.t == 4
    assert kin.uniform_acceleration(3, 5, 2, 0).x == 3          # в момент t = 0 тело в начальной точке


def test_linear_motion():
    s = kin.linear_motion(10, 3, 4)
    assert s.x == pytest.approx(22) and s.v == 3 and s.a == 0


def test_turning_point():
    assert kin.time_to_zero_velocity(10, -5) == pytest.approx(2)
    assert kin.time_to_zero_velocity(10, 5) is None and kin.time_to_zero_velocity(0, 2) is None
    s = kin.uniform_acceleration(0, 10, -5, 4)                   # проехало вперёд и вернулось
    assert s.v == pytest.approx(-10) and s.x == pytest.approx(0)


def test_trajectory_samples():
    pts = kin.trajectory(0, 5, 2, 4, steps=4)
    assert [p.t for p in pts] == [0, 1, 2, 3, 4]
    assert [p.x for p in pts] == pytest.approx([0, 6, 14, 24, 36])


def test_projectile_vertical():
    p = ProjectileParams(20, 90, 0, 10)
    assert pm.flight_time(p) == pytest.approx(4)
    assert pm.time_to_apex(p) == pytest.approx(2)
    assert pm.max_height(p) == pytest.approx(20)
    assert pm.horizontal_range(p) == pytest.approx(0, abs=1e-9)


def test_projectile_30_degrees():
    p = ProjectileParams(30, 30, 0, 10)
    assert pm.flight_time(p) == pytest.approx(3)
    assert pm.max_height(p) == pytest.approx(11.25)
    assert pm.horizontal_range(p) == pytest.approx(30 * math.cos(math.radians(30)) * 3)
    top = pm.state_at(p, pm.time_to_apex(p))                     # в верхней точке vy = 0, но скорость не нулевая
    assert top.vy == pytest.approx(0, abs=1e-9) and top.speed == pytest.approx(top.vx) and top.speed > 0


def test_projectile_horizontal_from_height():
    p = ProjectileParams(10, 0, 45, 10)
    assert pm.flight_time(p) == pytest.approx(3)
    assert pm.horizontal_range(p) == pytest.approx(30)
    assert pm.max_height(p) == pytest.approx(45)


def test_energy_conservation():
    p = ProjectileParams(25, 40, 5, 10)
    e0 = 0.5 * p.v0 ** 2 + p.g * p.h0
    for t in (0, 0.5, 1, 2, pm.flight_time(p)):
        s = pm.state_at(p, t)
        assert 0.5 * s.speed ** 2 + p.g * s.y == pytest.approx(e0)


def test_trajectory_ends_on_ground():
    p = ProjectileParams(30, 45, 2)
    pts = pm.trajectory(p, steps=50)
    assert len(pts) == 51
    assert pts[0].x == 0 and pts[0].y == pytest.approx(2) and pts[-1].y == 0 and pts[-1].landed
    assert all(pt.y >= 0 for pt in pts)
    late = pm.state_at(p, 500)                                   # время больше времени полёта: остаётся на земле
    assert late.landed and late.y == 0 and late.t == pytest.approx(pm.flight_time(p))


def test_matches_question_bank():
    """Числа в банке вопросов совпадают с физическим модулем."""
    assert pm.flight_time(ProjectileParams(30, 30, 0, 10)) == pytest.approx(get_question("proj_4").answer, abs=0.05)
    assert pm.time_to_apex(ProjectileParams(20, 90, 0, 10)) == pytest.approx(get_question("proj_3").answer)
    q = get_question("acc_1")
    assert kin.uniform_acceleration(0, 5, q.answer, 4).v == pytest.approx(15)


def test_invalid_input():
    assert issubclass(PhysicsError, ValueError)
    for bad in (-1, 101, float("nan"), float("inf"), "5", True, None):
        with pytest.raises(PhysicsError):
            ProjectileParams(bad, 30)
    for args in ((10, 91), (10, -1), (10, 30, -1), (10, 30, 0, 0)):   # угол, высота, g вне диапазона
        with pytest.raises(PhysicsError):
            ProjectileParams(*args)
    with pytest.raises(PhysicsError):
        pm.state_at(ProjectileParams(10, 30), -1)
    with pytest.raises(PhysicsError):
        kin.uniform_acceleration(0, 0, 0, 61)
    with pytest.raises(PhysicsError):
        kin.uniform_acceleration(0, 0, 51, 1)
    with pytest.raises(PhysicsError):
        pm.trajectory(ProjectileParams(10, 30), steps=1)


def test_summary():
    s = pm.summary(ProjectileParams(30, 30, 0, 10))
    assert set(s) == {"vx", "vy0", "flight_time", "time_to_apex", "max_height", "range", "impact_speed"}
    assert s["impact_speed"] == pytest.approx(30)                # с земли на землю скорость та же
    assert s["flight_time"] == pytest.approx(2 * s["time_to_apex"])