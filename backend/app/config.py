"""Настройки приложения. Читаются из переменных окружения / файла .env"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./cogniva.db"
    secret_key: str = "CHANGE_ME_IN_PRODUCTION"   # подпись токенов входа
    access_token_minutes: int = 60 * 24
    ai_provider: str = "anthropic"                 # anthropic | demo
    anthropic_api_key: str = ""                    # ВСТАВЬТЕ КЛЮЧ В .env (никогда во frontend)
    anthropic_model: str = "claude-sonnet-4-5"


settings = Settings()
