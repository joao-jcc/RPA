"""FastAPI Dashboard Backend — Main application entry point."""
from contextlib import asynccontextmanager

import logging

import uvicorn
from fastapi import FastAPI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core import settings
from app.services.jobs import job_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicia o pool de threads no startup e para no shutdown."""
    job_manager.start()
    yield
    job_manager.stop()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=settings.DESCRIPTION,
        version=settings.VERSION,
        openapi_url=f"{settings.API_PREFIX}/openapi.json",
        docs_url=f"{settings.API_PREFIX}/docs",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.API_PREFIX)

    @app.get("/")
    def root():
        return {
            "message": f"{settings.PROJECT_NAME} is running",
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
        }

    return app


app = create_app()