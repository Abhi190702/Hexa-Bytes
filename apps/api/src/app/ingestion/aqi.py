"""Real AQI from WAQI (aqicn.org) — aggregates Delhi's CPCB monitoring stations."""

from __future__ import annotations

import httpx

from app.ingestion.interpolate import Point

WAQI_BOUNDS_URL = "https://api.waqi.info/map/bounds/"


async def fetch_waqi_stations(
    bbox: tuple[float, float, float, float], token: str
) -> list[Point]:
    """Stations within bbox as (lat, lng, aqi). Stations reporting '-' are skipped."""
    min_lng, min_lat, max_lng, max_lat = bbox
    params = {"latlng": f"{min_lat},{min_lng},{max_lat},{max_lng}", "token": token}

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(WAQI_BOUNDS_URL, params=params)
        resp.raise_for_status()
        payload = resp.json()

    if payload.get("status") != "ok":
        raise RuntimeError(f"WAQI error: {payload.get('data')!r}")

    stations: list[Point] = []
    for s in payload.get("data", []):
        try:
            aqi = float(s["aqi"])
        except (KeyError, TypeError, ValueError):
            continue  # "-" / missing reading
        stations.append((float(s["lat"]), float(s["lon"]), aqi))
    return stations
