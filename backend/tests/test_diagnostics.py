from app.database.connection import SessionLocal
from app.database.models import StudentAnswer, SubtopicProgress, TestQuestion
from app.diagnostics.checker import check_answer, parse_number
from app.diagnostics.question_bank import get_question
from app.diagnostics.text_evaluator import evaluate_text
from app.seed import seed_demo

GOOD_TEXT = ("Скорость показывает, как быстро меняется положение тела, "
             "а ускорение показывает, как быстро меняется скорость.")


# ---------- помощники ----------
def login_alex(client):
    with SessionLocal() as s:
        seed_demo(s)
    token = client.post("/api/auth/login", json={"username": "alex", "password": "demo12345"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def kinematics_id(client, h):
    return next(t["id"] for s in client.get("/api/subjects", headers=h).json()
                for t in s["topics"] if t["name"] == "Кинематика")


def bank_id(test_question_id):
    with SessionLocal() as s:                 # короткая сессия, чтобы не блокировать базу
        return s.get(TestQuestion, test_question_id).bank_id


def good(q):
    return GOOD_TEXT if q.qtype == "text" else str(q.answer)


def bad(q):
    if q.qtype == "text":
        return "не знаю как это объяснить"
    if q.qtype == "choice":
        wrong = [i for i in range(len(q.options)) if i != q.answer]
        return str(next((i for i in wrong if i in q.misconceptions), wrong[0]))
    return str(q.wrong_numbers[0][0] if q.wrong_numbers else q.answer + 100)


def run_test(client, h, topic_id, decide, kind="diagnostic", stop_after=None):
    state = client.post("/api/tests", json={"topic_id": topic_id, "kind": kind}, headers=h).json()
    asked, n = [], 0
    while state["question"] and (stop_after is None or n < stop_after):
        q = get_question(bank_id(state["question"]["id"]))
        asked.append(q.id)
        r = client.post(f"/api/tests/{state['test_id']}/answers", headers=h,
                        json={"question_id": state["question"]["id"], "answer": decide(q)})
        assert r.status_code == 200, r.text
        state, n = r.json(), n + 1
    return state, asked


# ---------- проверка ответов ----------
def test_checker_numeric_and_choice():
    q = get_question("acc_1")                                    # ответ 2.5, типичная ошибка 10
    assert check_answer(q, "2,5").is_correct and check_answer(q, "a = 2.5 м/с²").is_correct
    wrong = check_answer(q, "10")
    assert not wrong.is_correct and wrong.misconception == "ignores_time_in_acceleration"
    assert check_answer(q, "7").misconception is None
    for garbage in ("много", ""):
        try:
            check_answer(q, garbage); assert False
        except ValueError:
            pass
    c = get_question("acc_2")                                    # верный вариант — 1 («Влево»)
    assert check_answer(c, "1").is_correct
    assert check_answer(c, "0").misconception == "acceleration_follows_velocity_direction"
    for bad_input in ("9", "влево"):
        try:
            check_answer(c, bad_input); assert False
        except ValueError:
            pass
    assert parse_number("-3,5") == -3.5 and parse_number("abc") is None


def test_text_evaluator_demo():
    q = get_question("acc_4")
    assert evaluate_text(q, GOOD_TEXT)["score"] == 1.0
    assert evaluate_text(q, "Ускорение это когда скорость большая и все быстро едет вообще")["score"] < 1.0
    assert evaluate_text(q, "не знаю")["score"] == 0.0
    assert evaluate_text(q, GOOD_TEXT)["source"] == "demo_keywords"


# ---------- сам тест ----------
def test_questions_do_not_leak_answers(client):
    h = login_alex(client)
    state = client.post("/api/tests", json={"topic_id": kinematics_id(client, h)}, headers=h).json()
    assert state["status"] == "in_progress" and state["total"] == 8 and state["answered"] == 0
    assert set(state["question"]) == {"id", "number", "qtype", "difficulty", "text", "options", "unit", "graph"}


def test_adaptive_selection(client):
    h = login_alex(client)
    topic = kinematics_id(client, h)
    state, asked = run_test(client, h, topic, good)
    keys = [get_question(i).subtopic_key for i in asked]
    assert len(asked) == len(set(asked)) == 8                      # без повторов
    assert set(keys[:5]) == {"acceleration", "projectile_motion", "motion_graphs", "velocity", "vectors"}
    assert keys[0] == "acceleration"                               # самая слабая подтема (40%) — первой
    assert get_question(asked[0]).difficulty == 1                  # слабая подтема: начинаем с лёгкого
    # при верных ответах сложность в той же подтеме растёт
    for key in set(keys):
        diffs = [get_question(i).difficulty for i in asked if get_question(i).subtopic_key == key]
        assert diffs == sorted(diffs)

    # после ошибки в подтеме тест возвращается к ней (уточняющий вопрос)
    first_wrong = {"done": False}

    def decide(q):
        if not first_wrong["done"]:
            first_wrong["done"] = True
            return bad(q)
        return good(q)

    state, asked = run_test(client, h, topic, decide)
    assert get_question(asked[0]).subtopic_key == "acceleration"
    assert get_question(asked[5]).subtopic_key == "acceleration"   # 6-й вопрос — уточнение там, где была ошибка
    assert len(set(asked)) == 8


def test_full_flow_updates_profile(client):
    h = login_alex(client)
    topic = kinematics_id(client, h)
    before = {s["key"]: s["progress"] for t in client.get("/api/subjects", headers=h).json()[0]["topics"]
              for s in t["subtopics"]}
    state, asked = run_test(client, h, topic, lambda q: bad(q) if q.subtopic_key == "acceleration" else good(q))
    assert state["question"] is None and state["answered"] == 8
    r = client.post(f"/api/tests/{state['test_id']}/finish", headers=h).json()
    res = r["result"]
    assert r["status"] == "finished" and res["answered"] == 8 and res["incomplete"] is False
    by = {s["key"]: s for s in res["subtopics"]}
    acc = by["acceleration"]
    assert acc["accuracy"] == 0 and acc["mastery_after"] < acc["mastery_before"] == 0.4
    assert acc["misconceptions"] and "acceleration" in res["weak_subtopics"]
    assert by["vectors"]["accuracy"] == 1 and "vectors" not in res["weak_subtopics"]
    assert "Начните с подтем" in res["recommendation"]

    after = {s["key"]: s["progress"] for t in client.get("/api/subjects", headers=h).json()[0]["topics"]
             for s in t["subtopics"]}
    assert after["acceleration"]["mastery"] == acc["mastery_after"] < before["acceleration"]["mastery"]
    assert after["acceleration"]["tasks_done"] > before["acceleration"]["tasks_done"]
    assert "путает скорость и ускорение" in after["acceleration"]["difficulties"]       # прежнее сохранилось
    assert any("ускорен" in d for d in after["acceleration"]["difficulties"][1:])        # новое добавилось
    assert after["projectile_motion"]["assessed"] is True                               # появились первые данные
    overview = client.get("/api/profile/overview", headers=h).json()
    assert overview["needs_attention"][0]["name"] == "Ускорение"
    grades = client.get("/api/grades", headers=h).json()
    assert [g["score"] for g in grades if "скорость и ускорение" in g["title"]] == [8]  # школьные оценки не тронуты


def test_incomplete_and_double_finish(client):
    h = login_alex(client)
    topic = kinematics_id(client, h)
    empty = client.post("/api/tests", json={"topic_id": topic}, headers=h).json()
    assert client.post(f"/api/tests/{empty['test_id']}/finish", headers=h).status_code == 422   # нет ответов

    state, asked = run_test(client, h, topic, good, stop_after=2)
    res = client.post(f"/api/tests/{state['test_id']}/finish", headers=h).json()["result"]
    assert res["incomplete"] is True and res["answered"] == 2 and sum(s["total"] for s in res["subtopics"]) == 2
    assert client.post(f"/api/tests/{state['test_id']}/finish", headers=h).status_code == 409   # повторно нельзя
    open_id = state["question"]["id"]
    assert client.post(f"/api/tests/{state['test_id']}/answers", headers=h,
                       json={"question_id": open_id, "answer": "1"}).status_code == 409
    with SessionLocal() as s:                                     # второй finish не удвоил прогресс
        tasks = sum(p.tasks_done for p in s.query(SubtopicProgress).all())
    assert tasks == 10 + 10 + 10 + 8 + 0 + 2                      # данные демо-ученика + 2 ответа


def test_validation_and_privacy(client, register):
    h = login_alex(client)
    topic = kinematics_id(client, h)
    state = client.post("/api/tests", json={"topic_id": topic}, headers=h).json()
    url, qid = f"/api/tests/{state['test_id']}", state["question"]["id"]
    q = get_question(bank_id(qid))
    if q.qtype == "numeric":
        assert client.post(f"{url}/answers", headers=h, json={"question_id": qid, "answer": "много"}).status_code == 422
    else:
        assert client.post(f"{url}/answers", headers=h, json={"question_id": qid, "answer": "99"}).status_code == 422
    assert client.post(f"{url}/answers", headers=h, json={"question_id": qid, "answer": ""}).status_code == 422
    assert client.post(f"{url}/answers", headers=h, json={"question_id": 99999, "answer": "1"}).status_code == 404
    assert client.get("/api/tests/99999", headers=h).status_code == 404
    assert client.post("/api/tests", json={"topic_id": topic}).status_code == 401
    assert client.post("/api/tests", json={"topic_id": topic, "kind": "exam"}, headers=h).status_code == 422
    # неверный ответ формата не считается попыткой: можно исправить и отправить заново
    assert client.post(f"{url}/answers", headers=h, json={"question_id": qid, "answer": good(q)}).status_code == 200

    other = register("mallory")                                    # чужой ученик
    assert client.get(url, headers=other).status_code == 404
    assert client.post(f"{url}/answers", headers=other, json={"question_id": qid, "answer": "1"}).status_code == 404
    assert client.post(f"{url}/finish", headers=other).status_code == 404
    assert client.post("/api/tests", json={"topic_id": topic}, headers=other).status_code == 404


def test_topic_without_questions(client, auth):
    sid = client.post("/api/subjects", json={"name": "История"}, headers=auth).json()["id"]
    tree = client.post(f"/api/subjects/{sid}/topics", json={"name": "Средние века"}, headers=auth).json()
    tid = tree["topics"][0]["id"]
    client.post(f"/api/topics/{tid}/subtopics", json={"name": "Крестовые походы"}, headers=auth)
    assert client.post("/api/tests", json={"topic_id": tid}, headers=auth).status_code == 422


def test_post_lesson_uses_new_questions(client):
    h = login_alex(client)
    topic = kinematics_id(client, h)
    first, asked1 = run_test(client, h, topic, good)
    client.post(f"/api/tests/{first['test_id']}/finish", headers=h)
    second, asked2 = run_test(client, h, topic, good, kind="post_lesson")
    assert second["total"] == 5 and len(asked2) == 5
    assert not set(asked1) & set(asked2)                           # итоговый тест — другие вопросы
    res = client.post(f"/api/tests/{second['test_id']}/finish", headers=h).json()["result"]
    assert res["score"] == 1.0 and res["weak_subtopics"] == []
    assert res["recommendation"].startswith("Хороший результат")
    with SessionLocal() as s:
        assert s.query(StudentAnswer).count() == 13