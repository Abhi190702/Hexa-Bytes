"""Read API for the Environmental Stress heatmap.

Performance: the latest bucket's cells are cached in-process and filtered by viewport in
memory, and responses are serialized with orjson — so a warm request is ~milliseconds even
for the full city. The cache re-checks the latest bucket at most every minute (cheap) and
only reloads when an ingest produces a new bucket.
"""

from __future__ import annotations

import time
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import ORJSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.session import get_session
from app.models.stress_cell import StressCell
from app.schemas.stress import StressCellCollection, StressCellOut

router = APIRouter()
log = get_logger("stress")

# Cap per response (viewport-bounded queries keep real ones well under this).
MAX_CELLS = 100_000
_RECHECK_SECONDS = 60.0
_cache: dict[str, Any] = {"bucket": None, "cells": [], "checked": 0.0}


def _r(x: float | None, n: int) -> float | None:
    return round(x, n) if x is not None else None


def _to_dict(row: StressCell) -> dict[str, Any]:
    # Rounded to shrink the payload — the map needs no more precision than this.
    return {
        "h3": row.h3_r9,
        "lat": round(row.centroid_lat, 5),
        "lng": round(row.centroid_lng, 5),
        "esi": round(row.esi, 1),
        "scores": {
            "noise": _r(row.noise_score, 1),
            "density": _r(row.density_score, 1),
            "heat": _r(row.heat_score, 1),
            "aqi": _r(row.aqi_score, 1),
        },
        "confidence": round(row.confidence, 3),
        "greenery": _r(row.greenery, 2),
        "locality": row.locality,
        "updated_at": row.updated_at,
    }


async def _latest_cells(session: AsyncSession) -> tuple[datetime | None, list[dict[str, Any]]]:
    """Cached list of the newest bucket's cells (reloaded only when the bucket changes)."""
    now = time.monotonic()
    if _cache["cells"] and now - _cache["checked"] < _RECHECK_SECONDS:
        return _cache["bucket"], _cache["cells"]

    bucket = await session.scalar(select(func.max(StressCell.bucket)))
    _cache["checked"] = now
    if bucket is None:
        _cache["bucket"], _cache["cells"] = None, []
        return None, []
    if bucket == _cache["bucket"] and _cache["cells"]:
        return bucket, _cache["cells"]

    rows = await session.scalars(select(StressCell).where(StressCell.bucket == bucket))
    cells = [_to_dict(r) for r in rows]
    _cache["bucket"], _cache["cells"] = bucket, cells
    log.info("stress_cache_reloaded", cells=len(cells))
    return bucket, cells


def _parse_bbox(bbox: str) -> tuple[float, float, float, float]:
    try:
        parts = [float(x) for x in bbox.split(",")]
    except ValueError:
        raise HTTPException(400, "bbox must be 'minLng,minLat,maxLng,maxLat' floats") from None
    if len(parts) != 4:
        raise HTTPException(400, "bbox must have 4 comma-separated values")
    min_lng, min_lat, max_lng, max_lat = parts
    if min_lng >= max_lng or min_lat >= max_lat:
        raise HTTPException(400, "bbox min values must be less than max values")
    return min_lng, min_lat, max_lng, max_lat


@router.get("/stress/cells", response_model=StressCellCollection)
async def get_stress_cells(
    bbox: Annotated[str, Query(description="minLng,minLat,maxLng,maxLat")],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ORJSONResponse:
    min_lng, min_lat, max_lng, max_lat = _parse_bbox(bbox)
    bucket, cells = await _latest_cells(session)
    headers = {"Cache-Control": "public, max-age=120, stale-while-revalidate=600"}

    if bucket is None:
        return ORJSONResponse(
            {"bucket": None, "count": 0, "truncated": False, "cells": []},
            # A first-run ingest can finish moments after this response. Do not let the
            # browser/CDN pin the bootstrap state while the client is polling for cells.
            headers={"Cache-Control": "no-store"},
        )

    out = [
        c
        for c in cells
        if min_lng <= c["lng"] <= max_lng and min_lat <= c["lat"] <= max_lat
    ]
    truncated = len(out) > MAX_CELLS
    if truncated:
        out = out[:MAX_CELLS]
        log.warning("stress_cells_truncated", bbox=bbox, cap=MAX_CELLS)

    return ORJSONResponse(
        {"bucket": bucket, "count": len(out), "truncated": truncated, "cells": out},
        headers=headers,
    )


@router.get("/stress/cells/{h3}", response_model=StressCellOut)
async def get_stress_cell(
    h3: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StressCellOut:
    latest = await session.scalar(
        select(func.max(StressCell.bucket)).where(StressCell.h3_r9 == h3)
    )
    if latest is None:
        raise HTTPException(404, "cell not found")
    row = await session.scalar(
        select(StressCell).where(StressCell.bucket == latest, StressCell.h3_r9 == h3)
    )
    if row is None:
        raise HTTPException(404, "cell not found")
    return StressCellOut(
        h3=row.h3_r9,
        lat=row.centroid_lat,
        lng=row.centroid_lng,
        esi=row.esi,
        scores={
            "noise": row.noise_score,
            "density": row.density_score,
            "heat": row.heat_score,
            "aqi": row.aqi_score,
        },
        confidence=row.confidence,
        greenery=row.greenery,
        locality=row.locality,
        updated_at=row.updated_at,
    )
