"""Modelos internos do scraper RPA.

PersonaData é o único modelo definido aqui — estende PersonaResponse
(definido em app.schemas.persona) adicionando o campo binário screenshot_png
que nunca deve ser exposto na API.
"""
from __future__ import annotations

from app.schemas.persona import PersonaResponse  # noqa: F401 — reexportado via __init__


class PersonaData(PersonaResponse):
    """Modelo interno — usado pelo scraper e service, nunca exposto diretamente."""

    screenshot_png: bytes = b""

    model_config = {"arbitrary_types_allowed": True}
