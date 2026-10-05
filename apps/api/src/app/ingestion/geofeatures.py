"""Spatial indexes over OSM features for fast per-cell lookups (greenery, road noise)."""

from __future__ import annotations

from shapely import STRtree
from shapely.geometry import LineString, Point, Polygon

# Rough metres-per-degree at Delhi's latitude (avg of lat ~111km and lng ~97km).
_M_PER_DEG = 105_000.0

# Noise proxy from distance to the nearest major road.
_NOISE_AT_ROAD_DB = 80.0
_NOISE_FALLOFF_DB_PER_M = 0.05  # -0.05 dB/m → ~quiet by ~700m
_NOISE_FLOOR_DB = 42.0


class GreenIndex:
    """Whether a point falls inside a green polygon (binary greenery coverage)."""

    def __init__(self, polygons: list[Polygon]) -> None:
        self._polygons = polygons
        self._tree = STRtree(polygons) if polygons else None

    def factor(self, lat: float, lng: float) -> float:
        if self._tree is None:
            return 0.0
        point = Point(lng, lat)
        # STRtree evaluates input.predicate(tree_geom): point.within(polygon)
        hits = self._tree.query(point, predicate="within")
        return 1.0 if len(hits) > 0 else 0.0


class WaterIndex:
    """Whether a point falls on a water body (rivers, lakes, reservoirs) — cools the heat
    UHI proxy. Same binary-coverage approach as GreenIndex."""

    def __init__(self, polygons: list[Polygon]) -> None:
        self._polygons = polygons
        self._tree = STRtree(polygons) if polygons else None

    def factor(self, lat: float, lng: float) -> float:
        if self._tree is None:
            return 0.0
        point = Point(lng, lat)
        hits = self._tree.query(point, predicate="within")
        return 1.0 if len(hits) > 0 else 0.0


class PlaceIndex:
    """Nearest named locality to a point (within a max distance)."""

    def __init__(self, places: list[tuple[float, float, str]]) -> None:
        self._names = [name for _, _, name in places]
        self._points = [Point(lng, lat) for lat, lng, _ in places]
        self._tree = STRtree(self._points) if self._points else None

    def nearest_name(self, lat: float, lng: float, max_km: float = 4.0) -> str | None:
        if self._tree is None:
            return None
        point = Point(lng, lat)
        idx = int(self._tree.nearest(point))
        dist_km = float(point.distance(self._points[idx])) * _M_PER_DEG / 1000.0
        return self._names[idx] if dist_km <= max_km else None


class RoadNoiseIndex:
    """Noise (dB) at a point from its distance to the nearest major road."""

    def __init__(self, lines: list[LineString]) -> None:
        self._lines = lines
        self._tree = STRtree(lines) if lines else None

    def noise_db(self, lat: float, lng: float) -> float | None:
        if self._tree is None:
            return None
        point = Point(lng, lat)
        idx = int(self._tree.nearest(point))
        dist_m = float(point.distance(self._lines[idx])) * _M_PER_DEG
        return max(_NOISE_FLOOR_DB, _NOISE_AT_ROAD_DB - _NOISE_FALLOFF_DB_PER_M * dist_m)
