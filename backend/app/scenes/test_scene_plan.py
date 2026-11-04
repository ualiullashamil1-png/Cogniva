import json

import pytest

from app.ai import planner
from app.scenes.scene_planner import (DEMO_SCENES, demo_scene_spec, sanitize_spec, scene_for_plan,
                                      scene_instructions)
from app.scenes.scene_service import build_scene

ACC = {"subtopics": [
    {"key": "acceleration", "name": "Ускорение", "mastery": 0.4, "misconception_keys": []},
    {"key": "vectors", "name": "Векторы", "mastery": 0.9, "misconception_keys": []}]}
VEC = {"subtopics": [
    {"key": "vectors", "name": "Векторы", "mastery": 0.3, "misconception_keys": []},
    {"key": "acceleration", "name": "Ускорение", "mastery": 0.8, "misconception_keys": []}]}


class FakeAI:
    name, model = "fake", "fake"

    def __init__(self, scene):
        self.scene = scene

    def complete(self, system, messages, max_tokens=1500):
        assert "scene_spec" in system                      # инструкция про сцену дошла до ИИ
        plan = {"focus_subtopics": ["acceleration"], "approaches": ["visual"], "rationale": "тест",
                "steps": [{"title": "а", "content": "б", "approach": "visual"},
                          {"title": "в", "content": "г", "approach": "mathematical"}],
                "checkpoints": [{"question": "?", "hint": ""}],
                "scene_hint": "uniform_acceleration", "scene_spec": self.scene}
        return "```json\n" + json.dumps(plan) + "\n```"


@pytest.fixture
def ai(monkeypatch):
    def use(scene):
        monkeypatch.setattr(planner.provider, "get_provider", lambda: FakeAI(scene))
        monkeypatch.setattr(planner, "planner_prompt", lambda c, s: "контекст")
    return use


@pytest.fixture
def demo(monkeypatch):
    monkeypatch.setattr(planner.provider, "get_provider", lambda: None)


def test_demo_scene_matches_weak_subtopic(demo):
    plan, mode, _ = planner.build_plan(ACC)
    scene = scene_for_plan(plan)
    assert mode == "demo" and scene["template_id"] == "uniform_acceleration"
    assert scene["object"]["id"] == "minecart" and scene["notices"] == []
    assert {"velocity_vector", "acceleration_vector"} <= set(scene["components"])


def test_demo_vectors_scene_has_components(demo):
    plan, _, _ = planner.build_plan(VEC)
    scene = scene_for_plan(plan)
    assert scene["template_id"] == "projectile_motion" and "velocity_components" in scene["components"]
    assert scene["physics"]["summary"]["range"] > 0


def test_all_demo_scenes_are_valid():
    for key in DEMO_SCENES:
        assert build_scene(demo_scene_spec(key))["notices"] == []


def test_ai_scene_is_sanitized(ai):
    ai({"template_id": "uniform_acceleration", "script": "alert(1)",
        "entities": [{"role": "moving_object", "asset_id": "dragon"}],
        "components": ["velocity_vector"], "parameters": {"a": 3}})
    plan, mode, _ = planner.build_plan(ACC)
    assert mode == "ai" and "script" not in json.dumps(plan["scene_spec"])
    scene = scene_for_plan(plan)
    assert scene["object"]["id"] == "sphere" and scene["notices"] and scene["parameters"]["a"] == 3


def test_ai_bad_scene_falls_back(ai):
    for bad in ({"template_id": "nope"}, {"template_id": "projectile_motion", "parameters": {"v0": 999}},
                "не объект", None):
        ai(bad)
        plan, mode, _ = planner.build_plan(ACC)
        assert mode == "ai" and plan["scene_spec"]["template_id"] == "uniform_acceleration"
        assert plan["scene_spec"]["entities"][0]["asset_id"] == "minecart"


def test_old_plan_without_scene_spec():
    assert scene_for_plan({"scene_hint": "linear_motion"})["template_id"] == "linear_motion"
    assert scene_for_plan({})["template_id"] == "projectile_motion"
    assert sanitize_spec({"template_id": "nope"}) is None


def test_instructions_list_only_real_ids():
    text = scene_instructions()
    assert "projectile_motion" in text and "minecart" in text and "velocity_components" in text