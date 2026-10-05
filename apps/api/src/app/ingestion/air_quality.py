"""Real air quality from Open-Meteo (free, no API key). Modeled US AQI on a coarse grid,
IDW-interpolated to cells. (WAQI station data in aqi.py is an optional higher-fidelity
alternative when a token is configured.)"""

from __future__ import annotations

from typing import Any

import httpx

from app.ingestion.http_retry import with_retries
from app.ingestion.interpolate import Point

OPEN_METEO_AQ_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


async def fetch_aqi_grid(
    bbox: tuple[float, float, float, float], nx: int = 6, ny: int = 6
) -> list[Point]:
    """Current US AQI at an nx×ny grid over bbox, as (lat, lng, aqi)."""
    min_lng, min_lat, max_lng, max_lat = bbox
    lats: list[float] = []
    lngs: list[float] = []
    for i in range(ny):
        for j in range(nx):
            lats.append(round(min_lat + (max_lat - min_lat) * i / (ny - 1), 4))
            lngs.append(round(min_lng + (max_lng - min_lng) * j / (nx - 1), 4))

    params = {
        "latitude": ",".join(str(x) for x in lats),
        "longitude": ",".join(str(x) for x in lngs),
        "current": "us_aqi",
    }
    async def _call() -> Any:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(OPEN_METEO_AQ_URL, params=params)
            resp.raise_for_status()
            return resp.json()

    data = await with_retries(_call)

    items = data if isinstance(data, list) else [data]
    out: list[Point] = []
    for it in items:
        aqi = it.get("current", {}).get("us_aqi")
        if aqi is not None:
            out.append((float(it["latitude"]), float(it["longitude"]), float(aqi)))
    return out
