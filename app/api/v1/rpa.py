"""Rotas v1 — RPA Portal da Transparência.

Registrar no app principal:
    from app.v1.rpa import router as rpa_router
    app.include_router(rpa_router, prefix="/v1/rpa", tags=["RPA"])
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.persona import PersonaResponse
from app.services.rpa.exceptions import (
    PersonNotFoundException,
    PortalTimeoutException,
)
from app.services.rpa.service import PersonaService

router = APIRouter()


def get_service() -> PersonaService:
    """Dependency injection — settings.RPA_* já são lidos no PersonaService.

    Para usar GCSStorage em produção, sobrescreva aqui:
        bucket = gcs.Client().bucket(settings.GCS_BUCKET)
        return PersonaService(storage=GCSStorage(bucket))
    """
    return PersonaService()


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
    summary="Consulta e persiste no storage configurado",
    responses={
        404: {"description": "Nenhum resultado encontrado"},
        504: {"description": "Timeout no portal"},
        502: {"description": "Falha ao persistir os arquivos"},
    },
)
def save_persona(
    termo: str,
    service: PersonaService = Depends(get_service),
) -> PersonaResponse:
    """Busca e salva person.json + screenshot no storage (local ou GCS)."""
    try:
        response, _ = service.fetch_and_save(termo)
        return response
    except PersonNotFoundException as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PortalTimeoutException as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc))
