"""Проверка развёрнутых ответов через ИИ. Подключается через set_text_evaluator (Фаза 5)."""
from app.ai import provider
from app.ai.prompts import EVAL_SYSTEM, eval_prompt
from app.diagnostics import text_evaluator as te
from app.diagnostics.question_bank import Question


def ai_text_evaluator(q: Question, answer: str) -> dict:
    p = provider.get_provider()
    if p is None:
        return te._demo(q, answer)                 # нет ключа -> проверка по ключевым словам
    try:
        raw = p.complete(EVAL_SYSTEM, [{"role": "user", "content": eval_prompt(q.text, q.rubric, answer)}], 600)
        data = provider.parse_json_object(raw)
        crit = data["criteria"]
        if not (isinstance(crit, list) and len(crit) == len(q.rubric) and all(isinstance(c, bool) for c in crit)):
            raise ValueError("bad criteria")
        feedback = str(data.get("feedback", ""))[:500]
    except (provider.AIUnavailable, ValueError, KeyError, TypeError):
        return te._demo(q, answer)                 # ошибка ИИ -> запасной вариант
    return {"source": "ai", "criteria": crit, "score": sum(crit) / len(crit), "feedback": feedback}


def configure_ai() -> None:
    te.set_text_evaluator(ai_text_evaluator)