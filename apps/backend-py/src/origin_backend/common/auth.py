"""
FastAPI auth dependencies.

Mirrors apps/backend/src/auth/strategies/jwt.strategy.ts + JwtAuthGuard.

Two dependencies:
    require_user      Resolve any authenticated user (customer or admin).
    require_customer  Resolve a customer specifically (rejects admin tokens).

Both pull a Bearer token off the Authorization header, verify it as an
access token, look the user up via Prisma, and hand back a typed
`AuthenticatedUser` to the handler.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from origin_backend.auth.jwt import verify_access_token
from origin_backend.common.prisma import get_db
from prisma import Prisma

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    """The shape req.user has on a NestJS handler after JwtAuthGuard."""

    id: str
    role: str  # 'customer' | 'SUPER_ADMIN' | 'FLEET_MANAGER' | ...
    kind: Literal["customer", "admin"]


def _unauthorized(detail: str = "Unauthorized") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Prisma = Depends(get_db),
) -> AuthenticatedUser:
    """Verify the bearer access token and load the underlying user."""
    if creds is None or creds.scheme.lower() != "bearer" or not creds.credentials:
        raise _unauthorized()

    try:
        payload = verify_access_token(creds.credentials)
    except ValueError as e:
        raise _unauthorized(str(e)) from e

    sub = payload.get("sub")
    role = payload.get("role")
    if not isinstance(sub, str) or not isinstance(role, str):
        raise _unauthorized("Invalid token payload")

    if role == "customer":
        customer = await db.customer.find_unique(where={"id": sub})
        if customer is None:
            raise _unauthorized()
        return AuthenticatedUser(id=customer.id, role="customer", kind="customer")

    admin = await db.adminuser.find_unique(where={"id": sub})
    if admin is None or not admin.isActive:
        raise _unauthorized()
    admin_role = admin.role.value if hasattr(admin.role, "value") else str(admin.role)
    return AuthenticatedUser(id=admin.id, role=admin_role, kind="admin")


async def require_customer(
    user: AuthenticatedUser = Depends(require_user),
) -> AuthenticatedUser:
    """Reject admin tokens — only customers may call /customers/me/*."""
    if user.kind != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return user
