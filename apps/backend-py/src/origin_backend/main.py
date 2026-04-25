"""
FastAPI application entrypoint.

Run with:
    uv run uvicorn origin_backend.main:app --reload --port 3001

Or directly:
    python -m origin_backend.main
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from origin_backend import __version__
from origin_backend.auth.router import router as auth_router
from origin_backend.common.exceptions import register_exception_handlers
from origin_backend.common.prisma import connect_prisma, disconnect_prisma
from origin_backend.config import settings
from origin_backend.health.router import router as health_router

logger = logging.getLogger("origin_backend")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Connect / disconnect Prisma around the FastAPI request lifecycle.
    Called once at startup, once at shutdown.
    """
    logger.info("connecting to database...")
    await connect_prisma()
    logger.info("origin-backend %s ready on port %s", __version__, settings.app_port)
    yield
    logger.info("shutting down — disconnecting database")
    await disconnect_prisma()


app = FastAPI(
    title="Origin Backend API",
    description="REST API for the Origin car rental platform (Dubai/UAE).",
    version=__version__,
    lifespan=lifespan,
    # OpenAPI docs are disabled in production. Mirror the Node backend's
    # behaviour so the API surface isn't browsable on the public domain.
    openapi_url=None if settings.is_production else "/openapi.json",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
)

# ── Middleware ──────────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)

# ── Exception handlers (uniform error envelope) ─────────────────────
register_exception_handlers(app)

# ── Routers ─────────────────────────────────────────────────────────
# Health endpoints are mounted at /health (NOT under /v1) — same as NestJS.
app.include_router(health_router)

# All API endpoints under /v1 prefix to match NestJS routing.
app.include_router(auth_router, prefix="/v1")

# ── Startup validation — fail fast if required config is missing ────
if not settings.jwt_secret or len(settings.jwt_secret) < 16:
    raise RuntimeError(
        "JWT_SECRET environment variable must be set and at least 16 characters."
    )
