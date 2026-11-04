"""Диалог с репетитором. Память урока = сохранённая история сообщений."""
from app.ai import provider
from app.ai.demo_content import checkpoint_for, texts_for
from app.ai.prompts import INTENT_HINT, tutor_system

DEMO_NOTE = "\n\n(Демо-режим: это заготовленный ответ. Для свободного диалога добавьте GEMINI_API_KEY в файл .env.)"


def _demo_reply(plan: dict, text: str, intent: str) -> str:
    key = plan["focus_subtopics"][0]
    t = texts_for(key)
    q, _ = checkpoint_for(key)
    if intent == "simpler":
        body = t["idea"]
    elif intent == "math":
        body = t["math"]
    elif intent == "analogy":
        body = t["analogy"]
    elif intent == "example":
        body = t["math"] + "\n\nТеперь попробуйте сами: " + q
    else:
        body = t["idea"] + "\n\nПроверим понимание: " + q
    return body + DEMO_NOTE


def reply(context: dict, plan: dict, history: list, text: str, intent: str) -> tuple[str, str]:
    """Возвращает (ответ, режим 'ai'|'demo')."""
    p = provider.get_provider()
    if p is not None:
        try:
            msgs = [{"role": m["role"], "content": m["content"]} for m in history[-10:]]
            while msgs and msgs[0]["role"] != "user":
                msgs.pop(0)
            safe = text.replace("<", "‹")
            msgs.append({"role": "user",
                         "content": f'<student_message intent="{intent}">{safe}</student_message>\n'
                                    f"{INTENT_HINT[intent]}"})
            out = p.complete(tutor_system(context, plan), msgs, 700).strip()
            if not out:
                raise ValueError("empty")
            return out[:3000], "ai"
        except (provider.AIUnavailable, ValueError):
            pass
    return _demo_reply(plan, text, intent), "demo"