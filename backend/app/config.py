from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/capacity_planning"

    # Azure AD / Microsoft Entra ID
    azure_tenant_id: str = ""
    azure_client_id: str = ""

    # Set to false to disable auth (local development)
    auth_enabled: bool = True

    # CORS allowed origins
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
