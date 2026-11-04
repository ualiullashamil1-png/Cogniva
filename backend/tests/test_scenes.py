import json

import pytest

from app.physics import projectile_motion as pm
from app.scenes.scene_service import build_scene, catalog, default_scene
from app.scenes.scene_validator import SceneError


def spec(template="uniform_acceleration", asset="sphere", **extra):
    d = {"template_id": template, "entities": [{"role": "moving_object", "asset_id": asset}]}
    d.update(extra)
    return d


def test_catalog_contents():
    c = catalog()
    assert {t["id"] for t in c["templates"]} == {"linear_motion", "uniform_acceleration", "projectile_motion"}
    assert {o["id"] for o in c["objects"]} >= {"sphere", "ball", "cube", "cylinder", "pyramid", "minecart",
                                               "car", "train", "rocket", "human"}
    assert "velocity_vector" in {x["id"] for x in c["components"]}


def test_object_swap_keeps_math():
    params = {"v0": 5, "a": 2, "time": 4}
    base = build_scene(spec(asset="sphere", parameters=params))
    assert base["physics"]["state"]["v"] == pytest.approx(13) and base["physics"]["state"]["x"] == pytest.approx(36)
    for asset in ("minecart", "car", "train", "rocket", "human", "cube"):
        other = build_scene(spec(asset=asset, parameters=params))
        assert other["object"]["id"] == asset and other["notices"] == []
        assert other["physics"] == base["physics"]                     # формулы и числа не изменились


def test_incompatible_object_substituted():
    params = {"v0": 30, "angle_deg": 30, "g": 10}
    ball = build_scene(spec("projectile_motion", "ball", parameters=params))
    cart = build_scene(spec("projectile_motion", "minecart", parameters=params))
    assert cart["object"]["id"] == "ball" and cart["notices"] and "Вагонетка" in cart["notices"][0]
    assert cart["physics"] == ball["physics"]


def test_unknown_object_and_template():
    s = build_scene(spec(asset="dragon"))
    assert s["object"]["id"] == "sphere" and "dragon" in s["notices"][0]
    with pytest.raises(SceneError):
        build_scene(spec(template="quantum_gravity"))
    with pytest.raises(SceneError):
        build_scene("не объект")
    with pytest.raises(SceneError):
        build_scene({"template_id": "projectile_motion", "components": [1, 2]})


def test_components_filtered_and_removed():
    full = build_scene(spec(components=["coordinate_axes", "velocity_vector", "acceleration_vector", "trajectory"]))
    assert full["components"] == ["coordinate_axes", "velocity_vector", "acceleration_vector", "trajectory"]
    without = build_scene(spec(components=["coordinate_axes", "trajectory"]))
    assert "velocity_vector" not in without["components"]
    lin = build_scene(spec("linear_motion", components=["acceleration_vector", "magic_wand", "velocity_vector"]))
    assert lin["components"] == ["velocity_vector"] and len(lin["notices"]) == 2
    assert build_scene(spec())["components"] == ["coordinate_axes", "velocity_vector", "trajectory"]  # по умолчанию


def test_defaults_and_unknown_params():
    s = build_scene({"template_id": "projectile_motion", "parameters": {"speed_of_light": 3}})
    assert s["parameters"] == {"v0": 20, "angle_deg": 45, "h0": 0, "g": 9.81, "time": 1}
    assert s["object"]["id"] == "ball" and len(s["notices"]) == 1
    assert {p["key"] for p in s["parameter_specs"]} == set(s["parameters"])
    assert "change_v0" in s["interactions"] and "toggle_vectors" in s["interactions"]


def test_parameter_change_updates_physics():
    a = build_scene(spec("projectile_motion", parameters={"v0": 20, "angle_deg": 45}))
    b = build_scene(spec("projectile_motion", parameters={"v0": 30, "angle_deg": 45}))
    assert b["physics"]["summary"]["range"] > a["physics"]["summary"]["range"]
    assert len(a["physics"]["trajectory"]) == 101 and a["physics"]["trajectory"][-1]["y"] == 0
    assert a["physics"]["assumptions"]


def test_invalid_parameters_rejected():
    for bad in ("fast", True, None, 1e9, -5):
        with pytest.raises(SceneError):
            build_scene(spec("projectile_motion", parameters={"v0": bad}))
    with pytest.raises(SceneError):
        build_scene(spec("projectile_motion", parameters={"angle_deg": 95}))
    with pytest.raises(SceneError):
        build_scene(spec(parameters={"time": 99}))


def test_extra_fields_ignored():
    out = build_scene(spec(script="alert(1)", code="import os"))
    assert "alert" not in json.dumps(out) and "import os" not in json.dumps(out)


def test_projectile_values_and_model_note():
    s = build_scene(spec("projectile_motion", "ball", physics_model="relativity", parameters={
        "v0": 30, "angle_deg": 30, "h0": 0, "g": 10, "time": 3}))
    assert s["physics"]["summary"]["flight_time"] == pytest.approx(3)
    assert s["physics"]["state"]["landed"] is True
    assert s["physics_model"] == "ideal_projectile" and "Физическая модель" in s["notices"][0]
    assert s["physics"]["summary"] == pm.summary(pm.ProjectileParams(30, 30, 0, 10))


def test_default_scene():
    assert default_scene("uniform_acceleration")["template_id"] == "uniform_acceleration"
    assert default_scene("мусор")["template_id"] == "projectile_motion"
    assert default_scene()["notices"] == []


def test_api(client, auth):
    assert client.get("/api/scenes/catalog").status_code == 401
    assert client.post("/api/scenes/build", json=spec()).status_code == 401
    assert len(client.get("/api/scenes/catalog", headers=auth).json()["templates"]) == 3
    ok = client.post("/api/scenes/build", json=spec(asset="minecart"), headers=auth)
    assert ok.status_code == 200 and ok.json()["object"]["id"] == "minecart"
    assert client.post("/api/scenes/build", json=spec(template="nope"), headers=auth).status_code == 422
    assert client.post("/api/scenes/build", json=spec("projectile_motion", parameters={"v0": 999}),
                       headers=auth).status_code == 422
    assert client.post("/api/scenes/build", json=[1, 2], headers=auth).status_code == 422