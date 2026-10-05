"""Disk cache for the static OSM-derived features (roads, greenery, water, POI counts,
places). These don't change hour to hour, but a live NCR-scale Overpass fetch is slow and
unreliable — so we fetch once, cache to .cache, and commit the result. The hourly ingest
then reads the cache and only pulls live temperature + AQI; Overpass is off the hot path.

Regenerate after changing NCR_BBOX (or any OSM query) with:  python -m app.ingestion.build_osm_cache
The bbox/resolution is stamped into each file and a mismatch is ignored (forces a refetch)."""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from shapely.geometry import LineString, Polygon, mapping, shape

from app.core.logging import get_logger
from app.ingestion.osm import (
    fetch_green_polygons,
    fetch_place_points,
    fetch_poi_counts_by_cell,
    fetch_road_lines,
    fetch_water_polygons,
)
from app.ingestion.overpass import BBox

log = get_logger("osm_cache")

_CACHE_DIR = Path(__file__).resolve().parents[3] / ".cache"


@dataclass(slots=True)
class OsmFeatures:
    roads: list[LineString]
    green: list[Polygon]
    water: list[Polygon]
    poi_counts: dict[str, int]
    places: list[tuple[float, float, str]]


def _stamp(bbox: BBox, resolution: int | None = None) -> dict[str, Any]:
    s: dict[str, Any] = {"bbox": [round(x, 4) for x in bbox]}
    if resolution is not None:
        s["resolution"] = resolution
    return s


def _matches(obj: dict[str, Any], bbox: BBox, resolution: int | None = None) -> bool:
    if obj.get("bbox") != [round(x, 4) for x in bbox]:
        return False
    return resolution is None or obj.get("resolution") == resolution


def _path(name: str) -> Path:
    return _CACHE_DIR / f"ncr_{name}.json"


# --- per-feature load/save ---------------------------------------------------------------
def _load_geoms(name: str, bbox: BBox) -> list[Any] | None:
    p = _path(name)
    if not p.exists():
        return None
    obj = json.loads(p.read_text())
    if not _matches(obj, bbox):
        return None
    return [shape(g) for g in obj["geometries"]]


def _save_geoms(name: str, geoms: list[Any], bbox: BBox) -> None:
    obj = {**_stamp(bbox), "geometries": [mapping(g) for g in geoms]}
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    _path(name).write_text(json.dumps(obj))


def _load_pois(bbox: BBox, resolution: int) -> dict[str, int] | None:
    p = _path("pois")
    if not p.exists():
        return None
    obj = json.loads(p.read_text())
    if not _matches(obj, bbox, resolution):
        return None
    return {str(k): int(v) for k, v in obj["counts"].items()}


def _load_places(bbox: BBox) -> list[tuple[float, float, str]] | None:
    p = _path("places")
    if not p.exists():
        return None
    obj = json.loads(p.read_text())
    if not _matches(obj, bbox):
        return None
    return [(float(a), float(b), str(c)) for a, b, c in obj["places"]]


async def load_or_fetch_features(
    bbox: BBox, resolution: int, *, allow_fetch: bool = True
) -> OsmFeatures:
    """Return the OSM features for `bbox`, reading each from cache and fetching only what is
    missing (each fetch is resilient — a failure yields empty for that feature and is NOT
    cached, so it retries next time). With allow_fetch=False, missing features stay empty
    (used by the hourly ingest, which must never block on Overpass)."""
    roads = _load_geoms("roads", bbox)
    green = _load_geoms("green", bbox)
    water = _load_geoms("water", bbox)
    pois = _load_pois(bbox, resolution)
    places = _load_places(bbox)

    if allow_fetch:
        if roads is None:
            roads = await _fetch_and_cache_geoms("roads", lambda: fetch_road_lines(bbox), bbox)
        if green is None:
            green = await _fetch_and_cache_geoms("green", lambda: fetch_green_polygons(bbox), bbox)
        if water is None:
            water = await _fetch_and_cache_geoms("water", lambda: fetch_water_polygons(bbox), bbox)
        if pois is None:
            pois = await _fetch_and_cache_pois(bbox, resolution)
        if places is None:
            places = await _fetch_and_cache_places(bbox)

    return OsmFeatures(
        roads=roads or [],
        green=green or [],
        water=water or [],
        poi_counts=pois or {},
        places=places or [],
    )


async def _fetch_and_cache_geoms(
    name: str, fetch: Callable[[], Awaitable[list[Any]]], bbox: BBox
) -> list[Any]:
    try:
        geoms = await fetch()
    except Exception as exc:
        log.warning("osm_fetch_failed", feature=name, error=str(exc))
        return []
    if geoms:
        _save_geoms(name, geoms, bbox)
        log.info("osm_cached", feature=name, count=len(geoms))
    return geoms


async def _fetch_and_cache_pois(bbox: BBox, resolution: int) -> dict[str, int]:
    try:
        counts = await fetch_poi_counts_by_cell(bbox, resolution)
    except Exception as exc:
        log.warning("osm_fetch_failed", feature="pois", error=str(exc))
        return {}
    if counts:
        obj = {**_stamp(bbox, resolution), "counts": counts}
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _path("pois").write_text(json.dumps(obj))
        log.info("osm_cached", feature="pois", cells=len(counts))
    return counts


async def _fetch_and_cache_places(bbox: BBox) -> list[tuple[float, float, str]]:
    try:
        places = await fetch_place_points(bbox)
    except Exception as exc:
        log.warning("osm_fetch_failed", feature="places", error=str(exc))
        return []
    if places:
        obj = {**_stamp(bbox), "places": [[a, b, c] for a, b, c in places]}
        _CACHE_DIR.mkdir(parents=True, exist_ok=True)
        _path("places").write_text(json.dumps(obj))
        log.info("osm_cached", feature="places", count=len(places))
    return places
