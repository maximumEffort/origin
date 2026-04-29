"""
Exception types and FastAPI exception handlers.

Mirrors the response shape of the NestJS HttpExceptionFilter so the
frontends don't see different error formats during the migration window.
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def _error_payload(status: int, message: str, code: str | None = None) -> dict[str, object]:
    """Standard error envelope returned to clients."""
    payload: dict[str, object] = {"statusCode": status, "message": message}
    if code is not None:
        payload["code"] = code
    return payload


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


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    # Production: never leak the exception type or stack to the client.
    # The structlog logger captures the full trace server-side.
    return JSONResponse(
        status_code=500,
        content=_error_payload(500, "Internal server error"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
