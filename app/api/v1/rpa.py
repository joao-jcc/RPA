"""Rotas v1 — RPA Portal da Transparência."""
from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.schemas.persona import PersonaResponse
from app.services.jobs import JobStatus, Stage, job_manager
from app.services.rpa.exceptions import PersonNotFoundException

router = APIRouter()


@router.get(
    "/persona/{termo}",
    response_model=PersonaResponse,
    summary="Consulta pessoa no Portal da Transparência (síncrono)",
)
def get_persona(termo: str) -> PersonaResponse:
    """Busca e retorna dados sem salvar. Bloqueia até concluir."""
    from app.services.rpa.service import PersonaService
    from app.services.rpa.exceptions import PortalTimeoutException

    try:
        return PersonaService().fetch(termo)
    except PersonNotFoundException as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PortalTimeoutException as exc:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(exc))


@router.post(
    "/persona/{termo}/save",
    summary="Inicia job de scraping + save no Drive",
    status_code=status.HTTP_202_ACCEPTED,
)
def save_persona(termo: str) -> dict:
    """Cria um job em background e retorna o job_id imediatamente.

    Acompanhe o progresso em GET /rpa/jobs/{job_id}/stream
    """
    job_id = job_manager.submit(termo)
    return {
        "job_id": job_id,
        "stream_url": f"/api/v1/rpa/jobs/{job_id}/stream",
        "status_url": f"/api/v1/rpa/jobs/{job_id}",
    }


@router.get(
    "/jobs/{job_id}",
    summary="Status atual do job",
)
def get_job(job_id: str) -> dict:
    """Retorna o status e resultado do job."""
    job = job_manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")

    response = {
        "job_id": job.job_id,
        "termo": job.termo,
        "status": job.status,
    }
    if job.status == JobStatus.DONE and job.result:
        response["data"] = job.result.model_dump()
    if job.status == JobStatus.FAILED:
        response["error"] = job.error

    return response


@router.get(
    "/jobs/{job_id}/stream",
    summary="Stream de eventos SSE do job",
)
def stream_job(job_id: str) -> StreamingResponse:
    """Server-Sent Events — emite eventos de progresso em tempo real.

    Exemplo de consumo no frontend:
        const source = new EventSource('/api/v1/rpa/jobs/{job_id}/stream')
        source.onmessage = (e) => console.log(JSON.parse(e.data))
    """
    job = job_manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")

    def event_stream():
        # Keepalive imediato — garante que a conexão não fecha por buffering
        yield ": keepalive\n\n"
        for event in job_manager.stream(job_id):
            payload = json.dumps({
                "stage":   event.stage,
                "message": event.message,
                **event.data,
            }, ensure_ascii=False)
            yield f"data: {payload}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )