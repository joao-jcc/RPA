"""Extractors — leitura e extração de dados do Portal da Transparência.

Cada função recebe uma Page já aberta e retorna dados estruturados.
Nenhuma função aqui decide para onde navegar — isso é responsabilidade do scraper.
"""
from __future__ import annotations

from playwright.sync_api import Page
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

from app.schemas.persona import Benefit
from .exceptions import PersonNotFoundException, PortalTimeoutException
from .models import PersonaData

URL_BASE = "https://portaldatransparencia.gov.br"

# Seletor genérico — primeira <table> dentro de qualquer seção de detalhe.
# Não depende de ids específicos de tabela ou accordion.
_DETAIL_TABLE_SELECTOR = ".content table"


# ── Navegação ─────────────────────────────────────────────────────────────────

def accept_cookies(page: Page) -> None:
    """Dismiss cookie banner if present — fire and forget."""
    try:
        page.locator("#accept-all-btn").click(timeout=5_000)
        page.wait_for_timeout(1_000)
    except Exception:
        pass


def navigate_to_result(page: Page, termo: str) -> None:
    """Navega até o perfil da primeira pessoa encontrada para *termo*.

    Raises:
        PersonNotFoundException: nenhum resultado encontrado.
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
    except PlaywrightTimeoutError as exc:
        raise PersonNotFoundException(
            f"Nenhum resultado encontrado para o termo: '{termo}'."
        ) from exc


# ── Extração de dados básicos ─────────────────────────────────────────────────

def extract_basic_data(page: Page) -> dict[str, str]:
    """Retorna name, cpf e location da página de perfil."""
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
    """Expande o accordion de recebimentos e retorna screenshot PNG."""
    if page.locator("#accordion1 .item").first.get_attribute("active") is None:
        page.locator("#accordion1 .item .header").first.click()

    try:
        page.wait_for_selector(
            "#accordion-recebimentos-recursos .box-ficha__resultados",
            timeout=10_000,
        )
    except PlaywrightTimeoutError as exc:
        raise PortalTimeoutException(
            "Timeout ao aguardar accordion de recebimentos."
        ) from exc

    accept_cookies(page)
    page.wait_for_timeout(2_000)
    return page.screenshot(type="png", full_page=True)


# ── Extração de benefícios ────────────────────────────────────────────────────

def _discover_benefit_sections(page: Page) -> list[dict[str, str]]:
    """Descobre dinamicamente todas as seções de benefício presentes no DOM."""
    sections = []
    for block in page.locator("#accordion-recebimentos-recursos .br-table").all():
        name        = block.locator("strong").first.inner_text().strip()
        btn         = block.locator("a.br-button").first
        if btn.count() == 0:
            continue
        detail_href = btn.get_attribute("href") or ""
        if not name or not detail_href:
            continue
        sections.append({"name": name, "detail_href": detail_href})
    return sections


def _extract_detail_rows(page: Page) -> list[dict[str, str]]:
    """Extrai todas as linhas da tabela de detalhe do benefício.

    1. Expande qualquer item de accordion fechado na página
    2. Aguarda a primeira <table> aparecer dentro de .content
    3. Clica em 'Paginação completa' para carregar todos os registros
    4. Lê headers e linhas dinamicamente — sem depender de ids fixos
    """
    # Expande qualquer accordion fechado na página (sem depender de id)
    for item in page.locator(".br-accordion .item").all():
        if item.get_attribute("active") is None:
            item.locator("button.header").click()
            page.wait_for_timeout(1_000)

    # Aguarda a tabela aparecer
    try:
        page.wait_for_selector(_DETAIL_TABLE_SELECTOR, timeout=10_000)
        page.wait_for_timeout(1_000)
    except PlaywrightTimeoutError:
        return []

    # Carrega todos os registros de uma vez
    btn = page.locator("#btnPaginacaoCompleta")
    if btn.count() > 0:
        try:
            btn.click(timeout=3_000)
            page.wait_for_timeout(2_000)
        except Exception:
            pass

    # Lê a tabela com headers dinâmicos
    table = page.locator(_DETAIL_TABLE_SELECTOR).first

    headers = [
        th.inner_text().strip()
        for th in table.locator("thead th").all()
        if th.inner_text().strip()
    ]
    if not headers:
        return []

    rows: list[dict[str, str]] = []
    for row in table.locator("tbody tr").all():
        cells = [
            (
                td.locator("span").first.inner_text().strip()
                if td.locator("span").count() > 0
                else td.inner_text().strip()
            )
            for td in row.locator("td").all()
        ]
        if not any(cells):
            continue
        columns = {
            headers[i]: cells[i]
            for i in range(min(len(headers), len(cells)))
            if headers[i]
        }
        rows.append(columns)

    return rows


def extract_all_benefits(page: Page) -> list[Benefit]:
    """Detecta e extrai todos os benefícios sociais presentes — sem lista hardcoded."""
    sections = _discover_benefit_sections(page)
    if not sections:
        return []

    profile_url = page.url
    benefits: list[Benefit] = []

    for section in sections:
        total_received = _extract_total_for_href(page, section["detail_href"])

        page.goto(f"{URL_BASE}{section['detail_href']}", wait_until="networkidle")
        detail_url = page.url

        rows = _extract_detail_rows(page)

        benefits.append(Benefit(
            type=section["name"],
            total_received=total_received,
            detail_url=detail_url,
            rows=rows,
        ))

        page.goto(profile_url, wait_until="networkidle")
        open_accordion_recebimentos(page)

    return benefits


def _extract_total_for_href(page: Page, detail_href: str) -> str:
    """Lê o valor total da coluna 'Valor Recebido' da linha com o href correspondente."""
    try:
        total = page.locator(f"a[href='{detail_href}']").evaluate(
            "el => el.closest('tr')?.querySelector('td:nth-child(4)')?.innerText?.trim()",
            timeout=3_000,
        )
        return total or ""
    except Exception:
        return ""


# ── Orquestrador ──────────────────────────────────────────────────────────────

def build_persona_data(page: Page, termo: str) -> PersonaData:
    """Orquestra todos os extractors e retorna PersonaData populado."""
    basic       = extract_basic_data(page)
    profile_url = page.url
    screenshot  = open_accordion_recebimentos(page)
    benefits    = extract_all_benefits(page)

    return PersonaData(
        name=basic.get("name", ""),
        cpf=basic.get("cpf", ""),
        location=basic.get("location", ""),
        links={"profile": profile_url},
        screenshot_png=screenshot,
        benefits=benefits,
    )