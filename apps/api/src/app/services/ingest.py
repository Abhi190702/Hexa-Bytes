"""Real-data ingestion — replaces the synthetic simulator with real/derived inputs:

- Heat:    MET Norway ambient temperature + a modeled urban-heat-island offset
           (built-up density raises it) — gives real per-cell variation, not a flat field
- AQI:     Open-Meteo US AQI (real, no key)
- Density: OSM POI density per H3 cell (proxy for crowding)
- Noise:   distance to nearest OSM major road (proxy for traffic noise)
- Greenery: OSM parks/forest lower a cell's ESI (relief)

Coverage is clipped to the urban footprint (cells near POIs), so the map is Delhi-shaped
rather than an artificial disk. Noise + density are *modeled proxies* (no public live feed);
true values need ESP32 sensors. The output is an irregular, real surface driven by actual
city structure — not a synthetic gradient.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable
from datetime import UTC, datetime

import h3
from sqlalchemy import delete, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.h3_utils import cell_to_latlng
from app.domain.methodology import H3_RESOLUTION, urban_heat_offset
from app.ingestion.air_quality import fetch_aqi_grid
from app.ingestion.boundary import fetch_ncr_boundary
from app.ingestion.geofeatures import GreenIndex, PlaceIndex, RoadNoiseIndex, WaterIndex
from app.ingestion.interpolate import idw
from app.ingestion.osm_cache import load_or_fetch_features
from app.ingestion.weather import fetch_temperature_grid
from app.models.reading import Reading
from app.services.aggregation import recompute_cells
from app.services.coverage import NCR_BBOX, delhi_cells

log = get_logger("ingest")

_REPLACED_SOURCES = ("simulator", "waqi", "open_meteo", "met_no", "osm")

# Built-up intensity (0–1) for the UHI proxy, derived from data already fetched per cell:
# proximity to major roads (via the noise dB proxy) + POI clustering. Concrete/asphalt and
# dense activity = hotter surface than ambient air.
_NOISE_FLOOR_DB = 42.0  # mirrors geofeatures._NOISE_FLOOR_DB (quiet baseline)
_NOISE_AT_ROAD_DB = 80.0  # mirrors geofeatures._NOISE_AT_ROAD_DB (on a major road)
_BUILTUP_POI_FULL = 30.0  # POIs in a res-9 cell that read as fully built-up


def _builtup(noise_db: float | None, poi_count: int) -> float:
    """0–1 built-up intensity for a cell from its road proximity + POI density."""
    road_span = _NOISE_AT_ROAD_DB - _NOISE_FLOOR_DB
    road = 0.0 if noise_db is None else (noise_db - _NOISE_FLOOR_DB) / road_span
    poi = poi_count / _BUILTUP_POI_FULL
    return max(0.0, min(1.0, 0.6 * road + 0.5 * poi))

async def _safe[T](coro: Awaitable[T], default: T, label: str) -> T:
    """Run a source fetch; on failure log and return a default so one flaky/blocked source
    (e.g. Overpass refusing a cloud IP) doesn't sink the whole ingest."""
    try:
        return await coro
    except Exception as exc:  # resilience: one blocked source shouldn't sink the ingest
        log.warning("source_failed", source=label, error=str(exc))
        return default


def _reading(now: datetime, cell: str, metric: str, value: float, source: str) -> dict[str, object]:
    return {
        "time": now,
        "sensor_id": f"{source}:{cell}",
        "metric": metric,
        "value": value,
        "h3_r9": cell,
        "source": source,
    }


async def _coverage_cells() -> list[str]:
    """Every H3 cell whose centre falls inside the NCR-core admin footprint, via direct
    polygon fill (h3.geo_to_cells). Falls back to the Delhi-core disk if the boundary can't
    be fetched."""
    boundary = await fetch_ncr_boundary()
    if boundary is None:
        log.warning("boundary_unavailable_using_disk")
        return delhi_cells()
    cells = [str(c) for c in h3.geo_to_cells(boundary, H3_RESOLUTION)]
    log.info("boundary_fill", cells=len(cells))
    return cells


async def ingest_real(session: AsyncSession, now: datetime | None = None) -> dict[str, object]:
    now = now or datetime.now(UTC)

    # Only temperature + AQI are live (fast, reliable APIs); fetch them concurrently. The
    # static OSM features come from the committed cache (allow_fetch=False), so the hourly
    # job never blocks on Overpass.
    temps, aqis = await asyncio.gather(
        _safe(fetch_temperature_grid(NCR_BBOX, nx=5, ny=5), [], "met_no_temp"),
        _safe(fetch_aqi_grid(NCR_BBOX), [], "open_meteo_aqi"),
    )
    features = await load_or_fetch_features(NCR_BBOX, H3_RESOLUTION, allow_fetch=False)
    poi_counts = features.poi_counts
    log.info(
        "fetched_sources",
        temp=len(temps),
        aqi=len(aqis),
        poi_cells=len(poi_counts),
        green=len(features.green),
        water=len(features.water),
        roads=len(features.roads),
        places=len(features.places),
    )

    green_idx = GreenIndex(features.green)
    water_idx = WaterIndex(features.water)
    road_idx = RoadNoiseIndex(features.roads)
    place_idx = PlaceIndex(features.places)
    candidates = await _coverage_cells()

    rows: list[dict[str, object]] = []
    green_factors: dict[str, float] = {}
    localities: dict[str, str | None] = {}
    # Score every cell in the NCR footprint for continuous coverage. Rural/low-activity cells
    # still carry real AQI, heat and greenery data (noise/density just read low there), so the
    # map is a gap-free surface rather than only the road network.
    for cell in candidates:
        lat, lng = cell_to_latlng(cell)
        noise = road_idx.noise_db(lat, lng)
        poi_count = int(poi_counts.get(cell, 0))

        ambient = idw(temps, lat, lng) if temps else None
        aqi = idw(aqis, lat, lng) if aqis else None
        green_factors[cell] = green_idx.factor(lat, lng)
        localities[cell] = place_idx.nearest_name(lat, lng)

        # Heat = ambient air temp + modeled urban-heat-island offset: built-up density warms,
        # water cools. Turns a near-flat ambient field into real per-cell variation.
        if ambient is not None:
            builtup = _builtup(noise, poi_count)
            water = water_idx.factor(lat, lng)
            heat = ambient + urban_heat_offset(builtup, water)
            rows.append(_reading(now, cell, "heat", heat, "met_no"))
        if aqi is not None:
            rows.append(_reading(now, cell, "aqi", aqi, "open_meteo"))
        if noise is not None:
            rows.append(_reading(now, cell, "noise", noise, "osm"))
        rows.append(_reading(now, cell, "density", float(poi_count), "osm"))
    log.info("cells_scored", count=len(candidates))

    await session.execute(delete(Reading).where(Reading.source.in_(_REPLACED_SOURCES)))
    if rows:
        await session.execute(insert(Reading), rows)
    await session.commit()

    cell_count = await recompute_cells(
        session, now, green_factors=green_factors, localities=localities
    )
    sources = {
        "temp": len(temps),
        "aqi": len(aqis),
        "poi_cells": len(poi_counts),
        "green": len(features.green),
        "water": len(features.water),
        "roads": len(features.roads),
        "places": len(features.places),
    }
    log.info("ingest_complete", readings=len(rows), stress_cells=cell_count, **sources)
    return {"cells": cell_count, "sources": sources}
