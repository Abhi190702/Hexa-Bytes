"""H3 helpers (h3-py v4). H3 is the platform's spatial index — every reading and cell is
keyed by its resolution-9 H3 index, computed here in Python (no DB extension needed)."""

from __future__ import annotations

import h3

from app.domain.methodology import H3_RESOLUTION


def latlng_to_cell(lat: float, lng: float, resolution: int = H3_RESOLUTION) -> str:
    """Lat/long -> H3 cell index (string) at the given resolution."""
    return str(h3.latlng_to_cell(lat, lng, resolution))


def cell_to_latlng(cell: str) -> tuple[float, float]:
    """H3 cell index -> (lat, lng) of its centroid."""
    lat, lng = h3.cell_to_latlng(cell)
    return float(lat), float(lng)


def grid_disk(center: str, k: int) -> list[str]:
    """All cells within k rings of `center` (inclusive). Used to enumerate a coverage
    area (e.g. Delhi NCR) without raw point math."""
    return [str(c) for c in h3.grid_disk(center, k)]
