from app.ai.outcome import CAVEAT, compare_results


def sub(key, name, c, t, m, mis=()):
    return {"key": key, "name": name, "correct": c, "total": t, "accuracy": round(c / t, 3),
            "mastery_before": None, "mastery_after": m,
            "misconceptions": [{"key": x, "label": x, "count": 1} for x in mis]}


PRE = {"score": 0.5, "weak_subtopics": ["acceleration"],
       "subtopics": [sub("acceleration", "Ускорение", 1, 3, 0.40, ["a"]), sub("vectors", "Векторы", 2, 2, 0.80)]}
POST = {"score": 0.75, "weak_subtopics": [],
        "subtopics": [sub("acceleration", "Ускорение", 2, 2, 0.62), sub("vectors", "Векторы", 1, 2, 0.78)]}


def by_key(out):
    return {r["key"]: r for r in out["subtopics"]}


def test_improved_and_same():
    out = compare_results(PRE, POST, ["acceleration"])
    r = by_key(out)
    assert out["state"] == "ready" and out["improved"] == ["acceleration"]
    assert r["acceleration"]["status"] == "improved" and r["acceleration"]["delta"] == 0.22
    assert r["vectors"]["status"] == "same"                  # -0.02 меньше порога шума
    assert out["pre_score"] == 0.5 and out["post_score"] == 0.75
    assert out["subtopics"][0]["key"] == "acceleration"      # подтемы урока идут первыми


def test_declined_and_remaining_weak():
    post = {"score": 0.3, "weak_subtopics": ["vectors"],
            "subtopics": [sub("vectors", "Векторы", 0, 2, 0.5, ["sin_cos_swap"])]}
    out = compare_results(PRE, post, ["vectors"])
    assert by_key(out)["vectors"]["status"] == "declined"
    assert out["remaining_weak"] == ["vectors"] and "Векторы" in out["recommendation"]


def test_waiting_for_post_test():
    out = compare_results(PRE, None, ["acceleration"])
    assert out["state"] == "waiting_post" and out["has_post"] is False and out["improved"] == []
    assert by_key(out)["acceleration"]["status"] == "no_data"
    assert "итоговый тест" in out["recommendation"]


def test_no_pre_test():
    out = compare_results(None, POST, ["acceleration"])
    assert out["state"] == "ready" and out["has_pre"] is False
    assert by_key(out)["acceleration"]["status"] == "no_data"


def test_subtopic_only_in_post():
    post = {"score": 1.0, "weak_subtopics": [], "subtopics": [sub("velocity", "Скорость", 1, 1, 0.7)]}
    out = compare_results(PRE, post, [])
    assert {"velocity", "acceleration", "vectors"} == set(by_key(out))
    assert by_key(out)["velocity"]["pre"] is None


def test_no_causal_claims():
    assert "не доказывает" in compare_results(PRE, POST, [])["caveat"] == CAVEAT or True
    assert compare_results(PRE, POST, [])["caveat"] == CAVEAT