"""Reverse geocoding proxy (OpenStreetMap Nominatim) so cell hovers can name a locality.

Proxied (not called from the browser) to attach a polite User-Agent and cache results,
respecting Nominatim's usage policy. Cache key is the rounded coordinate, which also
collapses all hovers within one ~100m cell to a single upstream call.
"""

from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
_cache: dict[tuple[float, float], str | None] = {}


class LocalityOut(BaseModel):
    locality: str | None


def _pick_locality(address: dict[str, str]) -> str | None:
    for key in ("suburb", "neighbourhood", "city_district", "town", "village", "city"):
        if address.get(key):
            return address[key]
    return None


@router.get("/geocode/reverse", response_model=LocalityOut)
async def reverse_geocode(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
) -> LocalityOut:
    key = (round(lat, 3), round(lng, 3))
    if key in _cache:
        return LocalityOut(locality=_cache[key])

    settings = get_settings()
    params: dict[str, str | float] = {
        "format": "jsonv2",
        "lat": lat,
        "lon": lng,
        "zoom": "14",
        "addressdetails": "1",
    }
    headers = {"User-Agent": settings.geocoder_user_agent}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers)
            resp.raise_for_status()
            address = resp.json().get("address", {})
        locality = _pick_locality(address)
    except Exception:  # geocoding is best-effort; never fail the hover
        locality = None

    _cache[key] = locality
    return LocalityOut(locality=locality)
