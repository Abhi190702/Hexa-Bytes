"""Real temperature from MET Norway (api.met.no) — free, no key, and (unlike
api.open-meteo.com) not blocked from cloud IPs like Render. Sampled on a small grid and
IDW-interpolated to cells (temperature is spatially smooth). MET requires a descriptive
User-Agent per their terms of service."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.ingestion.http_retry import with_retries
from app.ingestion.interpolate import Point

MET_NO_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
_HEADERS = {"User-Agent": "EvoComb/0.1 (https://github.com/aksh08022006/EvoComb)"}


async def fetch_temperature_grid(
    bbox: tuple[float, float, float, float], nx: int = 3, ny: int = 3
) -> list[Point]:
    """Current 2m temperature (°C) at an nx×ny grid over bbox, as (lat, lng, temp)."""
    min_lng, min_lat, max_lng, max_lat = bbox
    coords = [
        (
            round(min_lat + (max_lat - min_lat) * i / (ny - 1), 4),
            round(min_lng + (max_lng - min_lng) * j / (nx - 1), 4),
        )
        for i in range(ny)
        for j in range(nx)
    ]

    async with httpx.AsyncClient(timeout=20, headers=_HEADERS) as client:

        async def one(lat: float, lng: float) -> Point | None:
            async def _call() -> Any:
                resp = await client.get(MET_NO_URL, params={"lat": lat, "lon": lng})
                resp.raise_for_status()
                return resp.json()

            try:
                data = await with_retries(_call)
                temp = data["properties"]["timeseries"][0]["data"]["instant"]["details"][
                    "air_temperature"
                ]
                return (lat, lng, float(temp))
            except Exception:
                return None  # skip a failed point; IDW handles gaps

        results = await asyncio.gather(*(one(lat, lng) for lat, lng in coords))

    return [p for p in results if p is not None]
