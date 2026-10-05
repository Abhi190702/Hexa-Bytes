"""Minimal OpenStreetMap Overpass client. Used to derive real geospatial proxies for
factors with no live feed (crowd density from POIs, noise from roads, greenery, localities).

Retries with backoff across mirrors — the public Overpass instances throttle aggressively,
especially from shared cloud IPs (e.g. free hosting)."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

import httpx

from app.core.logging import get_logger

log = get_logger("overpass")

BBox = tuple[float, float, float, float]

_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
_HEADERS = {
    "User-Agent": "urban-stress-platform/0.1 (geospatial research)",
    "Accept": "application/json",
}

# Public Overpass instances allow only a couple of concurrent slots per IP. With NCR
# coverage we fan out many tiled queries, so cap total in-flight requests app-wide and let
# the retry/backoff absorb throttling. One semaphore guards every overpass_query call.
# This path is only exercised when (re)building the committed OSM-feature cache — the hourly
# ingest reads that cache and never touches Overpass — so it favours patience over speed.
_MAX_CONCURRENCY = 2
_SEM = asyncio.Semaphore(_MAX_CONCURRENCY)
_MAX_ATTEMPTS = 6


def _backoff(attempt: int) -> float:
    return min(60.0, 5.0 * (attempt + 1))  # 5,10,15,…,30s, capped


async def overpass_query(query: str) -> dict[str, Any]:
    last: Exception | None = None
    async with _SEM:
        for attempt in range(_MAX_ATTEMPTS):
            endpoint = _ENDPOINTS[attempt % len(_ENDPOINTS)]
            try:
                async with httpx.AsyncClient(timeout=180, headers=_HEADERS) as client:
                    resp = await client.post(endpoint, data={"data": query})
                    resp.raise_for_status()
                    result: dict[str, Any] = resp.json()
                    return result
            except httpx.HTTPStatusError as exc:
                last = exc
                # Honour Retry-After on 429/503/504 when the server sends it.
                hdr = exc.response.headers.get("Retry-After", "")
                wait = float(hdr) if hdr.isdigit() else _backoff(attempt)
                log.warning("overpass_retry", attempt=attempt, status=exc.response.status_code)
                await asyncio.sleep(wait)
            except Exception as exc:
                last = exc
                log.warning("overpass_retry", attempt=attempt, error=str(exc))
                await asyncio.sleep(_backoff(attempt))
    raise RuntimeError(f"overpass failed after retries: {last}")


def bbox_str(bbox: BBox) -> str:
    """(minLng,minLat,maxLng,maxLat) -> Overpass '(south,west,north,east)'."""
    min_lng, min_lat, max_lng, max_lat = bbox
    return f"{min_lat},{min_lng},{max_lat},{max_lng}"


def tile_bbox(bbox: BBox, nx: int, ny: int) -> list[BBox]:
    """Split a bbox into an nx×ny grid of sub-bboxes."""
    min_lng, min_lat, max_lng, max_lat = bbox
    dx = (max_lng - min_lng) / nx
    dy = (max_lat - min_lat) / ny
    return [
        (min_lng + j * dx, min_lat + i * dy, min_lng + (j + 1) * dx, min_lat + (i + 1) * dy)
        for i in range(ny)
        for j in range(nx)
    ]


async def tiled_elements(
    build_query: Callable[[BBox], str], bbox: BBox, nx: int = 3, ny: int = 3
) -> list[dict[str, Any]]:
    """Run `build_query` over an nx×ny tiling of `bbox` (concurrency-capped by the semaphore)
    and return the merged elements, de-duplicated by (type, id). A single way/node that
    straddles a tile edge is returned by both tiles with full geometry, so dedup keeps one
    intact copy. One failed tile is logged and skipped rather than sinking the whole fetch."""
    tiles = tile_bbox(bbox, nx, ny)
    results = await asyncio.gather(
        *(overpass_query(build_query(t)) for t in tiles), return_exceptions=True
    )
    seen: set[tuple[str | None, int | None]] = set()
    merged: list[dict[str, Any]] = []
    for r in results:
        if isinstance(r, BaseException):
            log.warning("tile_failed", error=str(r))
            continue
        for el in r.get("elements", []):
            key = (el.get("type"), el.get("id"))
            if key in seen:
                continue
            seen.add(key)
            merged.append(el)
    return merged
