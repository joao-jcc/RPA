from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env"),
        extra="forbid",
    )

    # Application
    PROJECT_NAME: str
    DESCRIPTION: str
    VERSION: str
    API_PREFIX: str
    ENVIRONMENT: Literal["local", "prod"]

    # RPA
    RPA_HEADLESS: bool = Field(default=True)
    RPA_DOWNLOADS_DIR: str = Field(default="./app/services/rpa/downloads")


settings = Settings()
