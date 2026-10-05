"""Delhi NCR coverage: the bounding box for external queries + the Delhi-core disk used by
the dev simulator and as an ingest fallback. The live pipeline's real cell set comes from
filling the NCR-core admin boundary (see app.ingestion.boundary + ingest._coverage_cells)."""

from __future__ import annotations

from app.db.h3_utils import grid_disk, latlng_to_cell

# Delhi (Connaught Place-ish) centre — simulator origin + disk fallback centre.
DELHI_LAT = 28.6139
DELHI_LNG = 77.2090

# ~70 H3 rings at res 9 ≈ a ~17 km radius disk over the Delhi core (simulator default).
COVERAGE_RINGS = 70

# Bounding box (minLng, minLat, maxLng, maxLat) spanning the NCR core — the union of Delhi
# NCT + Gurugram, Faridabad, Gautam Buddha Nagar and Ghaziabad districts (margin added to
# the measured union bounds). Used for the external grid/area fetches (MET, Open-Meteo, OSM).
NCR_BBOX = (76.65, 28.08, 77.74, 28.93)


def delhi_cells(rings: int = COVERAGE_RINGS) -> list[str]:
    """A Delhi-core H3 disk — the dev simulator's coverage and the ingest fallback when the
    admin boundary can't be fetched."""
    return grid_disk(latlng_to_cell(DELHI_LAT, DELHI_LNG), rings)
