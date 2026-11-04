"""Выбор способа объяснения по ПРАВИЛАМ (без ИИ). Работает и в демо-режиме, и как подсказка для ИИ.
Это не «тип ученика»: решение зависит от конкретной подтемы и конкретных ошибок."""

WEAK = 0.6
STRONG = 0.75
CALC_ERRORS = {"ignores_time_in_acceleration", "sin_cos_swap", "adds_perpendicular_vectors",
               "average_of_speeds", "total_time_vs_rise_time"}
SCENE_FOR = {"projectile_motion": "projectile_motion", "vectors": "projectile_motion",
             "acceleration": "uniform_acceleration", "motion_graphs": "uniform_acceleration",
             "velocity": "linear_motion"}


def select_strategy(context: dict) -> dict:
    subs = context["subtopics"]
    assessed = [s for s in subs if s["mastery"] is not None]
    weak = sorted((s for s in assessed if s["mastery"] < WEAK), key=lambda s: s["mastery"])
    strong_keys = {s["key"] for s in assessed if s["mastery"] >= STRONG}

    if weak:
        top = weak[0]
        focus = [s["key"] for s in weak[:2]]
        mis = set(top.get("misconception_keys", []))
        if top["key"] == "acceleration" and "vectors" in strong_keys:
            approaches = ["visual", "comparative"]
            reason = ("Векторы усвоены хорошо, а ускорение слабое: объясняем ускорение "
                      "как изменение вектора скорости.")
        elif top["key"] == "motion_graphs":
            approaches = ["visual", "interactive"]
            reason = "Слабое чтение графиков: связываем график с движением в интерактивной сцене."
        elif mis & CALC_ERRORS:
            approaches = ["step_by_step", "mathematical"]
            reason = "Замечены ошибки в вычислениях: разбираем расчёт по шагам."
        else:
            approaches = ["step_by_step", "analogy"]
            reason = "Подтема усвоена слабо: объясняем постепенно, с аналогией."
    elif assessed:
        weakest = min(assessed, key=lambda s: s["mastery"])
        focus, approaches = [weakest["key"]], ["practical", "interactive"]
        reason = "Слабых мест не найдено: закрепляем практикой и экспериментом."
    else:
        focus, approaches = [subs[0]["key"]], ["step_by_step", "interactive"]
        reason = "Данных об освоении пока нет: начинаем с основ по шагам. Рекомендуем пройти диагностику."

    if "interactive" not in approaches and focus[0] == "projectile_motion":
        approaches = approaches[:2] + ["interactive"]
    return {"focus": focus, "approaches": approaches, "reason": reason,
            "scene_hint": SCENE_FOR.get(focus[0])}