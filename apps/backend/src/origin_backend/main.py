"""
FastAPI application entrypoint.

Run locally:
    uv run uvicorn origin_backend.main:app --reload --port 8080

Production: see Dockerfile + start.sh + Azure Container App `ca-origin-backend-prod`.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from origin_backend import __version__
from origin_backend.config import settings
from origin_backend.core.kernel.errors import register_exception_handlers
from origin_backend.core.observability.request_context import RequestContextMiddleware
from origin_backend.gateways.admin_api.router import router as admin_router
from origin_backend.gateways.public_api.router import router as public_router
from origin_backend.gateways.webhook_receiver.router import router as webhook_router
from origin_backend.health.router import router as health_router

logger = logging.getLogger("origin_backend")


def _validate_startup() -> None:
    if not settings.jwt_secret or len(settings.jwt_secret) < 16:
        raise RuntimeError(
            "JWT_SECRET environment variable must be set and at least 16 characters."
        )
    if settings.is_production and not settings.azure_storage_blob_endpoint:
        raise RuntimeError(
            "AZURE_STORAGE_BLOB_ENDPOINT is required in production. KYC documents must "
            "never be served from local disk in prod (UAE PDPL)."
        )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Connect Prisma at startup, disconnect at shutdown."""
    from origin_backend.core.persistence import connect_prisma, disconnect_prisma

    logger.info("origin-backend %s starting; env=%s", __version__, settings.app_env)
    await connect_prisma()
    logger.info("ready")
    yield
    logger.info("shutting down")
    await disconnect_prisma()


_validate_startup()

app = FastAPI(
    title="Origin Backend API",
    description="Modular monolith for the Origin platform (Dubai/UAE).",
    version=__version__,
    lifespan=lifespan,
    openapi_url=None if settings.is_production else "/openapi.json",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
)

# Middleware
app.add_middleware(RequestContextMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)

# Exception handlers
register_exception_handlers(app)

# Routers — clean V1 surface only.
app.include_router(health_router)
app.include_router(public_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/admin/v1")
app.include_router(webhook_router, prefix="/api/webhooks")
