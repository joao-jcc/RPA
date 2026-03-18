"""Storage — persiste PersonaData em diferentes backends.

Arquitetura:
    BaseStorage (ABC)
    ├── LocalStorage   — disco local (padrão / desenvolvimento)
    └── GCSStorage     — Google Cloud Storage (produção) [stub pronto para implementar]

Injetar a implementação no PersonaService via construtor.
"""
from __future__ import annotations

import base64
import json
from abc import ABC, abstractmethod
from pathlib import Path

from .exceptions import DownloadFailedException
from .models import PersonaData

FOLDER_DOWNLOAD = "./app/services/rpa/downloads"


def _safe_name(value: str) -> str:
    return "".join(
        c if c.isalnum() or c == "_" else "_"
        for c in (value or "").strip().lower()
    )


# ── Interface ─────────────────────────────────────────────────────────────────

class BaseStorage(ABC):
    """Contrato que qualquer backend de storage deve implementar."""

    @abstractmethod
    def save(self, data: PersonaData, fallback_name: str = "unknown") -> str:
        """Persiste *data* e retorna um identificador (path local ou URI GCS)."""


# ── Implementações ────────────────────────────────────────────────────────────

class LocalStorage(BaseStorage):
    """Salva person.json e screenshot.png no sistema de arquivos local."""

    def __init__(self, base_dir: str = FOLDER_DOWNLOAD) -> None:
        self.base_dir = base_dir

    def save(self, data: PersonaData, fallback_name: str = "unknown") -> str:
        try:
            folder = self._make_folder(data.name or fallback_name)
            self._write_json(folder, data)
            if data.screenshot_png:
                self._write_screenshot(folder, data.screenshot_png)
            return str(folder)
        except OSError as exc:
            raise DownloadFailedException(
                f"Falha ao salvar em '{self.base_dir}': {exc}",
                cpf=data.cpf or None,
            ) from exc

    def _make_folder(self, name: str) -> Path:
        folder = Path(self.base_dir) / _safe_name(name)
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    def _write_json(self, folder: Path, data: PersonaData) -> None:
        # .model_dump() é o método Pydantic v2; exclui o campo binário
        payload = data.model_dump(exclude={"screenshot_png"})
        (folder / "person.json").write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def _write_screenshot(self, folder: Path, png: bytes) -> None:
        (folder / "screenshot.png").write_bytes(png)
        (folder / "screenshot.b64").write_text(
            base64.b64encode(png).decode("utf-8"),
            encoding="utf-8",
        )


class GCSStorage(BaseStorage):
    """Salva person.json e screenshot.png no Google Cloud Storage.

    Dependência: pip install google-cloud-storage

    Uso:
        from google.cloud import storage as gcs
        client = gcs.Client()
        bucket = client.bucket("meu-bucket")
        storage = GCSStorage(bucket=bucket, prefix="rpa/personas")
    """

    def __init__(self, bucket, prefix: str = "rpa/personas") -> None:
        self._bucket = bucket
        self._prefix = prefix.rstrip("/")

    def save(self, data: PersonaData, fallback_name: str = "unknown") -> str:
        folder = f"{self._prefix}/{_safe_name(data.name or fallback_name)}"
        try:
            self._upload_json(folder, data)
            if data.screenshot_png:
                self._upload_screenshot(folder, data.screenshot_png)
            return f"gs://{self._bucket.name}/{folder}"
        except Exception as exc:
            raise DownloadFailedException(
                f"Falha ao enviar para GCS '{folder}': {exc}",
                cpf=data.cpf or None,
            ) from exc

    def _upload_json(self, folder: str, data: PersonaData) -> None:
        payload = data.model_dump(exclude={"screenshot_png"})
        blob = self._bucket.blob(f"{folder}/person.json")
        blob.upload_from_string(
            json.dumps(payload, indent=2, ensure_ascii=False),
            content_type="application/json",
        )

    def _upload_screenshot(self, folder: str, png: bytes) -> None:
        blob = self._bucket.blob(f"{folder}/screenshot.png")
        blob.upload_from_string(png, content_type="image/png")
