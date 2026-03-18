"""Schemas públicos do domínio Persona.

Usados em:
- app.v1.rpa          (response_model das rotas)
- app.services.rpa    (PersonaData herda PersonaResponse)
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class BenefitRow(BaseModel):
    mes: str = ""
    parcela: str = ""
    uf: str = ""
    municipio: str = ""
    enquadramento: str = ""
    valor: str = ""
    observacao: str = ""


class Links(BaseModel):
    profile: str = ""
    detail: str = ""


class PersonaResponse(BaseModel):
    """Schema de resposta público — exposto nas rotas e serializado para storage."""

    name: str = ""
    cpf: str = ""
    location: str = ""
    benefit_type: str = ""
    total_received: str = ""
    links: Links = Field(default_factory=Links)
    benefit_rows: list[BenefitRow] = Field(default_factory=list)
