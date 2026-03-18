from __future__ import annotations

from .browser import BrowserManager
from .extractors import build_persona_data, navigate_to_result
from .models import PersonaData


class PersonaScraper:
    """Navigates the Portal da Transparência and extracts PersonaData.

    This class owns only the navigation + extraction concern.
    Persistence and browser management are injected dependencies.

    Example::

        with BrowserManager() as bm:
            scraper = PersonaScraper(bm)
            data = scraper.search("GDA APARECIDA REIS NETO")
            if data:
                print(data.total_received)
    """

    def __init__(self, browser_manager: BrowserManager) -> None:
        self._browser = browser_manager

    def search(self, termo: str) -> PersonaData | None:
        """Search by CPF, NIS or name.

        Returns a PersonaData on success, None if no result found.
        """
        with self._browser.new_page() as page:
            if not navigate_to_result(page, termo):
                return None
            return build_persona_data(page, termo)
