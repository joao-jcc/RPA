"""Exceções do serviço RPA — Portal da Transparência."""
from __future__ import annotations


class RPABaseException(Exception):
    """Base para todas as exceções do serviço RPA."""

    def __init__(self, message: str, cpf: str | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.cpf = cpf

    def __str__(self) -> str:
        prefix = f"[CPF={self.cpf}] " if self.cpf else ""
        return f"{prefix}{self.message}"


class PersonNotFoundException(RPABaseException):
    """Nenhuma pessoa encontrada para o termo consultado."""


class PortalTimeoutException(RPABaseException):
    """Timeout ao aguardar elemento ou navegação no portal."""


class DownloadFailedException(RPABaseException):
    """Falha ao baixar/gerar/persistir arquivos (CSV/PNG/JSON)."""