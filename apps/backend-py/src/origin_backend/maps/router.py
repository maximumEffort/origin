"""
Maps endpoints — mirrors apps/backend/src/integrations/google-maps/google-maps.controller.ts.

    GET /maps/autocomplete   Address suggestions (UAE-restricted)
    GET /maps/place-details  Resolve a Place ID to coordinates + address

The Google Maps API key stays server-side; the frontend never sees it.
Both endpoints require a valid JWT.
"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, Query

from origin_backend.common.auth import AuthenticatedUser, require_user
from origin_backend.integrations import google_maps

router = APIRouter(prefix="/maps", tags=["maps"])


@router.get("/autocomplete")
async def autocomplete_endpoint(
    input_text: str = Query(..., alias="input", min_length=1),
    session_token: str | None = Query(None, alias="sessionToken"),
    _: AuthenticatedUser = Depends(require_user),
) -> list[dict[str, str]]:
    """UAE-restricted address autocomplete. Returns [] on failure."""
    suggestions = await google_maps.autocomplete(input_text, session_token)
    return [asdict(s) for s in suggestions]


@router.get("/place-details")
async def place_details_endpoint(
    place_id: str = Query(..., alias="placeId"),
    session_token: str | None = Query(None, alias="sessionToken"),
    _: AuthenticatedUser = Depends(require_user),
) -> dict[str, object] | None:
    """Resolve a Place ID to coordinates + formatted address."""
    details = await google_maps.get_place_details(place_id, session_token)
    if details is None:
        return None
    return {
        "placeId": details.placeId,
        "name": details.name,
        "address": details.address,
        "location": {"lat": details.location.lat, "lng": details.location.lng},
    }
