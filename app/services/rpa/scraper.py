from __future__ import annotations

from .browser import BrowserManager
from .extractors import build_persona_data, navigate_to_result
from .models import PersonaData


class PersonaScraper:
    """Navega o Portal da Transparência e extrai PersonaData.
    """

    def __init__(self, browser_manager: BrowserManager) -> None:
        self._browser = browser_manager

    def search(self, termo: str) -> PersonaData:
        with self._browser.new_page() as page:
            navigate_to_result(page, termo)   # levanta exceção se não encontrar
            return build_persona_data(page, termo)