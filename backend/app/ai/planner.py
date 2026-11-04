"""Составление плана урока: ИИ (если доступен и ответил корректно) или демо-план.
В план входит сцена (scene_spec): от ИИ после проверки или заготовленная."""
from typing import Optional

from app.ai import provider
from app.ai.demo_content import APPROACH_TEXT, APPROACH_TITLE, checkpoint_for, texts_for
from app.ai.prompts import PLANNER_SYSTEM, planner_prompt
from app.ai.schemas import LessonPlan
from app.learning.strategy_selector import STRONG, select_strategy
from app.scenes.scene_planner import demo_scene_spec, sanitize_spec, scene_instructions


def demo_plan(context: dict, strategy: dict) -> dict:
    key = strategy["focus"][0]
    texts = texts_for(key)
    strong = [s["name"] for s in context["subtopics"]
              if s["mastery"] is not None and s["mastery"] >= STRONG and s["key"] != key]
    link = (f"Вы уже хорошо владеете: {', '.join(strong)}. Опираемся на это. " if strong
            else "Начнём с основы. ")
    steps = [{"title": "С чего начнём", "content": link + texts["idea"], "approach": "step_by_step"}]
    seen = {"idea"}
    for ap in strategy["approaches"]:
        tk = APPROACH_TEXT[ap]
        if tk in seen:
            continue
        seen.add(tk)
        steps.append({"title": APPROACH_TITLE[ap], "content": texts[tk], "approach": ap})
    if len(steps) < 2:
        tk = "math" if "math" not in seen else "visual"
        steps.append({"title": APPROACH_TITLE["mathematical" if tk == "math" else "visual"],
                      "content": texts[tk], "approach": "mathematical" if tk == "math" else "visual"})
    q, hint = checkpoint_for(key)
    return LessonPlan(focus_subtopics=strategy["focus"], approaches=strategy["approaches"],
                      rationale=strategy["reason"], steps=steps,
                      checkpoints=[{"question": q, "hint": hint}],
                      scene_hint=strategy["scene_hint"]).model_dump()


def _attach_scene(plan: dict) -> dict:
    """Сцена от ИИ, если она прошла проверку; иначе заготовка под главную слабую подтему."""
    spec = sanitize_spec(plan.get("scene_spec"))
    if spec is None:
        spec = demo_scene_spec(plan["focus_subtopics"][0], plan.get("scene_hint"))
    plan["scene_spec"] = spec
    plan["scene_hint"] = spec["template_id"]
    return plan


def build_plan(context: dict) -> tuple[dict, str, Optional[str]]:
    """Возвращает (план, режим 'ai'|'demo', примечание)."""
    strategy = select_strategy(context)
    p = provider.get_provider()
    note = None
    if p is not None:
        try:
            raw = p.complete(PLANNER_SYSTEM + scene_instructions(),
                             [{"role": "user", "content": planner_prompt(context, strategy)}], 2500)
            plan = LessonPlan.model_validate(provider.parse_json_object(raw))
            valid = {s["key"] for s in context["subtopics"]}
            if not set(plan.focus_subtopics) <= valid:       # ИИ не должен придумывать подтемы
                raise ValueError("unknown subtopic")
            return _attach_scene(plan.model_dump()), "ai", None
        except (provider.AIUnavailable, ValueError):
            note = "ИИ недоступен или вернул некорректный ответ — показан демо-план."
    return _attach_scene(demo_plan(context, strategy)), "demo", note