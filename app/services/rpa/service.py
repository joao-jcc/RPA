"""PersonaService — orquestra scraping, storage e expõe PersonaResponse."""
from __future__ import annotations

from app.core import settings
from app.schemas.persona import PersonaResponse

from .browser import BrowserManager
from .exceptions import PersonNotFoundException, PortalTimeoutException
from .models import PersonaData
from .scraper import PersonaScraper
from .storage import BaseStorage, LocalStorage


class PersonaService:
    """Orquestra scraping e persistência.

    O storage é injetado — troque LocalStorage por GCSStorage sem mudar
    nenhuma outra linha do projeto.

    Exemplo — disco local (padrão via settings)::

        service = PersonaService()
        response = service.fetch("123.456.789-00")

    Exemplo — Google Cloud Storage::

        from google.cloud import storage as gcs
        bucket = gcs.Client().bucket("meu-bucket")
        service = PersonaService(storage=GCSStorage(bucket))
        response, uri = service.fetch_and_save("GDA APARECIDA REIS NETO")
    """

    def __init__(self, storage: BaseStorage | None = None) -> None:
        self._browser_manager = BrowserManager(headless=settings.RPA_HEADLESS)
        self._storage: BaseStorage = storage or LocalStorage(settings.RPA_DOWNLOADS_DIR)

    # ── API pública ───────────────────────────────────────────────────────────

    def fetch(self, termo: str) -> PersonaResponse:
        """Scraping puro — sem side effects, retorna schema pronto para FastAPI.

        Raises:
            PersonNotFoundException: nenhum resultado para o termo.
            PortalTimeoutException: portal não respondeu a tempo.
        """
        data = self._scrape(termo)
        return PersonaResponse(**data.model_dump(exclude={"screenshot_png"}))

    def fetch_and_save(self, termo: str) -> tuple[PersonaResponse, str]:
        """Scraping + persistência.

        Returns:
            (PersonaResponse, storage_uri) — URI é path local ou gs://...

        Raises:
            PersonNotFoundException: nenhum resultado para o termo.
            PortalTimeoutException: portal não respondeu a tempo.
        """
        data = self._scrape(termo)
        uri = self._storage.save(data, fallback_name=termo)
        response = PersonaResponse(**data.model_dump(exclude={"screenshot_png"}))
        return response, uri

    # ── interno ───────────────────────────────────────────────────────────────

    def _scrape(self, termo: str) -> PersonaData:
        with self._browser_manager as bm:
            return PersonaScraper(bm).search(termo)


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    service = PersonaService()
    try:
        response, uri = service.fetch_and_save(" AI PIRAHA")
    except PersonNotFoundException as exc:
        print(f"Não encontrado: {exc}")
    except PortalTimeoutException as exc:
        print(f"Timeout no portal: {exc}")
