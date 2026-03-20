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

    # Google OAuth2
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    GOOGLE_REDIRECT_URI: str = Field(default="http://localhost:8000/auth/google/callback")
    GOOGLE_CLIENT_SECRETS_PATH: str = Field(default="./app/services/google/credentials/client_secret.json")
    GOOGLE_TOKEN_PATH: str = Field(default="./app/services/google/credentials/token.json")
    GOOGLE_DRIVE_FOLDER_NAME: str = Field(default="rpa-gov-data")


settings = Settings()