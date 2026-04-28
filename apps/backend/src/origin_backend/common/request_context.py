"""
Middleware to extract IP address and User-Agent from incoming requests.

Stores them on ``request.state`` so audit logging can access them from
any route handler via a FastAPI dependency.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response


@dataclass(frozen=True)
class RequestInfo:
    ip_address: str | None
    user_agent: str | None


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Prefer X-Forwarded-For (set by reverse proxies like Railway/ALB).
        forwarded = request.headers.get("x-forwarded-for")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
        ua = request.headers.get("user-agent")
        request.state.request_info = RequestInfo(ip_address=ip, user_agent=ua)
        return await call_next(request)


def get_request_info(request: Request) -> RequestInfo:
    """FastAPI dependency — returns the RequestInfo stashed by middleware."""
    return getattr(request.state, "request_info", RequestInfo(ip_address=None, user_agent=None))
