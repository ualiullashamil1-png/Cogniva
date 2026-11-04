"""API сцен: каталог и построение сцены по описанию."""
from fastapi import APIRouter, Body, Depends, HTTPException

from app.database.models import Student
from app.deps import current_student
from app.scenes.scene_service import build_scene, catalog
from app.scenes.scene_validator import SceneError

router = APIRouter(prefix="/api/scenes", tags=["scenes"])


@router.get("/catalog")
def get_catalog(student: Student = Depends(current_student)):
    return catalog()


@router.post("/build")
def build(spec: dict = Body(...), student: Student = Depends(current_student)):
    try:
        return build_scene(spec)
    except SceneError as e:
        raise HTTPException(422, str(e))