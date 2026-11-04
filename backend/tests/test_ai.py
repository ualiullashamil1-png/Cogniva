import json

import pytest

from app.ai import provider
from app.ai.provider import AIUnavailable, GeminiProvider
from app.ai.text_ai import ai_text_evaluator
from app.database.connection import SessionLocal
from app.diagnostics.question_bank import get_question
from app.learning.strategy_selector import select_strategy
from app.seed import seed_demo


class Fake:
    name, model = "fake", "fake-1"

    def __init__(self, replies):
        self.replies, self.calls = list(replies), []

    def complete(self, system, messages, max_tokens=1500):
        self.calls.append((system, messages))
        r = self.replies.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


@pytest.fixture(autouse=True)
def no_real_ai(monkeypatch):                       # по умолчанию в тестах ИИ выключен
    monkeypatch.setattr(provider, "get_provider", lambda: None)


def use(monkeypatch, fake):
    monkeypatch.setattr(provider, "get_provider", lambda: fake)


def good_plan(focus="acceleration"):
    return json.dumps({
        "focus_subtopics": [focus], "approaches": ["visual", "step_by_step"], "rationale": "потому что",
        "steps": [{"title": "a", "content": "b", "approach": "visual"},
                  {"title": "c", "content": "d", "approach": "step_by_step"}],
        "checkpoints": [{"question": "q?", "hint": ""}], "scene_hint": "uniform_acceleration"})


def login_alex(client):
    with SessionLocal() as s:
        seed_demo(s)
    t = client.post("/api/auth/login", json={"username": "alex", "password": "demo12345"}).json()["access_token"]
    return {"Authorization": f"Bearer {t}"}


def topic_id(client, h):
    return next(t["id"] for s in client.get("/api/subjects", headers=h).json()
                for t in s["topics"] if t["name"] == "Кинематика")


def test_strategy_rules():
    ctx = {"topic": "К", "last_test": None, "subtopics": [
        {"key": "vectors", "name": "В", "mastery": 0.9, "misconception_keys": []},
        {"key": "acceleration", "name": "У", "mastery": 0.4, "misconception_keys": []}]}
    s = select_strategy(ctx)
    assert s["focus"][0] == "acceleration" and s["approaches"] == ["visual", "comparative"]
    assert s["scene_hint"] == "uniform_acceleration"
    ctx["subtopics"][1]["misconception_keys"] = ["ignores_time_in_acceleration"]
    ctx["subtopics"][0]["mastery"] = 0.5
    assert select_strategy(ctx)["approaches"] == ["step_by_step", "mathematical"]


def test_demo_mode_lesson_and_chat(client):
    h = login_alex(client)
    assert client.get("/api/ai/status", headers=h).json()["mode"] == "demo"
    lesson = client.post("/api/lessons", json={"topic_id": topic_id(client, h)}, headers=h).json()
    assert lesson["mode"] == "demo" and lesson["plan"]["focus_subtopics"][0] == "acceleration"
    assert len(lesson["plan"]["steps"]) >= 2 and lesson["plan"]["checkpoints"]
    url = f"/api/lessons/{lesson['id']}"
    r = client.post(f"{url}/messages", json={"text": "Объясни проще", "intent": "simpler"}, headers=h).json()
    assert r["mode"] == "demo" and r["reply"]
    saved = client.get(url, headers=h).json()
    assert [m["role"] for m in saved["messages"]] == ["user", "assistant"]
    assert client.post(f"{url}/messages", json={"text": "x", "intent": "hack"}, headers=h).status_code == 422
    assert client.post(f"{url}/messages", json={"text": ""}, headers=h).status_code == 422


def test_ai_plan_and_privacy(client, monkeypatch):
    h = login_alex(client)
    fake = Fake([good_plan(), "Ответ репетитора"])
    use(monkeypatch, fake)
    lesson = client.post("/api/lessons", json={"topic_id": topic_id(client, h)}, headers=h).json()
    assert lesson["mode"] == "ai"
    system, msgs = fake.calls[0]
    assert "alex" not in (system + msgs[0]["content"]).lower()          # логин не уходит в ИИ
    r = client.post(f"/api/lessons/{lesson['id']}/messages", json={"text": "Привет"}, headers=h).json()
    assert r == {"reply": "Ответ репетитора", "mode": "ai"}
    assert "<student_message" in fake.calls[1][1][-1]["content"]


@pytest.mark.parametrize("bad", ["это не JSON", '{"focus_subtopics": []}', good_plan("выдуманная_подтема"),
                                 AIUnavailable("down")])
def test_bad_ai_falls_back_to_demo(client, monkeypatch, bad):
    h = login_alex(client)
    use(monkeypatch, Fake([bad]))
    lesson = client.post("/api/lessons", json={"topic_id": topic_id(client, h)}, headers=h).json()
    assert lesson["mode"] == "demo" and lesson["note"] and lesson["plan"]["steps"]


def test_chat_failure_falls_back(client, monkeypatch):
    h = login_alex(client)
    lesson = client.post("/api/lessons", json={"topic_id": topic_id(client, h)}, headers=h).json()
    use(monkeypatch, Fake([AIUnavailable("down")]))
    r = client.post(f"/api/lessons/{lesson['id']}/messages", json={"text": "Привет"}, headers=h).json()
    assert r["mode"] == "demo" and r["reply"]


def test_lessons_are_private(client, register):
    h = login_alex(client)
    lesson = client.post("/api/lessons", json={"topic_id": topic_id(client, h)}, headers=h).json()
    other = register("mallory")
    assert client.get(f"/api/lessons/{lesson['id']}", headers=other).status_code == 404
    assert client.post(f"/api/lessons/{lesson['id']}/messages", json={"text": "hi"}, headers=other).status_code == 404
    assert client.post("/api/lessons", json={"topic_id": topic_id(client, h)}, headers=other).status_code == 404
    assert client.post("/api/lessons", json={"topic_id": 1}).status_code == 401


def test_ai_text_evaluator(monkeypatch):
    q = get_question("acc_4")
    use(monkeypatch, Fake(['{"criteria": [true, true, false], "feedback": "ок"}']))
    r = ai_text_evaluator(q, "какой-то ответ ученика")
    assert r["source"] == "ai" and abs(r["score"] - 2 / 3) < 1e-9
    use(monkeypatch, Fake(['{"criteria": [true]}']))                      # неверная длина -> запасной вариант
    assert ai_text_evaluator(q, "какой-то ответ ученика")["source"] == "demo_keywords"
    use(monkeypatch, Fake([AIUnavailable("down")]))
    assert ai_text_evaluator(q, "какой-то ответ ученика")["source"] == "demo_keywords"


def test_gemini_provider_request_and_errors(monkeypatch):
    import httpx
    seen = {}

    class Resp:
        def raise_for_status(self): pass
        def json(self): return {"candidates": [{"content": {"parts": [{"text": "при"}, {"text": "вет"}]}}]}

    def fake_post(url, **kw):
        seen["url"], seen["kw"] = url, kw
        return Resp()

    monkeypatch.setattr(httpx, "post", fake_post)
    out = GeminiProvider("SECRET123", "m1").complete(
        "sys", [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b"}], 100)
    assert out == "привет"
    assert seen["url"].endswith("/models/m1:generateContent") and "SECRET123" not in seen["url"]
    assert seen["kw"]["json"]["contents"][1]["role"] == "model"             # assistant -> model

    def boom(url, **kw):
        raise RuntimeError("network")

    monkeypatch.setattr(httpx, "post", boom)
    with pytest.raises(AIUnavailable):
        GeminiProvider("SECRET123", "m1").complete("sys", [{"role": "user", "content": "a"}])