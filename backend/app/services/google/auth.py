"""Gerenciamento do token OAuth2 do Google — token único por instalação.

Fluxo:
  1. get_credentials() tenta carregar credentials/token.json
  2. Se não existe ou expirou sem refresh → abre browser para autorização
  3. Token salvo em GOOGLE_TOKEN_PATH
  4. Próximas chamadas carregam o token silenciosamente

Dependências:
    uv add google-auth google-auth-oauthlib google-api-python-client
"""
from __future__ import annotations

from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from app.core import settings

# Escopo mínimo — acesso apenas a arquivos criados pelo próprio app
_SCOPES = ["https://www.googleapis.com/auth/drive.file"]


def get_credentials(authorize_if_missing: bool = False) -> Credentials:
    """Retorna credenciais válidas para o usuário desta instalação.

    - Token existente e válido     → retorna direto
    - Token expirado com refresh   → renova silenciosamente
    - Sem token + authorize=True   → abre browser para autorização
    - Sem token + authorize=False  → levanta erro claro

    Args:
        authorize_if_missing: se True, abre o browser quando não há token.
                              Use True apenas na rota GET /auth/google.
    """
    token_path = Path(settings.GOOGLE_TOKEN_PATH)
    credentials: Credentials | None = None

    # Carrega token existente
    if token_path.exists():
        credentials = Credentials.from_authorized_user_file(
            str(token_path), _SCOPES
        )

    # Renova se expirado
    if credentials and credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
        _save_token(token_path, credentials)
        return credentials

    # Token válido — retorna direto
    if credentials and credentials.valid:
        return credentials

    # Sem token válido
    if not authorize_if_missing:
        raise RuntimeError(
            "Google Drive não autorizado. "
            "Acesse GET /api/v1/auth/google primeiro para autorizar."
        )

    # Abre browser para autorização
    credentials = _authorize_via_browser()
    _save_token(token_path, credentials)
    return credentials


def revoke_credentials() -> None:
    """Remove o token salvo — próxima execução abrirá o browser novamente."""
    token_path = Path(settings.GOOGLE_TOKEN_PATH)
    if token_path.exists():
        token_path.unlink()


def _authorize_via_browser() -> Credentials:
    """Abre o browser do usuário para autorizar acesso ao Drive.

    port=0 deixa o SO escolher uma porta livre automaticamente.
    access_type='offline' garante refresh_token para renovação silenciosa.
    """
    flow = InstalledAppFlow.from_client_secrets_file(
        settings.GOOGLE_CLIENT_SECRETS_PATH,
        scopes=_SCOPES,
    )
    return flow.run_local_server(
        port=0,
        prompt="consent",
        access_type="offline",
    )


def _save_token(path: Path, credentials: Credentials) -> None:
    """Persiste o token em disco para reutilização futura."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(credentials.to_json(), encoding="utf-8")