"""Демо-данные: python -m app.seed   (логин: alex, пароль: demo12345)"""
from datetime import datetime, timedelta

from app.database.connection import Base, SessionLocal, engine
from app.database.models import GradeRecord, Student, Subject, Subtopic, SubtopicProgress, Topic
from app.security import hash_password

KINEMATICS = [  # (ключ, название, описание, mastery, заданий, сложности)
    ("vectors", "Векторы", "Сложение векторов, проекции на оси.", 0.90, 10, []),
    ("velocity", "Скорость", "Скорость как изменение координаты со временем.", 0.85, 10, []),
    ("acceleration", "Ускорение", "Ускорение как изменение скорости со временем.", 0.40, 10,
     ["путает скорость и ускорение"]),
    ("motion_graphs", "Графики движения", "Чтение графиков x(t), v(t), a(t).", 0.65, 8, []),
    ("projectile_motion", "Движение под углом к горизонту",
     "Как начальная скорость и угол влияют на траекторию.", 0.5, 0, []),
]


def seed_demo(db) -> Student:
    existing = db.query(Student).filter_by(username="alex").first()
    if existing:
        return existing
    alex = Student(username="alex", password_hash=hash_password("demo12345"), display_name="Алекс", grade_level=9)
    db.add(alex); db.flush()
    physics = Subject(student_id=alex.id, name="Физика")
    math = Subject(student_id=alex.id, name="Математика")
    db.add_all([physics, math]); db.flush()
    kin = Topic(subject_id=physics.id, name="Кинематика")
    db.add_all([kin, Topic(subject_id=math.id, name="Алгебра")]); db.flush()
    subs = {}
    for key, name, desc, mastery, n, diff in KINEMATICS:
        st = Subtopic(topic_id=kin.id, name=name, description=desc, key=key)
        db.add(st); db.flush(); subs[key] = st
        db.add(SubtopicProgress(student_id=alex.id, subtopic_id=st.id, mastery=mastery, tasks_done=n,
                                correct=round(mastery * n), incorrect=n - round(mastery * n), difficulties=diff,
                                last_assessed=datetime.utcnow() - timedelta(days=7) if n else None))
    today = datetime.utcnow()
    for score, title, days, sub in [(7, "Контрольная: движение", 40, None), (9, "Самостоятельная: векторы", 21, "vectors"),
                                    (8, "Тест: скорость и ускорение", 7, "acceleration")]:
        db.add(GradeRecord(student_id=alex.id, subject_id=physics.id, score=score, max_score=10, title=title,
                           date=today - timedelta(days=days), subtopic_id=subs[sub].id if sub else None))
    for score, title, days in [(9, "Тест: уравнения", 30), (8, "Контрольная: функции", 10)]:
        db.add(GradeRecord(student_id=alex.id, subject_id=math.id, score=score, max_score=10, title=title,
                           date=today - timedelta(days=days)))
    db.commit()
    return alex


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        seed_demo(session)
    print("Демо-данные готовы. Логин: alex, пароль: demo12345")
