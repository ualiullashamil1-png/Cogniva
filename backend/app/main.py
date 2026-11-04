"""Точка входа FastAPI."""
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.academics import grades, progress, subjects
from app.database import models  # noqa: F401  (регистрирует таблицы)
from app.database.connection import Base, SessionLocal, engine
from app.diagnostics import routes as diagnostics_routes
from app.students import routes as student_routes
from app.ai import routes as ai_routes
from app.ai import chat as chat_routes
from app.scenes import routes as scenes_routes
from app.ai.text_ai import configure_ai
from app.seed import seed_demo

# backend/app/main.py -> корень репозитория -> frontend/dist
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    if os.getenv("SEED_DEMO") == "1":
        # На бесплатном хостинге база пуста после перезапуска: создаём демо-ученика alex (если его нет)
        with SessionLocal() as db:
            seed_demo(db)
    yield


app = FastAPI(title="Cogniva API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
for r in (student_routes.router, subjects.router, grades.router, progress.router,
          diagnostics_routes.router, ai_routes.router, chat_routes.router, scenes_routes.router):
    app.include_router(r)

configure_ai()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Сайт отдаётся только если фронтенд собран (на компьютере без сборки ничего не меняется)
if DIST.is_dir():
    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse("/cogniva.html")

    app.mount("/", StaticFiles(directory=DIST, html=True), name="site")