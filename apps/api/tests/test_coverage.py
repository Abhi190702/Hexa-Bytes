"""Coverage / boundary tests. The multi-relation union is tested with a synthetic Overpass
payload (no network). A cache-backed check validates the real NCR footprint when the cached
boundary is present (committed), and is skipped otherwise."""

import h3
import pytest

from app.ingestion.boundary import _assemble, _load_cache
from app.services.coverage import NCR_BBOX


def _square(lon0: float, lat0: float, lon1: float, lat1: float) -> dict:
    ring = [(lon0, lat0), (lon1, lat0), (lon1, lat1), (lon0, lat1), (lon0, lat0)]
    return {
        "type": "relation",
        "tags": {"name": "X"},
        "members": [{"type": "way", "geometry": [{"lon": x, "lat": y} for x, y in ring]}],
    }


def test_assemble_unions_multiple_relations() -> None:
    # Two disjoint unit squares across two relations -> one MultiPolygon of area 2.
    data = {"elements": [_square(0, 0, 1, 1), _square(2, 0, 3, 1)]}
    geom = _assemble(data)
    assert geom is not None
    assert geom.geom_type in ("Polygon", "MultiPolygon")
    assert geom.area == pytest.approx(2.0)
    assert geom.bounds == pytest.approx((0.0, 0.0, 3.0, 1.0))


def test_assemble_empty_returns_none() -> None:
    assert _assemble({"elements": []}) is None


@pytest.mark.skipif(_load_cache() is None, reason="NCR boundary cache not present")
def test_cached_ncr_footprint_is_sane() -> None:
    boundary = _load_cache()
    assert boundary is not None
    min_lng, min_lat, max_lng, max_lat = boundary.bounds
    # The cached footprint sits within the declared NCR bbox.
    assert NCR_BBOX[0] <= min_lng and min_lat >= NCR_BBOX[1]
    assert max_lng <= NCR_BBOX[2] and max_lat <= NCR_BBOX[3]
    # res-9 fill yields a large, NCR-scale cell set (Delhi alone is ~14k).
    assert len(h3.geo_to_cells(boundary, 9)) > 40_000
