import os
import tempfile
from pathlib import Path

# ВАЖНО: до импорта приложения указываем временную базу, чтобы тесты не трогали cogniva.db
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp, 'test.db').as_posix()}"
os.environ["GEMINI_API_KEY"] = ""   # в тестах ключ пустой (запасная защита, .env его не перезапишет)

import pytest
from fastapi.testclient import TestClient

from app.database.connection import Base, SessionLocal, engine
from app.main import app


@pytest.fixture(autouse=True)
def _no_real_ai(monkeypatch):
    """В тестах настоящий ИИ выключен всегда, независимо от .env."""
    from app.ai import provider
    monkeypatch.setattr(provider, "get_provider", lambda: None)


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def db():
    with SessionLocal() as s:
        yield s


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def register(client):
    def _register(username="alex", password="secret123", name="Алекс"):
        r = client.post("/api/auth/register", json={"username": username, "password": password,
                                                    "display_name": name, "grade_level": 9})
        assert r.status_code == 201, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    return _register


@pytest.fixture
def auth(register):
    return register()