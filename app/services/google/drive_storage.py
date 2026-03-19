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
    uri = storage.save(data)
    # "https://drive.google.com/drive/folders/{folder_id}"
"""
from __future__ import annotations

import json
from io import BytesIO

from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from app.core import settings
from app.services.rpa.exceptions import DownloadFailedException
from app.services.rpa.models import PersonaData
from app.services.rpa.storage import BaseStorage, _safe_name

from .auth import get_credentials


class GoogleDriveStorage(BaseStorage):
    """Salva person.json e screenshot.png no Google Drive do usuário.

    Dependências:
        uv add google-auth google-auth-oauthlib google-api-python-client
    """

    def save(self, data: PersonaData, fallback_name: str = "unknown") -> str:
        """Salva os dados no Drive e retorna a URL da pasta criada.

        Na primeira execução abre o browser para autorização OAuth2.
        Nas seguintes, usa o token salvo silenciosamente.

        Returns:
            URL da pasta: "https://drive.google.com/drive/folders/{id}"

        Raises:
            DownloadFailedException: erro ao comunicar com a API do Drive
        """
        try:
            service = build("drive", "v3", credentials=get_credentials())

            root_id   = self._get_or_create_folder(service, settings.GOOGLE_DRIVE_FOLDER_NAME)
            person_id = self._get_or_create_folder(
                service,
                name=_safe_name(data.name or fallback_name),
                parent_id=root_id,
            )

            self._upload_json(service, person_id, data)
            if data.screenshot_png:
                self._upload_screenshot(service, person_id, data.screenshot_png)

            return f"https://drive.google.com/drive/folders/{person_id}"

        except DownloadFailedException:
            raise
        except RuntimeError as exc:
            # Não autorizado — mensagem clara para o usuário
            raise DownloadFailedException(
                str(exc),
                cpf=data.cpf or None,
            ) from exc
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

    def _upload_json(self, service, folder_id: str, data: PersonaData) -> None:
        payload = json.dumps(
            data.model_dump(exclude={"screenshot_png"}),
            indent=2,
            ensure_ascii=False,
        ).encode("utf-8")
        self._upload_file(service, folder_id, "person.json", payload, "application/json")

    def _upload_screenshot(self, service, folder_id: str, png: bytes) -> None:
        self._upload_file(service, folder_id, "screenshot.png", png, "image/png")

    def _upload_file(
        self,
        service,
        folder_id: str,
        filename: str,
        content: bytes,
        mime_type: str,
    ) -> None:
        """Upload genérico — atualiza arquivo existente ou cria novo."""
        media = MediaIoBaseUpload(BytesIO(content), mimetype=mime_type)

        results = service.files().list(
            q=f"name='{filename}' and '{folder_id}' in parents and trashed=false",
            fields="files(id)",
        ).execute()

        existing = results.get("files", [])
        if existing:
            service.files().update(
                fileId=existing[0]["id"],
                media_body=media,
            ).execute()
        else:
            service.files().create(
                body={"name": filename, "parents": [folder_id]},
                media_body=media,
                fields="id",
            ).execute()