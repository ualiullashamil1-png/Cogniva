"""Зависимости FastAPI: кто сейчас вошёл в систему."""
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Student
from app.security import decode_token

_bearer = HTTPBearer(auto_error=False)


def current_student(creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
                    db: Session = Depends(get_db)) -> Student:
    sid = decode_token(creds.credentials) if creds else None
    student = db.get(Student, sid) if sid else None
    if not student:
        raise HTTPException(401, "Требуется вход в систему")
    return student
