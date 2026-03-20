"""Rota de autenticação Google OAuth2.

Deve ser chamada UMA VEZ antes de usar o /save.
Abre o browser do usuário para autorizar acesso ao Drive.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.services.google.auth import get_credentials, revoke_credentials

router = APIRouter()


@router.get(
    "/google",
    summary="Autoriza acesso ao Google Drive",
    description=(
        "Abre o browser para autorização OAuth2. "
        "Deve ser chamado uma vez antes de usar o endpoint /save. "
        "Após autorizar, o token é salvo localmente e não precisa ser feito novamente."
    ),
)
def authorize_google() -> dict:
    """Abre o browser para o usuário autorizar o acesso ao Drive."""
    credentials = get_credentials(authorize_if_missing=True)
    return {
        "status": "authorized",
        "message": "Google Drive autorizado com sucesso. Pode usar o endpoint /save agora.",
        "scopes": list(credentials.scopes or []),
    }


@router.get(
    "/google/status",
    summary="Verifica se o Google Drive está autorizado",
)
def google_status() -> dict:
    """Retorna se o token existe e é válido — sem abrir browser."""
    try:
        get_credentials(authorize_if_missing=False)
        return {"authorized": True}
    except RuntimeError as exc:
        return {"authorized": False, "reason": str(exc)}
    except Exception as exc:
        return {"authorized": False, "reason": f"Token inválido: {exc}"}


@router.delete(
    "/google",
    summary="Revoga autorização do Google Drive",
    description="Remove o token salvo. Próxima chamada ao /save exigirá nova autorização.",
)
def revoke_google() -> dict:
    """Remove o token salvo localmente."""
    revoke_credentials()
    return {
        "status": "revoked",
        "message": "Token removido. Chame GET /auth/google para autorizar novamente.",
    }