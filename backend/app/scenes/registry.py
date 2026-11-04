"""Реестр: какие шаблоны сцен, объекты и дополнительные компоненты существуют.
ИИ может выбирать ТОЛЬКО из этого списка. Чтобы добавить объект, допишите ObjectDef в OBJECTS."""
from dataclasses import dataclass


@dataclass(frozen=True)
class ParamSpec:
    key: str
    label: str
    unit: str
    default: float
    min: float
    max: float
    step: float


@dataclass(frozen=True)
class TemplateDef:
    id: str
    title: str
    subject: str
    physics_model: str
    params: tuple
    roles: tuple
    components: tuple
    default_object: str
    camera: dict
    restrictions: tuple


@dataclass(frozen=True)
class ObjectDef:
    id: str
    name: str
    category: str          # generic | vehicle | sports | person | geometry
    roles: tuple           # на какие роли в сцене можно ставить
    templates: tuple       # в каких шаблонах объект физически уместен
    scale: float
    fallback: str          # чем заменить, если в шаблоне объект не подходит
    why_not: str           # почему не подходит (показывается ученику)


@dataclass(frozen=True)
class ComponentDef:
    id: str
    label: str
    description: str


ALL = ("linear_motion", "uniform_acceleration", "projectile_motion")
GROUND = ("linear_motion", "uniform_acceleration")

OBJECTS = {o.id: o for o in (
    ObjectDef("sphere", "Сфера", "generic", ("moving_object",), ALL, 1.0, "sphere", ""),
    ObjectDef("ball", "Мяч", "sports", ("moving_object",), ALL, 1.0, "sphere", ""),
    ObjectDef("cube", "Куб", "geometry", ("moving_object",), ALL, 1.0, "sphere", ""),
    ObjectDef("cylinder", "Цилиндр", "geometry", ("moving_object",), ALL, 1.0, "sphere", ""),
    ObjectDef("pyramid", "Пирамида", "geometry", ("moving_object",), ALL, 1.0, "sphere", ""),
    ObjectDef("minecart", "Вагонетка", "vehicle", ("moving_object",), GROUND, 1.2, "ball",
              "вагонетка движется по рельсам и не летит по баллистической траектории"),
    ObjectDef("car", "Автомобиль", "vehicle", ("moving_object",), GROUND, 1.2, "ball",
              "автомобиль движется по земле и не летит по баллистической траектории"),
    ObjectDef("train", "Поезд", "vehicle", ("moving_object",), GROUND, 1.2, "ball",
              "поезд движется по рельсам и не летит по баллистической траектории"),
    ObjectDef("rocket", "Ракета", "vehicle", ("moving_object",), GROUND, 1.2, "ball",
              "у ракеты есть тяга двигателя, а модель броска учитывает только силу тяжести"),
    ObjectDef("human", "Человек (простая фигура)", "person", ("moving_object",), GROUND, 1.0, "ball",
              "человека нельзя «бросить» как материальную точку"),
)}

COMPONENTS = {c.id: c for c in (
    ComponentDef("coordinate_axes", "Оси координат", "Оси и шкала расстояний"),
    ComponentDef("velocity_vector", "Вектор скорости", "Стрелка скорости в текущий момент"),
    ComponentDef("velocity_components", "Составляющие скорости", "Горизонтальная и вертикальная составляющие"),
    ComponentDef("acceleration_vector", "Вектор ускорения", "Стрелка ускорения"),
    ComponentDef("trajectory", "Траектория", "Линия пройденного пути"),
    ComponentDef("labels", "Подписи", "Подписи величин рядом с объектом"),
    ComponentDef("measurement", "Измерения", "Высота и дальность на сцене"),
    ComponentDef("angle_indicator", "Угол броска", "Дуга с углом к горизонту"),
    ComponentDef("graph_xt", "График x(t)", "График координаты от времени"),
    ComponentDef("graph_vt", "График v(t)", "График скорости от времени"),
)}

_ROLES = ("moving_object",)

TEMPLATES = {t.id: t for t in (
    TemplateDef(
        "linear_motion", "Равномерное движение", "physics", "constant_velocity",
        (ParamSpec("x0", "Начальная координата", "м", 0, -100, 100, 1),
         ParamSpec("v", "Скорость", "м/с", 5, -50, 50, 0.5),
         ParamSpec("time", "Время", "с", 3, 0, 20, 0.1)),
        _ROLES,
        ("coordinate_axes", "velocity_vector", "trajectory", "labels", "measurement", "graph_xt", "graph_vt"),
        "sphere", {"position": [0, 6, 16], "target": [10, 0, 0]},
        ("Движение вдоль одной оси", "Скорость постоянна")),
    TemplateDef(
        "uniform_acceleration", "Равноускоренное движение", "physics", "constant_acceleration",
        (ParamSpec("x0", "Начальная координата", "м", 0, -100, 100, 1),
         ParamSpec("v0", "Начальная скорость", "м/с", 5, -50, 50, 0.5),
         ParamSpec("a", "Ускорение", "м/с²", 2, -20, 20, 0.5),
         ParamSpec("time", "Время", "с", 4, 0, 20, 0.1)),
        _ROLES,
        ("coordinate_axes", "velocity_vector", "acceleration_vector", "trajectory", "labels",
         "measurement", "graph_xt", "graph_vt"),
        "sphere", {"position": [0, 6, 16], "target": [10, 0, 0]},
        ("Движение вдоль одной оси", "Ускорение постоянно", "Против скорости: тело останавливается и разворачивается")),
    TemplateDef(
        "projectile_motion", "Бросок под углом", "physics", "ideal_projectile",
        (ParamSpec("v0", "Начальная скорость", "м/с", 20, 0, 60, 1),
         ParamSpec("angle_deg", "Угол броска", "°", 45, 0, 90, 1),
         ParamSpec("h0", "Начальная высота", "м", 0, 0, 100, 1),
         ParamSpec("g", "Ускорение свободного падения", "м/с²", 9.81, 1, 30, 0.01),
         ParamSpec("time", "Время", "с", 1, 0, 60, 0.1)),
        _ROLES,
        ("coordinate_axes", "velocity_vector", "velocity_components", "acceleration_vector",
         "trajectory", "labels", "measurement", "angle_indicator"),
        "ball", {"position": [20, 12, 40], "target": [20, 8, 0]},
        ("Без сопротивления воздуха", "Постоянное g, направленное вниз", "Земля — плоскость y = 0")),
)}

DEFAULT_COMPONENTS = ("coordinate_axes", "velocity_vector", "trajectory")
EXTRA_INTERACTIONS = ("toggle_vectors", "toggle_trajectory")