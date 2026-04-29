"""
Middleware to extract per-request context: IP, User-Agent, request ID.

Stores them on ``request.state`` so audit logging, error logging and
route handlers can pull them via FastAPI dependencies.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response


@dataclass(frozen=True)
class RequestInfo:
    ip_address: str | None
    user_agent: str | None
    request_id: str


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Prefer X-Forwarded-For (set by reverse proxies / Container Apps).
        forwarded = request.headers.get("x-forwarded-for")
        ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else None)
        )
        ua = request.headers.get("user-agent")

        # Honour a caller-supplied X-Request-ID, otherwise generate one.
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.request_info = RequestInfo(
            ip_address=ip, user_agent=ua, request_id=request_id
        )

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


def get_request_info(request: Request) -> RequestInfo:
    """FastAPI dependency — returns the RequestInfo stashed by middleware."""
    return getattr(
        request.state,
        "request_info",
        RequestInfo(ip_address=None, user_agent=None, request_id=""),
    )
