"""
Exception types and FastAPI exception handlers.

Mirrors the response shape of the NestJS HttpExceptionFilter so the
frontends don't see different error formats during the migration window.
"""

from __future__ import annotations

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from origin_backend.common.error_log import log_error
from origin_backend.common.prisma import get_db

logger = logging.getLogger(__name__)


def _error_payload(status: int, message: str, code: str | None = None) -> dict[str, object]:
    """Standard error envelope returned to clients."""
    payload: dict[str, object] = {"statusCode": status, "message": message}
    if code is not None:
        payload["code"] = code
    return payload


def _resolve_user_id(request: Request) -> str | None:
    """Best-effort: pull the user id from the access token if present.

    The auth dependency may not have run for an unhandled exception path
    (e.g. a 500 inside middleware), so we re-decode here without raising.
    """
    auth = request.headers.get("authorization") or ""
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        from origin_backend.auth.jwt import verify_access_token

        payload = verify_access_token(token)
        sub = payload.get("sub")
        return str(sub) if sub else None
    except Exception:
        return None


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = exc.detail if isinstance(exc.detail, str) else None
    headers = getattr(exc, "headers", None)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(exc.status_code, str(exc.detail), code=code),
        headers=headers,
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Pydantic validation errors come back as 400 with a per-field message list."""
    errors = [
        {"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()
    ]
    return JSONResponse(
        status_code=400,
        content={
            "statusCode": 400,
            "message": "Validation failed",
            "errors": errors,
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Persist 500s to error_logs + stdout. Never leak internals to the client."""
    request_info = getattr(request.state, "request_info", None)
    request_id = getattr(request_info, "request_id", None)

    stack = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    endpoint = request.url.path
    method = request.method

    logger.error(
        "Unhandled exception: %s %s — %s (request_id=%s)",
        method,
        endpoint,
        exc,
        request_id,
        exc_info=exc,
    )

    try:
        db = get_db()
    except Exception:
        db = None

    if db is not None:
        await log_error(
            db,
            level="ERROR",
            message=f"{type(exc).__name__}: {exc}",
            stack_trace=stack,
            endpoint=endpoint,
            method=method,
            status_code=500,
            user_id=_resolve_user_id(request),
            request_id=request_id,
        )

    response = JSONResponse(
        status_code=500,
        content=_error_payload(500, "Internal server error"),
    )
    if request_id:
        response.headers["X-Request-ID"] = request_id
    return response


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
