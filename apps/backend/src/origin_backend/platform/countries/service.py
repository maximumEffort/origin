"""Country configuration service."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

DEFAULT_COUNTRY_CODE = "AE"


async def get_active_country(db: Any, code: str = DEFAULT_COUNTRY_CODE) -> Any:
    country = await db.country.find_unique(where={"code": code.upper()})
    if country is None or not getattr(country, "isActive", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Country {code.upper()} is not enabled",
        )
    return country


async def list_active_countries(db: Any) -> list[Any]:
    return await db.country.find_many(where={"isActive": True}, order={"name": "asc"})


async def get_default_legal_entity(db: Any, country_id: str) -> Any:
    entity = await db.legalentity.find_first(
        where={"countryId": country_id, "isDefault": True, "isActive": True}
    )
    if entity is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No default legal entity configured for country",
        )
    return entity

