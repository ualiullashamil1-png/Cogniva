from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Student
from app.curriculum import ensure_curriculum
from app.deps import current_student
from app.schemas import LoginIn, RegisterIn, StudentOut, TokenOut
from app.security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/auth/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(Student).filter_by(username=data.username.lower()).first():
        raise HTTPException(409, "Такой логин уже занят")
    s = Student(username=data.username.lower(), password_hash=hash_password(data.password),
                display_name=data.display_name, grade_level=data.grade_level)
    db.add(s); db.commit()
    ensure_curriculum(db, s)
    return TokenOut(access_token=create_token(s.id), student=s)


@router.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    s = db.query(Student).filter_by(username=data.username.lower()).first()
    if not s or not verify_password(data.password, s.password_hash):
        raise HTTPException(401, "Неверный логин или пароль")
    ensure_curriculum(db, s)
    return TokenOut(access_token=create_token(s.id), student=s)


@router.get("/me", response_model=StudentOut)
def me(student: Student = Depends(current_student)):
    return student
