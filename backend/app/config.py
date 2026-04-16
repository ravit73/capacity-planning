from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/capacity_planning"

    model_config = {"env_file": ".env"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
