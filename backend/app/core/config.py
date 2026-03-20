from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Aponta para o folder backend/ — funciona independente de onde o uvicorn é chamado
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
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
    RPA_DOWNLOADS_DIR: str = Field(
        default=str(BASE_DIR / "app/services/rpa/downloads")
    )

    # Google OAuth2
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    GOOGLE_REDIRECT_URI: str = Field(default="http://localhost:8000/auth/google/callback")
    GOOGLE_CLIENT_SECRETS_PATH: str = Field(
        default=str(BASE_DIR / "app/services/google/credentials/client_secret.json")
    )
    GOOGLE_TOKEN_PATH: str = Field(
        default=str(BASE_DIR / "app/services/google/credentials/token.json")
    )
    GOOGLE_DRIVE_FOLDER_NAME: str = Field(default="rpa-gov-data")


settings = Settings()