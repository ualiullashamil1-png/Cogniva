"""Проверка объективных ответов (выбор варианта и число). ИИ здесь НЕ участвует."""
import re
from dataclasses import dataclass

from app.diagnostics.question_bank import Question

_NUMBER = re.compile(r"[-+]?\d+(?:[.,]\d+)?")


@dataclass(frozen=True)
class CheckResult:
    is_correct: bool
    score: float
    misconception: str | None = None


def parse_number(text: str) -> float | None:
    """Достаёт число из ответа: '2,5', '2.5 м/с²', 'a = 2.5' -> 2.5"""
    m = _NUMBER.search(text.replace(" ", ""))
    return float(m.group().replace(",", ".")) if m else None


def check_answer(q: Question, answer: str) -> CheckResult:
    """Некорректный формат ответа -> ValueError (ученик может исправить и отправить снова)."""
    if q.qtype == "choice":
        try:
            idx = int(answer.strip())
        except ValueError:
            raise ValueError("Ответ должен быть номером варианта")
        if not 0 <= idx < len(q.options):
            raise ValueError("Нет такого варианта ответа")
        if idx == q.answer:
            return CheckResult(True, 1.0)
        return CheckResult(False, 0.0, q.misconceptions.get(idx))
    if q.qtype == "numeric":
        value = parse_number(answer)
        if value is None:
            raise ValueError("Введите число")
        if abs(value - q.answer) <= q.tolerance:
            return CheckResult(True, 1.0)
        for wrong, key in q.wrong_numbers:           # типичные неверные ответы -> тип ошибки
            if abs(value - wrong) <= max(q.tolerance, 0.01 * abs(wrong)):
                return CheckResult(False, 0.0, key)
        return CheckResult(False, 0.0)
    raise ValueError("Этот тип вопроса проверяется отдельно")