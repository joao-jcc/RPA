"""Rotas de histórico de pesquisas.

GET  /api/v1/searches/stream?from_row=1&to_row=20
     Server-Sent Events — emite um evento por linha à medida que
     cada JSON é baixado do Drive. O frontend renderiza progressivamente.

GET  /api/v1/searches?from_row=1&to_row=20
     Endpoint síncrono mantido para compatibilidade.
"""
from __future__ import annotations

import json as _json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from googleapiclient.discovery import build

from app.core import settings
from app.services.google.auth import get_credentials
from app.services.google.drive_storage import _download_json_by_url

_SHEET_TAB = "consultas"

router = APIRouter()


# ── SSE streaming ─────────────────────────────────────────────────────────────

@router.get(
    "/stream",
    summary="Stream searches row by row via SSE",
    description=(
        "Emits one SSE event per row as each person.json is fetched from Drive. "
        "Frontend renders results progressively as they arrive."
    ),
)
def stream_searches(
    from_row: int = Query(1,  ge=1),
    to_row:   int = Query(20, ge=1),
) -> StreamingResponse:
    if to_row < from_row:
        raise HTTPException(status_code=400, detail="to_row must be >= from_row.")

    def event_generator():
        try:
            creds      = get_credentials()
            sheets_svc = build("sheets", "v4", credentials=creds)
            drive_svc  = build("drive",  "v3", credentials=creds)

            sheet_id = _get_sheet_id(sheets_svc)
            if not sheet_id:
                yield _sse({"type": "done", "total": 0})
                return

            rows = _read_rows(sheets_svc, sheet_id, from_row, to_row)

            # Emite total para o frontend saber quantos esperar
            yield _sse({"type": "total", "count": len(rows)})

            for i, row in enumerate(rows):
                json_url = row.get("json_url", "")
                persona  = None
                if json_url:
                    try:
                        persona = _download_json_by_url(drive_svc, json_url)
                    except Exception:
                        persona = None

                yield _sse({
                    "type":    "row",
                    "index":   i,
                    **row,
                    "persona": persona,
                })

            yield _sse({"type": "done", "total": len(rows)})

        except Exception as exc:
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Síncrono (mantido) ────────────────────────────────────────────────────────

@router.get(
    "",
    summary="List searches from spreadsheet with full persona data",
)
def list_searches(
    from_row: int = Query(1,  ge=1),
    to_row:   int = Query(20, ge=1),
) -> list[dict]:
    if to_row < from_row:
        raise HTTPException(status_code=400, detail="to_row must be >= from_row.")
    try:
        creds      = get_credentials()
        sheets_svc = build("sheets", "v4", credentials=creds)
        drive_svc  = build("drive",  "v3", credentials=creds)
        sheet_id   = _get_sheet_id(sheets_svc)
        if not sheet_id:
            return []
        rows = _read_rows(sheets_svc, sheet_id, from_row, to_row)
        return [_hydrate(row, drive_svc) for row in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sse(data: dict) -> str:
    return f"data: {_json.dumps(data, ensure_ascii=False)}\n\n"


def _get_sheet_id(sheets_svc) -> str | None:
    drive_svc = build("drive", "v3", credentials=get_credentials())
    name      = getattr(settings, "GOOGLE_SHEETS_LOG_NAME", "rpa-consultas")

    results = drive_svc.files().list(
        q=(
            f"name='{name}'"
            " and mimeType='application/vnd.google-apps.spreadsheet'"
            " and trashed=false"
        ),
        fields="files(id)",
        spaces="drive",
    ).execute()

    files = results.get("files", [])
    return files[0]["id"] if files else None


def _read_rows(sheets_svc, sheet_id: str, from_row: int, to_row: int) -> list[dict]:
    start = from_row + 1  # pula cabeçalho
    end   = to_row   + 1

    result = sheets_svc.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=f"{_SHEET_TAB}!A{start}:G{end}",
    ).execute()

    return [_row_to_dict(r) for r in result.get("values", [])]


def _row_to_dict(row: list) -> dict:
    def _get(i: int) -> str:
        return row[i] if i < len(row) else ""
    return {
        "job_id":    _get(0),
        "termo":     _get(1),
        "nome":      _get(2),
        "cpf":       _get(3),
        "nis":       _get(4),
        "data_hora": _get(5),
        "json_url":  _get(6),
    }


def _hydrate(row: dict, drive_svc) -> dict:
    json_url = row.get("json_url", "")
    persona  = None
    if json_url:
        try:
            persona = _download_json_by_url(drive_svc, json_url)
        except Exception:
            pass
    return {**row, "persona": persona}