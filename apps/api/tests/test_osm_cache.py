"""OSM feature cache: serialization round-trip + bbox invalidation (no network)."""

import asyncio

from shapely.geometry import LineString

from app.ingestion import osm_cache

BBOX = (76.65, 28.08, 77.74, 28.93)


def test_geom_cache_roundtrip(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(osm_cache, "_CACHE_DIR", tmp_path)
    lines = [LineString([(0, 0), (1, 1)]), LineString([(2, 2), (3, 3)])]
    osm_cache._save_geoms("roads", lines, BBOX)

    loaded = osm_cache._load_geoms("roads", BBOX)
    assert loaded is not None
    assert len(loaded) == 2
    assert loaded[0].equals(lines[0])

    # A different bbox invalidates the cache (forces a refetch).
    assert osm_cache._load_geoms("roads", (0.0, 0.0, 1.0, 1.0)) is None


def test_poi_cache_keyed_by_resolution(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(osm_cache, "_CACHE_DIR", tmp_path)
    counts = {"8928308280fffff": 5}
    obj = {**osm_cache._stamp(BBOX, 9), "counts": counts}
    osm_cache._path("pois").write_text(__import__("json").dumps(obj))

    assert osm_cache._load_pois(BBOX, 9) == counts
    assert osm_cache._load_pois(BBOX, 8) is None  # resolution mismatch


def test_load_or_fetch_no_cache_no_fetch(tmp_path, monkeypatch) -> None:  # type: ignore[no-untyped-def]
    # With allow_fetch=False and an empty cache, the ingest gets empty features rather than
    # blocking on Overpass.
    monkeypatch.setattr(osm_cache, "_CACHE_DIR", tmp_path)
    feats = asyncio.run(
        osm_cache.load_or_fetch_features((0.0, 0.0, 1.0, 1.0), 9, allow_fetch=False)
    )
    assert feats.roads == []
    assert feats.green == []
    assert feats.poi_counts == {}
    assert feats.places == []
