"""Schemas públicos do domínio Persona.

Usados em:
- app.api.v1.rpa       (response_model das rotas)
- app.services.rpa     (PersonaData herda PersonaResponse)
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Benefit(BaseModel):
    """Um benefício social com seu sumário e linhas de detalhe.

    rows é um dict indexado por número de linha (str) — cada valor é um dict
    de {header: valor} com as colunas daquela linha.

    Exemplo:
        {
          "0": {"Mês Folha": "08/2022", "UF": "RJ", "Valor (R$)": "1.212,00"},
          "1": {"Mês Folha": "07/2022", "UF": "RJ", "Valor (R$)": "1.212,00"}
        }
    """
    type: str = ""
    total_received: str = ""
    detail_url: str = ""
    rows: list[dict[str, str]] = Field(default_factory=list)


class Links(BaseModel):
    profile: str = ""


class PersonaResponse(BaseModel):
    """Schema de resposta público — exposto nas rotas e serializado para storage."""
    name: str = ""
    cpf: str = ""
    location: str = ""
    links: Links = Field(default_factory=Links)
    benefits: list[Benefit] = Field(default_factory=list)