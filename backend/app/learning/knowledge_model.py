"""Модель знаний: как из результатов заданий получается оценка освоения (mastery).

Правило: mastery НИКОГДА не задаётся «на глаз» и не зависит от школьной оценки.
Она меняется только от доказательств (правильные/неправильные ответы).

Формула — взвешенное среднее прежней оценки и новых результатов:
    new = (вес_прошлого * old + n * доля_верных) / (вес_прошлого + n)
Вес прошлого = число прошлых заданий, но не больше 6 (чтобы свежие результаты
заметно влияли), а для подтемы без данных — 1 (почти нет информации).
"""
from datetime import datetime

from app.database.models import SubtopicProgress

PRIOR_CAP = 6


def update_mastery(progress: SubtopicProgress, correct: int, total: int) -> float:
    if total <= 0 or not 0 <= correct <= total:
        raise ValueError("Некорректное число ответов")
    prior_weight = min(progress.tasks_done, PRIOR_CAP) if progress.tasks_done > 0 else 1
    observed = correct / total
    new = (prior_weight * progress.mastery + total * observed) / (prior_weight + total)
    progress.mastery = round(new, 4)
    progress.tasks_done += total
    progress.correct += correct
    progress.incorrect += total - correct
    progress.last_assessed = datetime.utcnow()
    return progress.mastery
