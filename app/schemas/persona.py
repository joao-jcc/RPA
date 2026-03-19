"""Schemas públicos do domínio Persona.

Usados em:
- app.api.v1.rpa       (response_model das rotas)
- app.services.rpa     (PersonaData herda PersonaResponse)
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class BenefitRow(BaseModel):
    """Uma linha da tabela de detalhe de um benefício.

    As colunas variam por tipo de benefício — armazenadas como dict livre.
    A chave é o header da coluna, o valor é o conteúdo da célula.

    Exemplo Auxílio Emergencial:
        {"Mês de disponibilização": "09/2021", "Parcela": "15ª", "Valor (R$)": "250,00"}

    Exemplo Novo Bolsa Família:
        {"Mês Folha": "01/2026", "Mês Referência": "01/2026", "Valor Parcela": "650,00"}
    """
    columns: dict[str, str] = Field(default_factory=dict)


class Benefit(BaseModel):
    """Um benefício social com seu sumário e linhas de detalhe."""
    type: str = ""
    total_received: str = ""
    detail_url: str = ""
    rows: list[BenefitRow] = Field(default_factory=list)


class Links(BaseModel):
    profile: str = ""


class PersonaResponse(BaseModel):
    """Schema de resposta público — exposto nas rotas e serializado para storage."""
    name: str = ""
    cpf: str = ""
    location: str = ""
    links: Links = Field(default_factory=Links)
    benefits: list[Benefit] = Field(default_factory=list)