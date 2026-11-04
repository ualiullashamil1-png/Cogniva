"""Бросок тела под углом к горизонту. Единицы СИ.

ДОПУЩЕНИЯ МОДЕЛИ (их нужно показывать ученику):
 - идеальное движение: сопротивления воздуха нет;
 - ускорение свободного падения g постоянно и направлено вниз;
 - бросок из точки (x = 0, y = h0), где h0 — начальная высота над землёй;
 - земля — горизонтальная плоскость y = 0, на ней движение заканчивается;
 - угол отсчитывается от горизонта вверх: 0° — горизонтальный бросок, 90° — вертикально вверх."""
import math
from dataclasses import dataclass

from app.physics.common import check

ASSUMPTIONS = (
    "Идеальное движение без сопротивления воздуха.",
    "Ускорение свободного падения постоянно и направлено вниз.",
    "Бросок из точки x = 0 на высоте h0; движение заканчивается при падении на землю (y = 0).",
)

SPEED = (0.0, 100.0)
ANGLE = (0.0, 90.0)
HEIGHT = (0.0, 500.0)
GRAVITY = (1.0, 30.0)
TIME = (0.0, 1000.0)
G_EARTH = 9.81


@dataclass(frozen=True)
class ProjectileParams:
    v0: float                 # начальная скорость, м/с
    angle_deg: float          # угол к горизонту, градусы
    h0: float = 0.0           # начальная высота, м
    g: float = G_EARTH        # ускорение свободного падения, м/с²

    def __post_init__(self):
        check("v0", self.v0, *SPEED)
        check("angle_deg", self.angle_deg, *ANGLE)
        check("h0", self.h0, *HEIGHT)
        check("g", self.g, *GRAVITY)


@dataclass(frozen=True)
class ProjectileState:
    t: float        # время, с (не больше времени полёта)
    x: float        # горизонтальная координата, м
    y: float        # высота над землёй, м
    vx: float       # горизонтальная составляющая скорости, м/с
    vy: float       # вертикальная составляющая скорости, м/с
    speed: float    # модуль скорости, м/с
    landed: bool    # тело уже упало


def components(p: ProjectileParams) -> tuple[float, float]:
    """Начальные составляющие скорости (vx, vy0)."""
    rad = math.radians(p.angle_deg)
    vx, vy = p.v0 * math.cos(rad), p.v0 * math.sin(rad)
    if abs(vx) < 1e-12:          # cos(90°) в компьютере не ровно 0
        vx = 0.0
    return vx, vy


def flight_time(p: ProjectileParams) -> float:
    """Время до падения: решение h0 + vy0·t − g·t²/2 = 0."""
    _, vy = components(p)
    return max(0.0, (vy + math.sqrt(vy * vy + 2 * p.g * p.h0)) / p.g)


def time_to_apex(p: ProjectileParams) -> float:
    """Время подъёма до верхней точки."""
    return components(p)[1] / p.g


def max_height(p: ProjectileParams) -> float:
    """Наибольшая высота над землёй."""
    vy = components(p)[1]
    return p.h0 + vy * vy / (2 * p.g)


def horizontal_range(p: ProjectileParams) -> float:
    """Дальность полёта по горизонтали до падения."""
    return components(p)[0] * flight_time(p)


def state_at(p: ProjectileParams, t: float) -> ProjectileState:
    """Состояние в момент t. Если t больше времени полёта, тело уже на земле (landed=True, время = T)."""
    t = check("t", t, *TIME)
    total = flight_time(p)
    vx, vy0 = components(p)
    landed = t >= total
    tt = total if landed else t
    y = 0.0 if landed else max(0.0, p.h0 + vy0 * tt - 0.5 * p.g * tt * tt)
    vy = vy0 - p.g * tt
    return ProjectileState(t=tt, x=vx * tt, y=y, vx=vx, vy=vy, speed=math.hypot(vx, vy), landed=landed)


def trajectory(p: ProjectileParams, steps: int = 100) -> list[ProjectileState]:
    """steps + 1 точек траектории от броска до падения."""
    if isinstance(steps, bool) or not isinstance(steps, int) or not 2 <= steps <= 1000:
        from app.physics.common import PhysicsError
        raise PhysicsError("steps: целое число от 2 до 1000")
    total = flight_time(p)
    return [state_at(p, total * i / steps) for i in range(steps + 1)]


def summary(p: ProjectileParams) -> dict:
    """Все итоговые величины для панели справа и для объяснений."""
    vx, vy0 = components(p)
    total = flight_time(p)
    return {"vx": vx, "vy0": vy0, "flight_time": total, "time_to_apex": time_to_apex(p),
            "max_height": max_height(p), "range": horizontal_range(p),
            "impact_speed": state_at(p, total).speed}