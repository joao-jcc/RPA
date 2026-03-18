"""
API package.
Contains all API versions and schemas.
"""
from fastapi import APIRouter

from app.api.v1.rpa import router as rpa_router

api_router = APIRouter()

api_router.include_router(rpa_router, prefix="/v1/rpa", tags=["RPA"])
