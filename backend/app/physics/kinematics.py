"""Линейное и равноускоренное движение вдоль одной оси. Единицы СИ: м, с, м/с, м/с².

Модель: ускорение постоянно. Если ускорение направлено против скорости, тело
останавливается, а затем продолжает движение в обратную сторону (скорость меняет знак)."""
from dataclasses import dataclass
from typing import Optional

from app.physics.common import PhysicsError, check

POSITION = (-1000.0, 1000.0)
VELOCITY = (-100.0, 100.0)
ACCELERATION = (-50.0, 50.0)
TIME = (0.0, 60.0)


@dataclass(frozen=True)
class MotionState:
    t: float   # время, с
    x: float   # координата, м
    v: float   # скорость, м/с
    a: float   # ускорение, м/с²


def uniform_acceleration(x0: float, v0: float, a: float, t: float) -> MotionState:
    x0 = check("x0", x0, *POSITION)
    v0 = check("v0", v0, *VELOCITY)
    a = check("a", a, *ACCELERATION)
    t = check("t", t, *TIME)
    return MotionState(t, x0 + v0 * t + 0.5 * a * t * t, v0 + a * t, a)


def linear_motion(x0: float, v: float, t: float) -> MotionState:
    """Равномерное движение — частный случай с ускорением 0."""
    return uniform_acceleration(x0, v, 0.0, t)


def time_to_zero_velocity(v0: float, a: float) -> Optional[float]:
    """Через сколько секунд скорость станет нулевой. None — если этого не произойдёт."""
    v0 = check("v0", v0, *VELOCITY)
    a = check("a", a, *ACCELERATION)
    if a == 0 or v0 == 0:
        return None
    t = -v0 / a
    return t if t > 0 else None


def trajectory(x0: float, v0: float, a: float, duration: float, steps: int = 100) -> list[MotionState]:
    """steps + 1 точек равномерно от 0 до duration (для графиков и следа движения)."""
    duration = check("duration", duration, *TIME)
    if isinstance(steps, bool) or not isinstance(steps, int) or not 2 <= steps <= 1000:
        raise PhysicsError("steps: целое число от 2 до 1000")
    return [uniform_acceleration(x0, v0, a, duration * i / steps) for i in range(steps + 1)]