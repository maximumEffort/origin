"""Prisma client lifecycle. Imported by main.py + service-layer modules."""

from __future__ import annotations

from prisma import Prisma

_prisma: Prisma | None = None


async def connect_prisma() -> None:
    global _prisma
    if _prisma is not None:
        return
    _prisma = Prisma()
    await _prisma.connect()


async def disconnect_prisma() -> None:
    global _prisma
    if _prisma is None:
        return
    await _prisma.disconnect()
    _prisma = None


def get_db() -> Prisma:
    if _prisma is None:
        raise RuntimeError("Prisma is not connected. Call connect_prisma() first.")
    return _prisma


def is_prisma_connected() -> bool:
    return _prisma is not None and _prisma.is_connected()
