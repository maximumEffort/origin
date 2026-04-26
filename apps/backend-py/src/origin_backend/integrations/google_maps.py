"""
Google Maps Platform integration.

Mirrors apps/backend/src/integrations/google-maps/google-maps.service.ts.

Used for:
  1. Pickup / drop-off autocomplete (UAE only)
  2. Place details (coordinates + formatted address) for a Place ID
  3. Driving-distance lookups (delivery surcharge logic)
  4. Geocoding free-text addresses

The API key is server-side and never exposed to the browser.

If GOOGLE_MAPS_API_KEY is unset, every function is a clean no-op (empty
list / None) — same as the Node service when the key is missing.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from origin_backend.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://maps.googleapis.com/maps/api"


@dataclass(frozen=True)
class LatLng:
    lat: float
    lng: float


@dataclass(frozen=True)
class PlaceSuggestion:
    placeId: str
    description: str


@dataclass(frozen=True)
class PlaceDetails:
    placeId: str
    name: str
    address: str
    location: LatLng


@dataclass(frozen=True)
class DistanceResult:
    distanceKm: float
    durationMinutes: int
    durationText: str


def _api_key() -> str | None:
    return settings.google_maps_api_key or None


async def _get(
    client: httpx.AsyncClient, path: str, params: dict[str, str]
) -> dict[str, Any] | None:
    """Single retry-free GET against the Maps API; logs and returns None on failure."""
    try:
        r = await client.get(f"{BASE_URL}{path}", params=params, timeout=10.0)
        r.raise_for_status()
        data: dict[str, Any] = r.json()
        return data
    except httpx.HTTPError as e:
        logger.error("Google Maps %s failed: %s", path, e)
        return None


async def autocomplete(input_text: str, session_token: str | None = None) -> list[PlaceSuggestion]:
    """UAE-restricted Place autocomplete for pickup/drop-off pickers."""
    api_key = _api_key()
    if not api_key:
        return []

    params: dict[str, str] = {
        "input": input_text,
        "key": api_key,
        "components": "country:ae",
        "language": "en",
        "types": "establishment|geocode",
    }
    if session_token:
        params["sessiontoken"] = session_token

    async with httpx.AsyncClient() as client:
        data = await _get(client, "/place/autocomplete/json", params)
    if data is None:
        return []
    if data.get("status") not in {"OK", "ZERO_RESULTS"}:
        logger.warning("Places autocomplete: %s", data.get("status"))
        return []
    return [
        PlaceSuggestion(placeId=p["place_id"], description=p["description"])
        for p in data.get("predictions", [])
    ]


async def get_place_details(place_id: str, session_token: str | None = None) -> PlaceDetails | None:
    """Resolve a Place ID to its coordinates + formatted address."""
    api_key = _api_key()
    if not api_key:
        return None

    params: dict[str, str] = {
        "place_id": place_id,
        "fields": "place_id,name,formatted_address,geometry",
        "key": api_key,
        "language": "en",
    }
    if session_token:
        params["sessiontoken"] = session_token

    async with httpx.AsyncClient() as client:
        data = await _get(client, "/place/details/json", params)
    if data is None or data.get("status") != "OK":
        if data is not None:
            logger.warning("Place details: %s", data.get("status"))
        return None
    result = data["result"]
    location = result["geometry"]["location"]
    return PlaceDetails(
        placeId=result["place_id"],
        name=result["name"],
        address=result["formatted_address"],
        location=LatLng(lat=location["lat"], lng=location["lng"]),
    )


async def get_distance(origin: LatLng, destination: LatLng) -> DistanceResult | None:
    """Driving distance between two coordinates (delivery surcharge logic)."""
    api_key = _api_key()
    if not api_key:
        return None

    params = {
        "origins": f"{origin.lat},{origin.lng}",
        "destinations": f"{destination.lat},{destination.lng}",
        "mode": "driving",
        "key": api_key,
        "region": "ae",
    }
    async with httpx.AsyncClient() as client:
        data = await _get(client, "/distancematrix/json", params)
    if data is None:
        return None

    rows = data.get("rows") or []
    elements = rows[0].get("elements") if rows else None
    element = elements[0] if elements else None
    if not element or element.get("status") != "OK":
        logger.warning("Distance Matrix: %s", element.get("status") if element else "no element")
        return None
    return DistanceResult(
        distanceKm=element["distance"]["value"] / 1000,
        durationMinutes=-(-element["duration"]["value"] // 60),  # ceil to whole minutes
        durationText=element["duration"]["text"],
    )


async def geocode(address: str) -> LatLng | None:
    """Free-text address → coordinates (UAE-restricted)."""
    api_key = _api_key()
    if not api_key:
        return None

    params = {
        "address": address,
        "key": api_key,
        "region": "ae",
        "components": "country:AE",
    }
    async with httpx.AsyncClient() as client:
        data = await _get(client, "/geocode/json", params)
    if data is None or data.get("status") != "OK":
        return None
    results = data.get("results") or []
    loc = results[0].get("geometry", {}).get("location") if results else None
    if not loc:
        return None
    return LatLng(lat=loc["lat"], lng=loc["lng"])
