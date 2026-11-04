"""Пароли и токены входа."""
from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _pwd.hash(password)          # в базе хранится только хеш, не пароль


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd.verify(password, password_hash)


def create_token(student_id: int) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": str(student_id), "exp": exp}, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> int | None:
    try:
        return int(jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])["sub"])
    except (JWTError, KeyError, ValueError):
        return None
