"""One-time (re)build of the committed OSM-feature cache for the NCR footprint.

    python -m app.ingestion.build_osm_cache

Run locally after changing NCR_BBOX or any OSM query, then commit the refreshed
apps/api/.cache/ncr_*.json files. The hourly ingest reads this cache and never calls
Overpass. Fetching is patient (low concurrency, long backoff) since it is one-off."""

import asyncio

from app.core.logging import get_logger
from app.domain.methodology import H3_RESOLUTION
from app.ingestion.osm_cache import load_or_fetch_features
from app.services.coverage import NCR_BBOX

log = get_logger("build_osm_cache")


async def _main() -> None:
    feats = await load_or_fetch_features(NCR_BBOX, H3_RESOLUTION, allow_fetch=True)
    log.info(
        "osm_cache_built",
        roads=len(feats.roads),
        green=len(feats.green),
        water=len(feats.water),
        poi_cells=len(feats.poi_counts),
        places=len(feats.places),
    )
    missing = [
        n
        for n, v in [
            ("roads", feats.roads),
            ("green", feats.green),
            ("water", feats.water),
            ("pois", feats.poi_counts),
            ("places", feats.places),
        ]
        if not v
    ]
    if missing:
        log.warning("osm_cache_incomplete", missing=missing, hint="re-run to retry failed features")


if __name__ == "__main__":
    asyncio.run(_main())
