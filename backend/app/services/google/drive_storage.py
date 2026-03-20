"""GoogleDriveStorage — salva PersonaData no Google Drive do usuário.

Token único por instalação — o usuário autoriza uma vez via browser,
e todas as pesquisas seguintes salvam no Drive silenciosamente.

Estrutura criada no Drive:
    rpa-data/
    └── {nome_pessoa}/
        ├── person.json
        └── screenshot.png

Uso:
    storage = GoogleDriveStorage()
    result = storage.save(data)
    # result.folder_url  → "https://drive.google.com/drive/folders/{id}"
    # result.json_url    → "https://drive.google.com/file/d/{id}/view"
    # result.json_id     → "{file_id}"  (para leitura via API)
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from io import BytesIO

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from app.core import settings
from app.services.rpa.exceptions import DownloadFailedException
from app.services.rpa.models import PersonaData
from app.services.rpa.storage import BaseStorage, _safe_name

from .auth import get_credentials


@dataclass
class DriveResult:
    folder_url: str   # URL da pasta da pessoa
    json_url:   str   # URL direta do person.json
    json_id:    str   # file_id do person.json (útil para leitura via API)


class GoogleDriveStorage(BaseStorage):
    """Salva person.json e screenshot.png no Google Drive do usuário."""

    def save(self, data: PersonaData, fallback_name: str = "unknown") -> DriveResult:
        """Salva os dados no Drive e retorna DriveResult com as URLs.

        Returns:
            DriveResult com folder_url, json_url e json_id.

        Raises:
            DownloadFailedException: erro ao comunicar com a API do Drive.
        """
        try:
            service = build("drive", "v3", credentials=get_credentials())

            root_id   = self._get_or_create_folder(service, settings.GOOGLE_DRIVE_FOLDER_NAME)
            person_id = self._get_or_create_folder(
                service,
                name=_safe_name(data.name or fallback_name),
                parent_id=root_id,
            )

            json_file_id = self._upload_json(service, person_id, data)

            if data.screenshot_png:
                self._upload_screenshot(service, person_id, data.screenshot_png)

            return DriveResult(
                folder_url=f"https://drive.google.com/drive/folders/{person_id}",
                json_url=f"https://drive.google.com/file/d/{json_file_id}/view",
                json_id=json_file_id,
            )

        except DownloadFailedException:
            raise
        except RuntimeError as exc:
            raise DownloadFailedException(str(exc), cpf=data.cpf or None) from exc
        except Exception as exc:
            raise DownloadFailedException(
                f"Falha ao salvar no Google Drive: {exc}",
                cpf=data.cpf or None,
            ) from exc

    # ── Pastas ────────────────────────────────────────────────────────────────

    def _get_or_create_folder(
        self,
        service,
        name: str,
        parent_id: str | None = None,
    ) -> str:
        """Retorna o id de uma pasta existente ou cria uma nova."""
        query = (
            f"name='{name}'"
            " and mimeType='application/vnd.google-apps.folder'"
            " and trashed=false"
        )
        if parent_id:
            query += f" and '{parent_id}' in parents"

        results = service.files().list(
            q=query,
            fields="files(id)",
            spaces="drive",
        ).execute()

        files = results.get("files", [])
        if files:
            return files[0]["id"]

        metadata: dict = {
            "name": name,
            "mimeType": "application/vnd.google-apps.folder",
        }
        if parent_id:
            metadata["parents"] = [parent_id]

        folder = service.files().create(body=metadata, fields="id").execute()
        return folder["id"]

    # ── Uploads ───────────────────────────────────────────────────────────────

    def _upload_json(self, service, folder_id: str, data: PersonaData) -> str:
        """Faz upload do person.json e retorna o file_id."""
        payload = json.dumps(
            data.model_dump(exclude={"screenshot_png"}),
            indent=2,
            ensure_ascii=False,
        ).encode("utf-8")
        return self._upload_file(service, folder_id, "person.json", payload, "application/json")

    def _upload_screenshot(self, service, folder_id: str, png: bytes) -> str:
        """Faz upload do screenshot.png e retorna o file_id."""
        return self._upload_file(service, folder_id, "screenshot.png", png, "image/png")

    def _upload_file(
        self,
        service,
        folder_id: str,
        filename: str,
        content: bytes,
        mime_type: str,
    ) -> str:
        """Upload genérico — atualiza arquivo existente ou cria novo.

        Returns:
            file_id do arquivo criado ou atualizado.
        """
        media = MediaIoBaseUpload(BytesIO(content), mimetype=mime_type)

        results = service.files().list(
            q=f"name='{filename}' and '{folder_id}' in parents and trashed=false",
            fields="files(id)",
        ).execute()

        existing = results.get("files", [])
        if existing:
            file = service.files().update(
                fileId=existing[0]["id"],
                media_body=media,
                fields="id",
            ).execute()
            return file["id"]

        file = service.files().create(
            body={"name": filename, "parents": [folder_id]},
            media_body=media,
            fields="id",
        ).execute()
        return file["id"]


# ── Leitura ───────────────────────────────────────────────────────────────────

def _download_json_by_url(drive_svc, json_url: str) -> dict:
    """Baixa e parseia o person.json a partir da URL do Drive.

    Extrai o file_id da URL  "https://drive.google.com/file/d/{id}/view"
    e usa a API do Drive para baixar o conteúdo.

    Returns:
        Conteúdo do person.json como dict.

    Raises:
        ValueError: URL fora do formato esperado.
        Exception: falha na API do Drive.
    """
    import json as _json
    from io import BytesIO
    from googleapiclient.http import MediaIoBaseDownload

    # Extrai file_id da URL
    # Formato: https://drive.google.com/file/d/{file_id}/view
    parts = json_url.rstrip("/").split("/")
    try:
        idx     = parts.index("d")
        file_id = parts[idx + 1]
    except (ValueError, IndexError) as exc:
        raise ValueError(f"URL do Drive inválida: {json_url}") from exc

    request = drive_svc.files().get_media(fileId=file_id)
    buffer  = BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)

    done = False
    while not done:
        _, done = downloader.next_chunk()

    return _json.loads(buffer.getvalue().decode("utf-8"))