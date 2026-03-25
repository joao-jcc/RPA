"""Modelos do sistema de jobs — estado e eventos de progresso."""
from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from queue import Empty, Queue
from typing import Any

from pydantic import BaseModel, Field


class Stage(str, Enum):
    SEARCHING     = "searching"
    FOUND         = "found"
    EXTRACTING    = "extracting"
    OPENING       = "opening"
    DISCOVERED    = "discovered"
    BENEFIT_START = "benefit_start"
    BENEFIT_DONE  = "benefit_done"
    UPLOADING     = "uploading"
    DONE          = "done"
    ERROR         = "error"


class JobStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    DONE      = "done"
    FAILED    = "failed"


class StageEvent(BaseModel):
    """Um evento de progresso emitido durante o scraping."""
    stage: Stage
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class JobState:
    """Estado mutável de um job — thread-safe via Queue."""

    def __init__(self, job_id: str, termo: str) -> None:
        self.job_id   = job_id
        self.termo    = termo
        self.status   = JobStatus.PENDING
        self.result   = None          # PersonaResponse quando done
        self.error    = None          # mensagem de erro fatal
        self._events:     Queue[StageEvent | None] = Queue()
        self._last_stage: Stage | None = None
        self._timings:    dict[str, datetime] = {}  # primeira ocorrência por stage

    def emit(self, stage: Stage, message: str, **data) -> None:
        """Emite um evento de progresso — chamado pelo extractor."""
        event = StageEvent(stage=stage, message=message, data=data)
        print(f"[emit] {stage} — {message}", flush=True)
        self._last_stage = stage
        if stage.value not in self._timings:
            self._timings[stage.value] = event.timestamp
        self._events.put(event)

    def last_stage(self) -> Stage | None:
        """Retorna o último stage emitido."""
        return self._last_stage

    def get_timings(self) -> dict[str, str]:
        """Retorna timestamps ISO 8601 da primeira ocorrência de cada stage."""
        return {stage: ts.isoformat() for stage, ts in self._timings.items()}

    def close(self) -> None:
        """Sinaliza fim do stream — None é o sentinel."""
        self._events.put(None)

    def stream(self, poll_interval: float = 0.5, max_wait: float = 300.0):
        """Itera sobre os eventos — usado pela rota SSE.

        Faz polling na Queue em intervalos curtos para não bloquear.
        Aguarda até max_wait segundos pelo primeiro evento antes de desistir.
        Yields StageEvent até receber None (sentinel de fim).
        """
        import time
        waited = 0.0

        while True:
            try:
                event = self._events.get(timeout=poll_interval)
                if event is None:
                    return
                yield event
                waited = 0.0  # reset após receber evento
            except Empty:
                waited += poll_interval
                if self.status in (JobStatus.DONE, JobStatus.FAILED):
                    # Job terminou — drena o que sobrou e fecha
                    while True:
                        try:
                            event = self._events.get_nowait()
                            if event is None:
                                return
                            yield event
                        except Empty:
                            return
                if waited >= max_wait:
                    return


def make_job_id() -> str:
    return str(uuid.uuid4())