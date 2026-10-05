"""DEV-ONLY synthetic data generator.

Generates plausible Environmental Stress readings across Delhi NCR H3 cells so the full
normalize -> ESI -> H3 -> render pipeline can be seen before ESP32 hardware and live
AQI/weather feeds exist. Values follow a simple radial gradient (denser/noisier/hotter/
more polluted toward the centre) plus jitter — this is NOT real data and is clearly
labeled `source='simulator'`. Refuses to run unless API_ENV=development.
"""

from __future__ import annotations

import math
import random
from datetime import UTC, datetime

from sqlalchemy import delete, insert

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.h3_utils import cell_to_latlng
from app.db.session import create_engine, create_session_factory
from app.models.reading import Reading
from app.services.aggregation import recompute_cells
from app.services.coverage import DELHI_LAT, DELHI_LNG, delhi_cells

log = get_logger("simulator")

GRADIENT_SCALE_KM = 9.0  # how quickly burden falls off from the centre


def _km_between(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dlat = (lat2 - lat1) * 111.0
    dlng = (lng2 - lng1) * 111.0 * math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot(dlat, dlng)


def _readings_for_cell(
    h3_cell: str, now: datetime, rng: random.Random
) -> list[dict[str, object]]:
    lat, lng = cell_to_latlng(h3_cell)
    dist = _km_between(DELHI_LAT, DELHI_LNG, lat, lng)
    g = math.exp(-dist / GRADIENT_SCALE_KM)  # 1.0 at centre -> ~0 at edges

    raw = {
        "noise": 50.0 + 40.0 * g + rng.uniform(-4, 4),  # dB
        "density": 3.0 + 55.0 * g + rng.uniform(-3, 3),  # unique BLE devices
        "heat": 32.0 + 11.0 * g + rng.uniform(-1.5, 1.5),  # °C (urban heat island)
        "aqi": 130.0 + 180.0 * g + rng.uniform(-20, 20),  # AQI
    }
    return [
        {
            "time": now,
            "sensor_id": f"sim:{h3_cell}",
            "metric": metric,
            "value": value,
            "h3_r9": h3_cell,
            "source": "simulator",
        }
        for metric, value in raw.items()
    ]


async def run_simulation(rings: int = 70, seed: int = 42) -> int:
    """Populate readings for a disk of H3 cells around Delhi, then recompute ESI cells.
    Returns the number of stress cells written."""
    settings = get_settings()
    if settings.api_env != "development":
        raise RuntimeError(
            f"Simulator is dev-only; API_ENV={settings.api_env!r} (need 'development')."
        )

    rng = random.Random(seed)
    now = datetime.now(UTC)
    cells = delhi_cells(rings)

    rows: list[dict[str, object]] = []
    for cell in cells:
        rows.extend(_readings_for_cell(cell, now, rng))

    engine = create_engine()
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            # Fresh snapshot each run: clear prior simulated readings.
            await session.execute(delete(Reading).where(Reading.source == "simulator"))
            await session.execute(insert(Reading), rows)
            await session.commit()
            cell_count = await recompute_cells(session, now)
        log.info(
            "simulation_complete",
            cells=len(cells),
            readings=len(rows),
            stress_cells=cell_count,
        )
        return cell_count
    finally:
        await engine.dispose()
