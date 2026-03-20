"""Schemas públicos do domínio Persona.
Usados em:
- app.api.v1.rpa       (response_model das rotas)
- app.services.rpa     (PersonaData herda PersonaResponse)
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class Benefit(BaseModel):
    """Um benefício social com seu sumário e linhas de detalhe."""
    type:           str = ""
    total_received: str = ""
    detail_url:     str = ""
    rows: list[dict[str, str]] = Field(default_factory=list)


class Links(BaseModel):
    profile: str = ""


class PersonaResponse(BaseModel):
    """Schema de resposta público — exposto nas rotas e serializado para storage."""
    name:     str = ""
    cpf:      str = ""
    nis:      str = ""    
    location: str = ""
    links:    Links = Field(default_factory=Links)
    benefits: list[Benefit] = Field(default_factory=list)