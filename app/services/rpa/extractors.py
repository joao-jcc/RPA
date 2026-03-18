from __future__ import annotations

from playwright.sync_api import Page
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from .exceptions import PersonNotFoundException, PortalTimeoutException
from app.schemas.persona import BenefitRow
from .models import PersonaData

URL_BASE = "https://portaldatransparencia.gov.br"


def accept_cookies(page: Page) -> None:
    """Dismiss cookie banner if present — fire and forget."""
    try:
        page.locator("#accept-all-btn").click(timeout=5_000)
        page.wait_for_timeout(1_000)
    except Exception:
        pass


def navigate_to_result(page: Page, termo: str) -> bool:
    """Search for *termo* and open the first result.

    Returns True if a result was found and opened.
    """
    page.goto(f"{URL_BASE}/pessoa-fisica/busca/lista", wait_until="networkidle")
    page.wait_for_timeout(5_000)
    accept_cookies(page)

    page.get_by_role("searchbox").fill(termo)

    refine_item = page.locator(".item.bordered").first
    if refine_item.get_attribute("active") is None:
        refine_item.locator(".header").click()
    page.wait_for_timeout(1_000)

    page.locator("label[for='beneficiarioProgramaSocial']").click()
    page.locator("#btnConsultarPF").click()

    try:
        page.wait_for_selector("#resultados .link-busca-nome", timeout=10_000)
        page.locator("#resultados .link-busca-nome").first.click()
        page.wait_for_load_state("networkidle")
        return True
    except PlaywrightTimeoutError as exc:
        raise PersonNotFoundException(
            f"Nenhum resultado encontrado para o termo: '{termo}'."
        ) from exc


def extract_basic_data(page: Page) -> dict[str, str]:
    """Return name, cpf and location from the profile page."""
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3_000)

    result: dict[str, str] = {}
    for item in page.locator(".dados-tabelados strong").all():
        label = item.inner_text().strip().lower()
        value = item.evaluate("el => el.nextElementSibling?.innerText?.trim()")
        if not (label and value):
            continue
        if "nome" in label:
            result["name"] = value
        elif "localidade" in label:
            result["location"] = value
        elif "cpf" in label:
            result["cpf"] = value

    return result


def open_accordion_recebimentos(page: Page) -> bytes:
    """Expand the payments accordion and return a screenshot (PNG bytes)."""
    if page.locator("#accordion1 .item").first.get_attribute("active") is None:
        page.locator("#accordion1 .item .header").first.click()

    try:
        page.wait_for_selector(
            "#accordion-recebimentos-recursos .box-ficha__resultados", timeout=10_000
        )
    except PlaywrightTimeoutError as exc:
        raise PortalTimeoutException(
            "Timeout ao aguardar accordion de recebimentos."
        ) from exc

    accept_cookies(page)
    page.wait_for_timeout(2_000)
    return page.screenshot(type="png")


def extract_recebimentos(page: Page) -> dict:
    """Extract payment information.

    Tries two strategies in order:
      1. Federal direct payments (#gastosDiretos)
      2. Social benefit table + detail page
    """
    # Strategy 1 — direct federal payments
    try:
        total = page.locator("#gastosDiretos").evaluate(
            "el => el.textContent.trim().split(':').pop().trim()",
            timeout=5_000,
        )
        return {"total_received": total, "benefit_type": "", "detail_url": "", "benefit_rows": []}
    except PlaywrightTimeoutError:
        pass

    # Strategy 2 — social benefit
    try:
        benefit_type = (
            page.locator("#accordion-recebimentos-recursos strong")
            .first.inner_text()
            .strip()
        )
        valor_cell = page.locator(
            "#tabela-visao-geral-sancoes tbody tr td:nth-child(4)"
        ).first
        total_received = valor_cell.inner_text().strip()

        page.locator("#btnDetalharBpc").click()
        page.wait_for_load_state("networkidle")
        detail_url = page.url

        btn = page.locator("[aria-controls='detalhe-disponibilizado']")
        if btn.locator("..").get_attribute("active") is None:
            btn.click()

        page.wait_for_selector("#tabelaDetalheDisponibilizado tbody tr", timeout=10_000)
        page.wait_for_timeout(2_000)

        rows = _extract_benefit_rows(page)
        return {
            "benefit_type": benefit_type,
            "total_received": total_received,
            "detail_url": detail_url,
            "benefit_rows": rows,
        }
    except PlaywrightTimeoutError as exc:
        raise PortalTimeoutException(
            "Timeout ao aguardar tabela de detalhe do benefício social."
        ) from exc


def _extract_benefit_rows(page: Page) -> list[BenefitRow]:
    rows: list[BenefitRow] = []
    for row in page.locator("#tabelaDetalheDisponibilizado tbody tr").all():
        cols = row.locator("td span").all()
        if len(cols) >= 6:
            rows.append(
                BenefitRow(
                    mes=cols[0].inner_text().strip(),
                    parcela=cols[1].inner_text().strip(),
                    uf=cols[2].inner_text().strip(),
                    municipio=cols[3].inner_text().strip(),
                    enquadramento=cols[4].inner_text().strip(),
                    valor=cols[5].inner_text().strip(),
                    observacao=cols[6].inner_text().strip() if len(cols) > 6 else "",
                )
            )
    return rows


def build_persona_data(page: Page, termo: str) -> PersonaData:
    """Orchestrate all extractors and return a populated PersonaData."""
    basic = extract_basic_data(page)
    profile_url = page.url
    screenshot = open_accordion_recebimentos(page)
    payments = extract_recebimentos(page)

    return PersonaData(
        name=basic.get("name", ""),
        cpf=basic.get("cpf", ""),
        location=basic.get("location", ""),
        profile_url=profile_url,
        screenshot_png=screenshot,
        **{k: payments[k] for k in ("benefit_type", "total_received", "detail_url", "benefit_rows")},
    )
