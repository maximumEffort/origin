"""
Pagination helpers for list endpoints.

Standard response shape: ``{"data": [...], "pagination": {page, limit, total}}``.
Use ``parse_pagination`` to validate caller-supplied query params and
``paginated_response`` to build the envelope.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Query, status

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


def parse_pagination(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT, description="Items per page"),
) -> tuple[int, int]:
    """FastAPI dependency: returns ``(page, limit)`` validated."""
    return page, limit


def offset(page: int, limit: int) -> int:
    return (page - 1) * limit


def paginated_response(
    items: list[Any], *, page: int, limit: int, total: int
) -> dict[str, Any]:
    return {
        "data": items,
        "pagination": {"page": page, "limit": limit, "total": total},
    }


def assert_in_range(page: int, limit: int) -> None:
    """Programmatic version of the Query() validators for service-layer callers."""
    if page < 1 or limit < 1 or limit > MAX_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"page must be ≥1, limit must be 1..{MAX_LIMIT}",
        )
