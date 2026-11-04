"""Банк вопросов для диагностики (кинематика). Это ДАННЫЕ: чтобы добавить вопрос,
достаточно дописать Question(...) в список BANK."""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Question:
    id: str
    subtopic_key: str          # vectors | velocity | acceleration | motion_graphs | projectile_motion
    qtype: str                 # choice | numeric | text
    difficulty: int            # 1 лёгкий, 2 средний, 3 сложный
    text: str
    options: tuple = ()        # для choice
    answer: float | int | None = None   # choice: номер верного варианта; numeric: число
    tolerance: float = 0.0     # numeric: допустимая погрешность
    unit: str = ""
    misconceptions: dict = field(default_factory=dict)  # choice: {номер_варианта: ключ_ошибки}
    wrong_numbers: tuple = ()  # numeric: ((типичный_неверный_ответ, ключ_ошибки), ...)
    graph: dict | None = None  # данные графика для вопросов по графикам
    rubric: tuple = ()         # text: критерии для проверки ИИ
    explanation: str = ""


BANK = [
    Question("vec_1", "vectors", "numeric", 1,
             "Тело движется со скоростью 3 м/с на восток и одновременно 4 м/с на север. Чему равен модуль скорости?",
             answer=5, tolerance=0.01, unit="м/с", wrong_numbers=((7, "adds_perpendicular_vectors"),),
             explanation="Составляющие перпендикулярны: v = √(3² + 4²) = 5 м/с."),
    Question("vec_2", "vectors", "numeric", 2,
             "Скорость 20 м/с направлена под углом 30° к горизонту. Чему равна горизонтальная составляющая?",
             answer=17.32, tolerance=0.05, unit="м/с", wrong_numbers=((10, "sin_cos_swap"),),
             explanation="vx = v·cos30° ≈ 17,32 м/с (синус даёт вертикальную составляющую)."),
    Question("vel_1", "velocity", "numeric", 1,
             "Автомобиль проехал 150 м за 10 с с постоянной скоростью. Чему равна скорость?",
             answer=15, tolerance=0.01, unit="м/с", explanation="v = s / t = 150 / 10 = 15 м/с."),
    Question("vel_2", "velocity", "numeric", 3,
             "Первую половину пути тело прошло со скоростью 10 м/с, вторую половину — со скоростью 30 м/с. "
             "Чему равна средняя скорость на всём пути?",
             answer=15, tolerance=0.1, unit="м/с", wrong_numbers=((20, "average_of_speeds"),),
             explanation="Средняя скорость = весь путь / всё время = 2 / (1/10 + 1/30) = 15 м/с, а не среднее арифметическое."),
    Question("acc_1", "acceleration", "numeric", 1,
             "Скорость тела выросла с 5 до 15 м/с за 4 с. Чему равно ускорение?",
             answer=2.5, tolerance=0.01, unit="м/с²", wrong_numbers=((10, "ignores_time_in_acceleration"),),
             explanation="a = Δv / t = (15 − 5) / 4 = 2,5 м/с²."),
    Question("acc_2", "acceleration", "choice", 2,
             "Тело движется вправо и тормозит. Куда направлено ускорение?",
             options=("Вправо", "Влево", "Вверх", "Ускорения нет, так как скорость уменьшается"), answer=1,
             misconceptions={0: "acceleration_follows_velocity_direction", 3: "braking_means_no_acceleration"},
             explanation="Ускорение направлено в сторону изменения скорости. Скорость уменьшается — значит, ускорение направлено против неё."),
    Question("acc_3", "acceleration", "choice", 2,
             "В некоторый момент скорость тела равна нулю. Значит ли это, что ускорение в этот момент тоже равно нулю?",
             options=("Да, всегда", "Нет, не обязательно (например, верхняя точка подброшенного вверх тела)",
                      "Да, если тело движется вниз", "Это невозможно"), answer=1,
             misconceptions={0: "zero_velocity_means_zero_acceleration"},
             explanation="В верхней точке подбрасывания скорость равна нулю, а ускорение равно g."),
    Question("acc_4", "acceleration", "text", 3,
             "Своими словами объясните, чем ускорение отличается от скорости.",
             rubric=("Скорость показывает, как быстро меняется положение",
                     "Ускорение показывает, как быстро меняется скорость",
                     "Не путает величины (не говорит, что ускорение — это просто «большая скорость»)"),
             explanation="Скорость — изменение положения со временем, ускорение — изменение скорости со временем."),
    Question("gr_1", "motion_graphs", "numeric", 2,
             "По графику v(t) определите ускорение тела.",
             graph={"type": "v_t", "x_label": "t, с", "y_label": "v, м/с", "points": [[0, 2], [4, 10]]},
             answer=2, tolerance=0.01, unit="м/с²",
             wrong_numbers=((10, "reads_value_instead_of_slope"), (8, "ignores_time_in_acceleration")),
             explanation="Ускорение — наклон графика v(t): (10 − 2) / 4 = 2 м/с²."),
    Question("gr_2", "motion_graphs", "choice", 2,
             "График x(t) — горизонтальная прямая. Что делает тело?",
             graph={"type": "x_t", "x_label": "t, с", "y_label": "x, м", "points": [[0, 3], [5, 3]]},
             options=("Движется равномерно", "Стоит на месте", "Движется с ускорением", "Возвращается в начало"),
             answer=1, misconceptions={0: "confuses_xt_graph_with_vt_graph"},
             explanation="Координата не меняется со временем — тело неподвижно."),
    Question("proj_1", "projectile_motion", "choice", 1,
             "Мяч брошен горизонтально. Как он движется по горизонтали (без сопротивления воздуха)?",
             options=("Равномерно", "Ускоренно", "Замедляясь", "Сначала быстрее, потом медленнее"), answer=0,
             misconceptions={1: "mixes_horizontal_and_vertical_motion"},
             explanation="По горизонтали сил нет, поэтому скорость постоянна."),
    Question("proj_2", "projectile_motion", "choice", 2,
             "Мяч брошен под углом к горизонту. Чему равна скорость в верхней точке траектории?",
             options=("Нулю", "Горизонтальной составляющей начальной скорости (не нулю)", "Начальной скорости",
                      "Только вертикальной составляющей"), answer=1,
             misconceptions={0: "velocity_zero_at_apex"},
             explanation="В верхней точке обращается в ноль только вертикальная составляющая."),
    Question("proj_3", "projectile_motion", "numeric", 2,
             "Мяч брошен вертикально вверх со скоростью 20 м/с. Сколько секунд он поднимается до верхней точки? (g = 10 м/с²)",
             answer=2, tolerance=0.01, unit="с", wrong_numbers=((4, "total_time_vs_rise_time"),),
             explanation="t = v / g = 20 / 10 = 2 с. Полное время полёта вдвое больше."),
    Question("proj_4", "projectile_motion", "numeric", 3,
             "Мяч брошен с земли со скоростью 30 м/с под углом 30° к горизонту. Найдите время полёта до падения. "
             "(g = 10 м/с², сопротивлением воздуха пренебречь)",
             answer=3, tolerance=0.05, unit="с",
             wrong_numbers=((1.5, "total_time_vs_rise_time"), (5.2, "sin_cos_swap")),
             explanation="T = 2·v·sinα / g = 2·30·0,5 / 10 = 3 с."),
]

BY_ID = {q.id: q for q in BANK}


def get_question(question_id: str) -> Question:
    return BY_ID[question_id]


def questions_for(subtopic_key: str) -> list[Question]:
    return [q for q in BANK if q.subtopic_key == subtopic_key]