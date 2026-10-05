"""NCR-core administrative boundary — used to clip coverage to the real urban shape instead
of an artificial disk. The footprint is the union of Delhi (NCT) plus the four contiguous
NCR districts: Gurugram, Faridabad, Gautam Buddha Nagar (Noida/Greater Noida) and Ghaziabad.

Fetched from OSM via Overpass and cached to disk, since we only need the polygon once — and
so cloud/CI environments (where Overpass often blocks shared IPs) can use the committed cache
instead of hitting the network."""

from __future__ import annotations

import json
from pathlib import Path

from shapely.geometry import LineString, mapping, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import linemerge, polygonize, unary_union

from app.core.logging import get_logger
from app.ingestion.overpass import overpass_query

log = get_logger("boundary")

_CACHE = Path(__file__).resolve().parents[3] / ".cache" / "ncr_core_boundary.geojson"

# Delhi NCT (admin_level 4) + the four core NCR districts (admin_level 5). The admin_level=5
# filter avoids same-named admin_level=6 sub-district duplicates.
_QUERY = (
    "[out:json][timeout:180];"
    "("
    'rel["boundary"="administrative"]["admin_level"="4"]["name"="Delhi"];'
    'rel["boundary"="administrative"]["admin_level"="5"]'
    '["name"~"Gurugram|Faridabad|Gautam Buddha Nagar|Ghaziabad"];'
    ");out geom;"
)


def _load_cache() -> BaseGeometry | None:
    if not _CACHE.exists():
        return None
    try:
        return shape(json.loads(_CACHE.read_text()))
    except Exception:
        return None


def _assemble(data: dict) -> BaseGeometry | None:  # type: ignore[type-arg]
    """Union every returned admin relation into one footprint. Each relation's boundary ways
    are merged and polygonized independently, then all the pieces are unioned together."""
    polys: list[BaseGeometry] = []
    for rel in (e for e in data.get("elements", []) if e.get("type") == "relation"):
        lines: list[LineString] = []
        for m in rel.get("members", []):
            geom = m.get("geometry")
            if m.get("type") == "way" and geom and len(geom) >= 2:
                lines.append(LineString([(p["lon"], p["lat"]) for p in geom]))
        if not lines:
            continue
        polys.extend(polygonize(linemerge(lines)))
    if not polys:
        return None
    result: BaseGeometry = unary_union(polys)
    return result if result.is_valid and not result.is_empty else None


async def fetch_ncr_boundary() -> BaseGeometry | None:
    """The NCR-core polygon (cached), or None if unavailable (caller falls back to a disk)."""
    cached = _load_cache()
    if cached is not None:
        return cached
    try:
        geom = _assemble(await overpass_query(_QUERY))
    except Exception:
        geom = None
    if geom is not None:
        _CACHE.parent.mkdir(parents=True, exist_ok=True)
        _CACHE.write_text(json.dumps(mapping(geom)))
        log.info("boundary_cached", bounds=[round(x, 2) for x in geom.bounds])
    return geom
