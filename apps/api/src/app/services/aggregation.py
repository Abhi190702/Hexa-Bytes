"""Aggregation: turn raw readings into per-H3-cell ESI snapshots.

For each cell with readings in the window, take the per-metric mean, normalize via the
authoritative `app.domain.methodology`, compute ESI + confidence, and upsert into
`stress_cells` (the table the heatmap reads). This is the single compute path shared by the
dev simulator and (later) the live ingestion pipeline.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.h3_utils import cell_to_latlng
from app.domain.methodology import (
    Metric,
    StressScores,
    apply_greenery,
    compute_confidence,
    compute_esi,
    normalize,
)
from app.models.reading import Reading
from app.models.stress_cell import StressCell

DEFAULT_WINDOW = timedelta(minutes=15)


def _scores_from_means(means: dict[str, float]) -> StressScores:
    """Normalize each available metric's mean (native unit) to a 0–100 score."""

    def score(metric: Metric) -> float | None:
        raw = means.get(metric.value)
        return normalize(metric, raw) if raw is not None else None

    return StressScores(
        noise=score(Metric.NOISE),
        density=score(Metric.DENSITY),
        heat=score(Metric.HEAT),
        aqi=score(Metric.AQI),
    )


async def recompute_cells(
    session: AsyncSession,
    now: datetime,
    window: timedelta = DEFAULT_WINDOW,
    green_factors: dict[str, float] | None = None,
    localities: dict[str, str | None] | None = None,
) -> int:
    """Recompute ESI for every cell with readings in [now-window, now]. Returns cell count.

    `green_factors` (h3 -> 0..1 green coverage) applies greenery relief to each cell's ESI.
    `localities` (h3 -> name) labels each cell with its area name.
    """
    since = now - window
    stmt = (
        select(
            Reading.h3_r9,
            Reading.metric,
            func.avg(Reading.value),
            func.count(),
        )
        .where(Reading.time >= since)
        .group_by(Reading.h3_r9, Reading.metric)
    )
    result = await session.execute(stmt)

    means: dict[str, dict[str, float]] = {}
    counts: dict[str, dict[str, int]] = {}
    for h3_r9, metric, avg_value, cnt in result:
        means.setdefault(h3_r9, {})[metric] = float(avg_value)
        counts.setdefault(h3_r9, {})[metric] = int(cnt)

    bucket = now.replace(second=0, microsecond=0)
    rows: list[dict[str, object]] = []
    for h3_r9, metric_means in means.items():
        scores = _scores_from_means(metric_means)
        lat, lng = cell_to_latlng(h3_r9)
        green = green_factors.get(h3_r9, 0.0) if green_factors else 0.0
        rows.append(
            {
                "bucket": bucket,
                "h3_r9": h3_r9,
                "centroid_lat": lat,
                "centroid_lng": lng,
                "noise_score": scores.noise,
                "density_score": scores.density,
                "heat_score": scores.heat,
                "aqi_score": scores.aqi,
                "esi": apply_greenery(compute_esi(scores), green),
                "confidence": compute_confidence(scores),
                "greenery": green,
                "locality": localities.get(h3_r9) if localities else None,
                "sample_counts": counts[h3_r9],
            }
        )

    if not rows:
        return 0

    # Chunk the upsert: each row binds 11 params and Postgres caps a statement at 32767.
    update_columns = (
        "centroid_lat",
        "centroid_lng",
        "noise_score",
        "density_score",
        "heat_score",
        "aqi_score",
        "esi",
        "confidence",
        "greenery",
        "locality",
        "sample_counts",
    )
    batch_size = 1000
    for start in range(0, len(rows), batch_size):
        batch = rows[start : start + batch_size]
        insert_stmt = pg_insert(StressCell).values(batch)
        upsert = insert_stmt.on_conflict_do_update(
            index_elements=["bucket", "h3_r9"],
            set_={c: insert_stmt.excluded[c] for c in update_columns},
        )
        await session.execute(upsert)
    # Keep only the newest bucket so the serving table stays small and fast.
    await session.execute(delete(StressCell).where(StressCell.bucket < bucket))
    await session.commit()
    return len(rows)
