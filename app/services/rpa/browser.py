from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15"
)


class BrowserManager:
    """Manages Playwright browser lifecycle.

    Usage:
        with BrowserManager() as bm:
            with bm.new_page() as page:
                page.goto(...)
    """

    def __init__(self, headless: bool = True, timeout_ms: int = 60_000) -> None:
        self.headless = headless
        self.timeout_ms = timeout_ms
        self._playwright = None
        self._browser: Browser | None = None

    def __enter__(self) -> BrowserManager:
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(
            headless=self.headless,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        )
        return self

    def __exit__(self, *_) -> None:
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()

    @contextmanager
    def new_page(self) -> Generator[Page, None, None]:
        if self._browser is None:
            raise RuntimeError("BrowserManager must be used as a context manager.")

        context: BrowserContext = self._browser.new_context(
            accept_downloads=True,
            user_agent=_USER_AGENT,
            locale="pt-BR",
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()
        page.set_default_timeout(self.timeout_ms)
        try:
            yield page
        finally:
            context.close()
