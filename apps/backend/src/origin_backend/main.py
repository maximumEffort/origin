"""
FastAPI application entrypoint.

Run with:
    uv run uvicorn origin_backend.main:app --reload --port 3001

Or directly:
    python -m origin_backend.main
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from origin_backend import __version__
from origin_backend.admin.router import router as admin_router
from origin_backend.auth.router import router as auth_router
from origin_backend.bookings.router import router as bookings_router
from origin_backend.calculator.router import router as calculator_router
from origin_backend.common.exceptions import register_exception_handlers
from origin_backend.common.prisma import connect_prisma, disconnect_prisma
from origin_backend.common.request_context import RequestContextMiddleware
from origin_backend.config import settings
from origin_backend.contact.router import router as contact_router
from origin_backend.customers.router import router as customers_router
from origin_backend.gateways.admin_api.router import router as modular_admin_router
from origin_backend.gateways.public_api.router import router as modular_public_router
from origin_backend.gateways.webhook_receiver.router import router as modular_webhook_router
from origin_backend.health.router import router as health_router
from origin_backend.images.router import router as images_router
from origin_backend.kyc.router import router as kyc_admin_router
from origin_backend.leases.router import router as leases_router
from origin_backend.maps.router import router as maps_router
from origin_backend.payments.router import router as payments_router
from origin_backend.vehicles.router import router as vehicles_router
from origin_backend.webhooks.checkout import router as checkout_webhook_router

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
    openapi_url=None if settings.is_production else "/openapi.json",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
)

# ── Middleware ──────────────────────────────────────────────────────
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

# ── Exception handlers (uniform error envelope) ─────────────────────
register_exception_handlers(app)

# ── Routers ─────────────────────────────────────────────────────────
app.include_router(health_router)

# All API endpoints under /v1 prefix to match NestJS routing.
app.include_router(auth_router, prefix="/v1")
app.include_router(vehicles_router, prefix="/v1")
app.include_router(customers_router, prefix="/v1")
app.include_router(calculator_router, prefix="/v1")
app.include_router(bookings_router, prefix="/v1")
app.include_router(leases_router, prefix="/v1")
app.include_router(contact_router, prefix="/v1")
app.include_router(payments_router, prefix="/v1")
app.include_router(maps_router, prefix="/v1")
app.include_router(admin_router, prefix="/v1")
app.include_router(images_router, prefix="/v1")  # /v1/admin/vehicles/:id/images
app.include_router(kyc_admin_router, prefix="/v1")
app.include_router(checkout_webhook_router, prefix="/v1")

# Modular enterprise API surface. Existing /v1 routes remain mounted during
# migration so functionality can move behind the new boundaries incrementally.
app.include_router(modular_public_router, prefix="/v2")
app.include_router(modular_admin_router, prefix="/v2")
app.include_router(modular_webhook_router, prefix="/v2")


def validate_startup_settings(s: object) -> None:
    """
    Refuse to start the app on misconfigurations that would otherwise fail
    silently in dangerous ways. Called at module import time below; also
    importable for direct unit testing.
    """
    if not s.jwt_secret or len(s.jwt_secret) < 16:
        raise RuntimeError(
            "JWT_SECRET environment variable must be set and at least 16 characters."
        )
    # In production, we must use Azure Blob for KYC docs. Falling back to the
    # local StaticFiles mount would expose Emirates ID, passport, and driving
    # licence files publicly — UAE PDPL violation. See issue #130.
    if s.is_production and not s.azure_storage_blob_endpoint:
        raise RuntimeError(
            "AZURE_STORAGE_BLOB_ENDPOINT is required in production — refusing to start. "
            "Set the env var or downgrade APP_ENV; never serve KYC documents from local disk in prod."
        )


validate_startup_settings(settings)

# ── Serve locally-uploaded KYC files (dev / staging only) ────────
_uploads = Path(settings.kyc_upload_dir)
_uploads.mkdir(parents=True, exist_ok=True)

if not settings.azure_storage_blob_endpoint:
    app.mount("/uploads", StaticFiles(directory=str(_uploads)), name="uploads")
