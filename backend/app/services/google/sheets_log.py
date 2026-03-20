"""GoogleSheetsLog — registra cada consulta em uma planilha centralizada.

Planilha criada automaticamente no Drive do usuário com a estrutura:

    ID | Termo | Nome | CPF | Data-Hora | Link Drive

O nome da planilha é configurado em settings.GOOGLE_SHEETS_LOG_NAME
(default: "rpa-consultas").

Uso:
    GoogleSheetsLog().append(job_id, termo, data, drive_url)
"""
from __future__ import annotations

from datetime import datetime, timezone

from googleapiclient.discovery import build

from app.core import settings
from app.services.rpa.models import PersonaData

from .auth import get_credentials

_SHEET_TAB = "consultas"
_HEADER    = ["ID", "Termo", "Nome", "CPF", "NIS", "Data-Hora", "Link Drive"]


class GoogleSheetsLog:
    """Registra requisições de busca em uma planilha Google Sheets."""

    def append(
        self,
        job_id: str,
        termo: str,
        data: PersonaData | None,
        drive_url: str = "",
    ) -> None:
        """Adiciona uma linha ao log.

        Cria a planilha e o cabeçalho se ainda não existirem.
        Nunca lança exceção — falhas são logadas mas não interrompem o fluxo.
        """
        try:
            creds      = get_credentials()
            sheets_svc = build("sheets", "v4", credentials=creds)
            drive_svc  = build("drive",  "v3", credentials=creds)

            sheet_id = self._get_or_create_spreadsheet(sheets_svc, drive_svc)
            self._ensure_header(sheets_svc, sheet_id)
            self._append_row(sheets_svc, sheet_id, _build_row(job_id, termo, data, drive_url))

        except Exception as exc:          # pragma: no cover
            print(f"[GoogleSheetsLog] Falha ao registrar linha: {exc}")

    # ── Planilha ──────────────────────────────────────────────────────────────

    def _get_or_create_spreadsheet(self, sheets_svc, drive_svc) -> str:
        """Retorna o ID da planilha, criando-a no Drive se necessário."""
        name = getattr(settings, "GOOGLE_SHEETS_LOG_NAME", "rpa-consultas")

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
        if files:
            return files[0]["id"]

        # Cria planilha nova com a aba já nomeada
        spreadsheet = sheets_svc.spreadsheets().create(
            body={
                "properties": {"title": name},
                "sheets": [{"properties": {"title": _SHEET_TAB}}],
            },
            fields="spreadsheetId",
        ).execute()

        return spreadsheet["spreadsheetId"]

    # ── Cabeçalho ─────────────────────────────────────────────────────────────

    def _ensure_header(self, sheets_svc, sheet_id: str) -> None:
        """Grava cabeçalho em negrito na linha 1 se a planilha estiver vazia."""
        result = (
            sheets_svc.spreadsheets()
            .values()
            .get(spreadsheetId=sheet_id, range=f"{_SHEET_TAB}!A1:G1")
            .execute()
        )
        if result.get("values"):
            return  # já existe

        sheets_svc.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=f"{_SHEET_TAB}!A1",
            valueInputOption="RAW",
            body={"values": [_HEADER]},
        ).execute()

        # Busca o sheetId real da aba (não assume 0)
        meta = sheets_svc.spreadsheets().get(
            spreadsheetId=sheet_id,
            fields="sheets.properties(sheetId,title)",
        ).execute()
        tab_id = next(
            s["properties"]["sheetId"]
            for s in meta["sheets"]
            if s["properties"]["title"] == _SHEET_TAB
        )

        # Negrita cabeçalho
        sheets_svc.spreadsheets().batchUpdate(
            spreadsheetId=sheet_id,
            body={
                "requests": [{
                    "repeatCell": {
                        "range": {"sheetId": tab_id, "startRowIndex": 0, "endRowIndex": 1},
                        "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
                        "fields": "userEnteredFormat.textFormat.bold",
                    }
                }]
            },
        ).execute()

    # ── Linha ─────────────────────────────────────────────────────────────────

    def _append_row(self, sheets_svc, sheet_id: str, row: list) -> None:
        sheets_svc.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range=f"{_SHEET_TAB}!A1",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": [row]},
        ).execute()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_row(
    job_id: str,
    termo: str,
    data: PersonaData | None,
    drive_url: str,
) -> list:
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return [
        job_id,
        termo,
        (data.name or "") if data else "",
        (data.cpf  or "") if data else "",
        (data.nis  or "") if data else "",
        now,
        drive_url,
    ]