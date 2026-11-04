"""Понятные описания типичных ошибок (ключи совпадают с question_bank.py)."""
LABELS = {
    "adds_perpendicular_vectors": "складывает перпендикулярные составляющие как обычные числа (3 + 4 вместо теоремы Пифагора)",
    "sin_cos_swap": "путает синус и косинус при разложении вектора на составляющие",
    "average_of_speeds": "считает среднюю скорость как среднее арифметическое скоростей",
    "ignores_time_in_acceleration": "не делит изменение скорости на время при расчёте ускорения",
    "acceleration_follows_velocity_direction": "считает, что ускорение всегда направлено так же, как скорость",
    "braking_means_no_acceleration": "считает, что при торможении ускорения нет",
    "zero_velocity_means_zero_acceleration": "считает, что если скорость равна нулю, то и ускорение равно нулю",
    "reads_value_instead_of_slope": "читает значение на графике вместо наклона (ускорение — это наклон графика v(t))",
    "confuses_xt_graph_with_vt_graph": "путает график координаты x(t) с графиком скорости v(t)",
    "mixes_horizontal_and_vertical_motion": "смешивает горизонтальное и вертикальное движение",
    "velocity_zero_at_apex": "считает, что в верхней точке траектории скорость равна нулю",
    "total_time_vs_rise_time": "путает время подъёма и полное время полёта",
}


def label(key: str) -> str:
    return LABELS.get(key, key)