"""Общие проверки для физических расчётов."""
import math


class PhysicsError(ValueError):
    """Недопустимые параметры (вне диапазона, не число и т. д.)."""


def check(name: str, value, lo: float, hi: float) -> float:
    """Проверяет, что value — конечное число в диапазоне [lo, hi]. Возвращает его как float."""
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise PhysicsError(f"{name}: нужно конечное число")
    if not lo <= value <= hi:
        raise PhysicsError(f"{name}: допустимо от {lo} до {hi}, получено {value}")
    return float(value)