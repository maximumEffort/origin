"""
Prisma client singleton.

Lifecycle:
    - Connect at FastAPI startup (lifespan event)
    - Disconnect at shutdown
    - Inject into request handlers via FastAPI's dependency system

Usage in a router:
    from origin_backend.common.prisma import get_db
    from prisma import Prisma

    @router.get('/customers')
    async def list_customers(db: Prisma = Depends(get_db)):
        return await db.customer.find_many()
"""

from __future__ import annotations

from prisma import Prisma

_prisma: Prisma | None = None


async def connect_prisma() -> Prisma:
    """Connect to the database. Called from FastAPI lifespan startup."""
    global _prisma
    _prisma = Prisma(auto_register=True)
    await _prisma.connect()
    return _prisma


async def disconnect_prisma() -> None:
    """Disconnect cleanly at app shutdown."""
    global _prisma
    if _prisma is not None and _prisma.is_connected():
        await _prisma.disconnect()
    _prisma = None


def get_db() -> Prisma:
    """Dependency for FastAPI handlers — returns the singleton client."""
    if _prisma is None:
        raise RuntimeError(
            "Prisma client not initialised. Did you forget to wire the FastAPI lifespan?"
        )
    return _prisma
