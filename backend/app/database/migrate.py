"""Один раз: добавляет в существующую базу колонку kind (СОР/СОЧ).
Запуск из папки backend:  python -m app.database.migrate"""
from sqlalchemy import text

import app.database.models  # noqa: F401  (регистрирует таблицы)
from app.database.connection import Base, engine


def migrate() -> None:
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(grade_records)"))]
        if "kind" not in cols:
            conn.execute(text("ALTER TABLE grade_records ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'other'"))
            print("Колонка kind добавлена. Старые оценки получили тип 'other'.")
        else:
            print("Колонка kind уже есть, ничего делать не нужно.")


if __name__ == "__main__":
    migrate()