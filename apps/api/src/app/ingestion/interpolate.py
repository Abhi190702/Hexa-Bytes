"""Inverse-distance weighting (IDW) — spread sparse point measurements (AQI stations,
weather grid) onto H3 cell centroids. Coarse but honest for ~km-scale sources."""

from __future__ import annotations

import math

# (lat, lng, value)
Point = tuple[float, float, float]


def _km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dlat = (lat2 - lat1) * 111.0
    dlng = (lng2 - lng1) * 111.0 * math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot(dlat, dlng)


def idw(points: list[Point], lat: float, lng: float, power: float = 2.0) -> float | None:
    """Interpolated value at (lat, lng). Returns None if there are no points."""
    if not points:
        return None
    weighted = 0.0
    weight_total = 0.0
    for plat, plng, value in points:
        d = _km(plat, plng, lat, lng)
        if d < 1e-6:
            return value  # exactly on a station
        w = 1.0 / (d**power)
        weighted += w * value
        weight_total += w
    return weighted / weight_total
