"""Оценка развёрнутых ответов по критериям (rubric).

СЕЙЧАС: простая проверка по ключевым словам (демо-режим, помечается source="demo_keywords").
В Фазе 6 подключим ИИ через set_text_evaluator(...) — остальной код менять не придётся.
"""
from typing import Callable

from app.diagnostics.question_bank import Question

_custom: Callable[[Question, str], dict] | None = None


def set_text_evaluator(fn: Callable[[Question, str], dict] | None) -> None:
    global _custom
    _custom = fn


def _norm(text: str) -> str:
    return text.lower().replace("ё", "е")


def _demo(q: Question, answer: str) -> dict:
    t = _norm(answer)
    if q.id == "acc_4":
        speed = any(m in t for m in ("положен", "перемещ", "путь", "координат", "расстоян",
                                     "как быстро дв", "как быстро ед"))
        acc = ("скорост" in t and "ускорен" in t and
               any(m in t for m in ("изменени", "меняет", "изменяет", "растет", "увеличива", "уменьша")))
        criteria = [speed, acc, speed and acc]
        return {"source": "demo_keywords", "criteria": criteria, "score": (speed + acc) / 2,
                "feedback": "Автопроверка по ключевым словам (демо-режим)."}
    return {"source": "demo_keywords", "criteria": [], "score": 0.0, "needs_ai_review": True,
            "feedback": "Для этого вопроса нет автопроверки в демо-режиме."}


def evaluate_text(q: Question, answer: str) -> dict:
    """Возвращает {'score': 0..1, 'criteria': [...], 'source': ..., 'feedback': ...}"""
    if len(answer.strip()) < 10:
        return {"source": "rule", "criteria": [False] * len(q.rubric), "score": 0.0,
                "feedback": "Ответ слишком короткий."}
    result = _custom(q, answer) if _custom else _demo(q, answer)
    result["score"] = max(0.0, min(1.0, float(result["score"])))
    return result