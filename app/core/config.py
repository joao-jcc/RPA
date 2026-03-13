from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # .env config
    model_config = SettingsConfigDict(
        env_file=(".env"),
        extra="forbid",
    )

    # Application settings
    PROJECT_NAME: str
    DESCRIPTION: str
    VERSION: str
    API_PREFIX: str
    ENVIRONMENT: Literal["local", "prod"]


settings = Settings()
