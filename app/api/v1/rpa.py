"""Rotas v1 — RPA Portal da Transparência."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.persona import PersonaResponse
from app.services.google.drive_storage import GoogleDriveStorage
from app.services.rpa.exceptions import (
    DownloadFailedException,
    PersonNotFoundException,
    PortalTimeoutException,
)
from app.services.rpa.service import PersonaService

router = APIRouter()


def get_service() -> PersonaService:
    """Token único por instalação — sem CPF, sem login."""
    return PersonaService(storage=GoogleDriveStorage())


@router.get(
    "/persona/{termo}",
    response_model=PersonaResponse,
    summary="Consulta pessoa no Portal da Transparência",
    responses={
        404: {"description": "Nenhum resultado encontrado"},
        504: {"description": "Timeout no portal"},
    },
)
def get_persona(
    termo: str,
    service: PersonaService = Depends(get_service),
) -> PersonaResponse:
    """Busca por CPF, NIS ou nome e retorna os dados de recebimentos."""
    try:
        return service.fetch(termo)
    except PersonNotFoundException as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PortalTimeoutException as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc))


@router.post(
    "/persona/{termo}/save",
    response_model=PersonaResponse,
    summary="Consulta e salva no Google Drive do usuário",
    responses={
        404: {"description": "Nenhum resultado encontrado"},
        504: {"description": "Timeout no portal"},
        502: {"description": "Falha ao salvar no Drive"},
    },
)
def save_persona(
    termo: str,
    service: PersonaService = Depends(get_service),
) -> PersonaResponse:
    """Busca e salva person.json + screenshot no Google Drive.

    Na primeira execução desta instalação, abre o browser para autorização OAuth2.
    Nas seguintes, usa o token salvo silenciosamente.
    """
    try:
        response, _ = service.fetch_and_save(termo)
        return response
    except PersonNotFoundException as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PortalTimeoutException as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc))
    except DownloadFailedException as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))