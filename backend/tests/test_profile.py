from fastapi.testclient import TestClient

from app.database.connection import engine
from app.database.models import GradeRecord, Student, SubtopicProgress
from app.learning.knowledge_model import update_mastery
from app.main import app
from app.seed import seed_demo


def build_physics(client, auth):
    sid = client.post("/api/subjects", json={"name": "Физика"}, headers=auth).json()["id"]
    tree = client.post(f"/api/subjects/{sid}/topics", json={"name": "Кинематика"}, headers=auth).json()
    tid = tree["topics"][0]["id"]
    sub = client.post(f"/api/topics/{tid}/subtopics", headers=auth, json={
        "name": "Движение под углом", "description": "Влияние угла и скорости"}).json()
    return sid, tid, sub["id"]


# ---------- вход ----------
def test_register_login_me(client):
    r = client.post("/api/auth/register", json={"username": "Alex", "password": "secret123", "display_name": "Алекс"})
    assert r.status_code == 201 and r.json()["student"]["username"] == "alex"
    token = client.post("/api/auth/login", json={"username": "ALEX", "password": "secret123"}).json()["access_token"]
    assert client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).json()["display_name"] == "Алекс"


def test_bad_logins(client, auth):
    assert client.post("/api/auth/register", json={"username": "alex", "password": "secret123",
                                                   "display_name": "X"}).status_code == 409
    assert client.post("/api/auth/login", json={"username": "alex", "password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "nobody", "password": "secret123"}).status_code == 401
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    assert client.post("/api/auth/register", json={"username": "bob", "password": "123",
                                                   "display_name": "B"}).status_code == 422


def test_password_is_hashed(client, auth, db):
    s = db.query(Student).filter_by(username="alex").one()
    assert "secret123" not in s.password_hash and s.password_hash.startswith("$2")


# ---------- предметы / темы / подтемы ----------
def test_hierarchy(client, auth):
    sid, tid, sub_id = build_physics(client, auth)
    tree = client.get("/api/subjects", headers=auth).json()
    st = tree[0]["topics"][0]["subtopics"][0]
    assert tree[0]["name"] == "Физика" and st["name"] == "Движение под углом"
    assert st["description"] == "Влияние угла и скорости" and st["key"] == f"custom_{sub_id}"
    assert st["progress"]["assessed"] is False and st["progress"]["mastery"] is None  # ещё нет данных


def test_duplicates_and_validation(client, auth):
    sid, tid, _ = build_physics(client, auth)
    assert client.post("/api/subjects", json={"name": "Физика"}, headers=auth).status_code == 409
    assert client.post(f"/api/subjects/{sid}/topics", json={"name": "Кинематика"}, headers=auth).status_code == 409
    assert client.post("/api/subjects", json={"name": "   "}, headers=auth).status_code == 422
    assert client.post(f"/api/topics/{tid}/subtopics", json={"name": "A", "key": "Bad Key!"},
                       headers=auth).status_code == 422


# ---------- оценки ----------
def test_grades_crud_and_validation(client, auth):
    sid, _, sub_id = build_physics(client, auth)
    g = client.post("/api/grades", headers=auth, json={"subject_id": sid, "subtopic_id": sub_id, "score": 8,
                                                      "max_score": 10, "title": "Тест"})
    assert g.status_code == 201 and g.json()["percent"] == 80.0
    gid = g.json()["id"]
    assert client.post("/api/grades", headers=auth, json={"subject_id": sid, "score": 11}).status_code == 422
    assert client.post("/api/grades", headers=auth, json={"subject_id": sid, "score": -1}).status_code == 422
    assert client.patch(f"/api/grades/{gid}", headers=auth, json={"score": 9}).json()["score"] == 9
    assert client.patch(f"/api/grades/{gid}", headers=auth, json={"score": 99}).status_code == 422
    assert len(client.get(f"/api/grades?subject_id={sid}", headers=auth).json()) == 1
    assert client.delete(f"/api/grades/{gid}", headers=auth).status_code == 204
    assert client.get("/api/grades", headers=auth).json() == []


def test_subtopic_must_match_subject(client, auth):
    _, _, sub_id = build_physics(client, auth)
    other = client.post("/api/subjects", json={"name": "Химия"}, headers=auth).json()["id"]
    assert client.post("/api/grades", headers=auth, json={"subject_id": other, "subtopic_id": sub_id,
                                                         "score": 5}).status_code == 422


def test_grade_does_not_change_mastery(client, auth, db):
    sid, _, sub_id = build_physics(client, auth)
    before = db.query(SubtopicProgress).filter_by(subtopic_id=sub_id).one().mastery
    client.post("/api/grades", headers=auth, json={"subject_id": sid, "subtopic_id": sub_id, "score": 10})
    db.expire_all()
    p = db.query(SubtopicProgress).filter_by(subtopic_id=sub_id).one()
    assert p.mastery == before and p.tasks_done == 0


# ---------- приватность ----------
def test_students_cannot_see_each_other(client, register):
    a, b = register("alice"), register("bob")
    sid, tid, sub_id = build_physics(client, a)
    gid = client.post("/api/grades", headers=a, json={"subject_id": sid, "score": 7}).json()["id"]
    assert client.get("/api/subjects", headers=b).json() == []
    assert client.get("/api/grades", headers=b).json() == []
    assert client.post(f"/api/subjects/{sid}/topics", json={"name": "X"}, headers=b).status_code == 404
    assert client.post(f"/api/topics/{tid}/subtopics", json={"name": "X"}, headers=b).status_code == 404
    assert client.post("/api/grades", headers=b, json={"subject_id": sid, "score": 5}).status_code == 404
    assert client.post("/api/grades", headers=b, json={"subject_id": client.post(
        "/api/subjects", json={"name": "Своё"}, headers=b).json()["id"], "subtopic_id": sub_id,
        "score": 5}).status_code == 404
    assert client.patch(f"/api/grades/{gid}", headers=b, json={"score": 1}).status_code == 404
    assert client.delete(f"/api/grades/{gid}", headers=b).status_code == 404
    assert client.get("/api/profile/overview", headers=b).json()["grade_history"] == []


# ---------- сохранение данных ----------
def test_data_survives_restart(client, auth):
    sid, _, _ = build_physics(client, auth)
    client.post("/api/grades", headers=auth, json={"subject_id": sid, "score": 8, "title": "Тест"})
    engine.dispose()                        # «закрыли приложение»: все соединения закрыты
    with TestClient(app) as new_client:     # «открыли снова»: новый запуск, те же файлы базы
        token = new_client.post("/api/auth/login", json={"username": "alex", "password": "secret123"}).json()
        h = {"Authorization": f"Bearer {token['access_token']}"}
        assert new_client.get("/api/subjects", headers=h).json()[0]["name"] == "Физика"
        assert new_client.get("/api/grades", headers=h).json()[0]["title"] == "Тест"


# ---------- модель знаний ----------
def test_update_mastery_from_evidence(db):
    p = SubtopicProgress(student_id=1, subtopic_id=1, mastery=0.5, tasks_done=0, correct=0, incorrect=0)
    assert update_mastery(p, 3, 4) == 0.7                       # (1*0.5 + 4*0.75) / 5
    assert (p.tasks_done, p.correct, p.incorrect) == (4, 3, 1) and p.last_assessed is not None
    low = update_mastery(p, 0, 4)                               # провал снижает оценку
    assert low < 0.7 and 0 <= low <= 1
    p2 = SubtopicProgress(student_id=1, subtopic_id=2, mastery=0.9, tasks_done=10, correct=9, incorrect=1)
    assert update_mastery(p2, 4, 4) > 0.9
    import pytest
    with pytest.raises(ValueError):
        update_mastery(p, 5, 4)
    with pytest.raises(ValueError):
        update_mastery(p, 0, 0)


# ---------- сводка и демо-данные ----------
def test_overview_and_demo_seed(client, db):
    seed_demo(db); seed_demo(db)            # повторный запуск ничего не дублирует
    assert db.query(Student).count() == 1
    h = {"Authorization": "Bearer " + client.post("/api/auth/login", json={
        "username": "alex", "password": "demo12345"}).json()["access_token"]}
    o = client.get("/api/profile/overview", headers=h).json()
    assert o["student"]["display_name"] == "Алекс"
    assert [s["name"] for s in o["subjects"]] == ["Физика", "Математика"]
    assert o["needs_attention"][0]["name"] == "Ускорение" and o["needs_attention"][0]["mastery"] == 0.4
    assert o["strongest"][0]["name"] == "Векторы"
    physics = o["subjects"][0]
    assert physics["avg_grade_percent"] == 80.0 and physics["assessed_subtopics"] == 4
    # оценка 8/10 по «Ускорению» и освоение 40% — независимые величины
    acc = [g for g in db.query(GradeRecord).all() if g.title.startswith("Тест: скорость")][0]
    assert acc.score == 8
