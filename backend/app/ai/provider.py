"""Слой ИИ-провайдера. Остальной код не знает, какой именно ИИ подключён.
Чтобы добавить другой ИИ (Groq, OpenAI...), напишите ещё один класс с методом complete()
и добавьте его в get_provider()."""
import json
import os
import re
from abc import ABC, abstractmethod
from typing import Optional

try:                                    # читаем ключ из файла .env (если он есть)
    from dotenv import find_dotenv, load_dotenv
    load_dotenv(find_dotenv(usecwd=True))
except ImportError:
    pass


class AIUnavailable(Exception):
    """ИИ недоступен (нет сети, неверный ключ, превышен лимит и т. д.)."""


class AIProvider(ABC):
    name: str
    model: str

    @abstractmethod
    def complete(self, system: str, messages: list[dict], max_tokens: int = 1500) -> str:
        """messages: [{'role': 'user'|'assistant', 'content': '...'}]. Возвращает текст ответа."""


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str):
        self.model = model
        self._key = api_key

    def complete(self, system: str, messages: list[dict], max_tokens: int = 1500) -> str:
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "model" if m["role"] == "assistant" else "user",
                          "parts": [{"text": m["content"]}]} for m in messages],
            # «думающие» модели тратят часть лимита на размышления, поэтому берём запас x4
            "generationConfig": {"maxOutputTokens": max_tokens * 4},
        }
        try:
            r = httpx.post(url, headers={"x-goog-api-key": self._key}, json=body, timeout=30.0)
            r.raise_for_status()
            parts = r.json()["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts)
        except Exception as e:           # сеть, ключ, лимит, неожиданный ответ -> единый тип ошибки
            raise AIUnavailable(type(e).__name__) from e
        if not text.strip():
            raise AIUnavailable("EmptyResponse")
        return text


def get_provider() -> Optional[AIProvider]:
    """None = ключа нет, работаем в демо-режиме."""
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key or key.lower().startswith("your"):
        return None
    return GeminiProvider(key, os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"))


def parse_json_object(text: str) -> dict:
    """Достаёт JSON из ответа ИИ (даже если он обернул его в ```json ... ```)."""
    t = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    start, end = t.find("{"), t.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("В ответе ИИ нет JSON")
    return json.loads(t[start:end + 1])      # JSONDecodeError — подвид ValueError