"""Derived geospatial proxies from OpenStreetMap (via Overpass).

Crowd density has no public live feed, so we proxy it from the spatial density of POIs
(amenities + shops): markets, transit, malls, eateries cluster where people congregate.
Each POI is binned to its H3 cell — the count per cell is the crowding proxy.

Over NCR-scale areas a single Overpass query times out / overflows, so every fetch is
tiled across the bbox and merged (see app.ingestion.overpass.tiled_elements).
"""

from __future__ import annotations

from collections import Counter

from shapely.geometry import LineString, Polygon

from app.db.h3_utils import latlng_to_cell
from app.ingestion.overpass import BBox, bbox_str, tiled_elements


async def fetch_poi_counts_by_cell(bbox: BBox, resolution: int) -> dict[str, int]:
    """Count amenity/shop POIs per H3 cell within bbox (tiled)."""

    def q(b: BBox) -> str:
        s = bbox_str(b)
        return f'[out:json][timeout:120];(node["amenity"]({s});node["shop"]({s}););out;'

    elements = await tiled_elements(q, bbox, nx=5, ny=5)
    counts: Counter[str] = Counter()
    for el in elements:
        if el.get("type") != "node":
            continue
        cell = latlng_to_cell(float(el["lat"]), float(el["lon"]), resolution)
        counts[cell] += 1
    return dict(counts)


async def fetch_place_points(bbox: BBox) -> list[tuple[float, float, str]]:
    """Named places (suburbs, neighbourhoods, towns) as (lat, lng, name) — used to label
    each cell with its locality without per-click geocoding (tiled)."""

    def q(b: BBox) -> str:
        s = bbox_str(b)
        return (
            f"[out:json][timeout:90];"
            f'node["place"~"city|town|suburb|neighbourhood|village|quarter|locality"]["name"]({s});'
            f"out;"
        )

    elements = await tiled_elements(q, bbox, nx=2, ny=2)
    places: list[tuple[float, float, str]] = []
    for el in elements:
        name = el.get("tags", {}).get("name")
        if el.get("type") == "node" and name:
            places.append((float(el["lat"]), float(el["lon"]), str(name)))
    return places


async def fetch_green_polygons(bbox: BBox) -> list[Polygon]:
    """Parks / forest / grass / wood polygons — greenery relief (lowers stress). Excludes
    farmland/orchard/meadow: those dominate rural NCR by volume but aren't urban greenery,
    and their cells are dropped by the built-up clip anyway (tiled)."""

    def q(b: BBox) -> str:
        s = bbox_str(b)
        return (
            f"[out:json][timeout:120];"
            f'(way["leisure"~"park|garden|nature_reserve|golf_course"]({s});'
            f'way["landuse"~"forest|grass|recreation_ground|village_green|cemetery"]({s});'
            f'way["natural"~"wood|scrub|grassland|heath"]({s}););'
            f"out geom;"
        )

    elements = await tiled_elements(q, bbox, nx=4, ny=4)
    return _polygons(elements)


async def fetch_water_polygons(bbox: BBox) -> list[Polygon]:
    """Rivers / lakes / reservoirs — used to cool the heat UHI proxy (tiled)."""

    def q(b: BBox) -> str:
        s = bbox_str(b)
        return (
            f"[out:json][timeout:120];"
            f'(way["natural"="water"]({s});'
            f'way["landuse"~"reservoir|basin"]({s});'
            f'way["waterway"="riverbank"]({s}););'
            f"out geom;"
        )

    elements = await tiled_elements(q, bbox, nx=3, ny=3)
    return _polygons(elements)


async def fetch_road_lines(bbox: BBox) -> list[LineString]:
    """Major roads (motorway/trunk/primary/secondary) — drive the noise proxy (tiled)."""

    def q(b: BBox) -> str:
        s = bbox_str(b)
        return (
            f"[out:json][timeout:120];"
            f'(way["highway"~"motorway|trunk|primary|secondary"]({s}););'
            f"out geom;"
        )

    elements = await tiled_elements(q, bbox, nx=4, ny=4)
    lines: list[LineString] = []
    for el in elements:
        geom = el.get("geometry")
        if not geom or len(geom) < 2:
            continue
        try:
            lines.append(LineString([(p["lon"], p["lat"]) for p in geom]))
        except (ValueError, KeyError):
            continue
    return lines


def _polygons(elements: list[dict]) -> list[Polygon]:  # type: ignore[type-arg]
    """Build valid polygons from Overpass `out geom` way elements."""
    polys: list[Polygon] = []
    for el in elements:
        geom = el.get("geometry")
        if not geom or len(geom) < 4:
            continue
        try:
            poly = Polygon([(p["lon"], p["lat"]) for p in geom])
        except (ValueError, KeyError):
            continue
        if poly.is_valid and not poly.is_empty:
            polys.append(poly)
    return polys
