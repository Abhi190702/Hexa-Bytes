"""Liveness and readiness probes.

`/health` is a static liveness signal (process is up). `/readiness` checks the critical
dependencies and confirms that at least one stress-cell snapshot is available.
"""

from fastapi import APIRouter, Request
from sqlalchemy import func, select

from app.db.session import get_session
from app.models.stress_cell import StressCell
from app.schemas.health import DataStatus, DependencyStatus, HealthResponse, ReadinessResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/readiness", response_model=ReadinessResponse)
async def readiness(request: Request) -> ReadinessResponse:
    db_ok = False
    redis_ok = False
    data = DataStatus(has_data=False, cells=0, latest_bucket=None)

    try:
        async for session in get_session():
            count, latest = (
                await session.execute(
                    select(func.count())
                    .select_from(StressCell)
                    .add_columns(func.max(StressCell.bucket))
                )
            ).one()
            db_ok = True
            data = DataStatus(
                has_data=bool(count),
                cells=int(count),
                latest_bucket=latest,
            )
            break
    except Exception:  # readiness must never raise
        db_ok = False

    try:
        redis = request.app.state.redis
        redis_ok = bool(await redis.ping())
    except Exception:  # readiness must never raise
        redis_ok = False

    deps = DependencyStatus(database=db_ok, redis=redis_ok)
    # The DB and a populated snapshot are required for the heatmap; Redis is optional
    # (caching/realtime) and reported for information only.
    return ReadinessResponse(
        status="ready" if db_ok and data.has_data else "degraded",
        dependencies=deps,
        data=data,
    )
