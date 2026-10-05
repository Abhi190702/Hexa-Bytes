"""Process-level orchestration for automatic and manual data ingestion.

The actual ETL remains in ``app.services.ingest``. This module adds the operational
behavior the deployed API needs: single-flight execution, freshness checks, and observable
status shared by startup and the admin endpoints.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.logging import get_logger
from app.models.stress_cell import StressCell
from app.services.ingest import ingest_real

log = get_logger("ingestion_runtime")

_lock = asyncio.Lock()
_status: dict[str, object] = {"state": "idle"}


def _stamp(**fields: object) -> None:
    _status.clear()
    _status.update(at=datetime.now(UTC).isoformat(), **fields)


def status_snapshot() -> dict[str, object]:
    """Return a copy so response serialization cannot mutate process state."""
    return dict(_status)


def ingestion_running() -> bool:
    return _lock.locked()


def data_is_stale(
    latest_bucket: datetime | None,
    *,
    now: datetime,
    max_age: timedelta,
) -> bool:
    if latest_bucket is None:
        return True
    # Some test/local Postgres configurations can return a naive datetime even for a
    # timezone-aware column. Treat it as UTC because ingestion always writes UTC buckets.
    if latest_bucket.tzinfo is None:
        latest_bucket = latest_bucket.replace(tzinfo=UTC)
    return now - latest_bucket > max_age


async def data_snapshot(session: AsyncSession) -> dict[str, Any]:
    count, latest = (
        await session.execute(
            select(func.count()).select_from(StressCell).add_columns(func.max(StressCell.bucket))
        )
    ).one()
    return {
        "cells": int(count),
        "latest_bucket": latest,
        "has_data": bool(count),
    }


async def run_ingest(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    trigger: str,
) -> dict[str, object] | None:
    """Run one ingestion, returning None when another run is already active."""
    if _lock.locked():
        log.info("ingest_already_running", trigger=trigger)
        return None

    async with _lock:
        _stamp(state="running", trigger=trigger)
        try:
            async with session_factory() as session:
                result = await ingest_real(session)
            _stamp(state="done", trigger=trigger, **result)
            log.info("ingest_done", trigger=trigger, **result)
            return result
        except asyncio.CancelledError:
            _stamp(state="cancelled", trigger=trigger)
            raise
        except Exception as exc:
            _stamp(state="failed", trigger=trigger, error=str(exc))
            log.error("ingest_failed", trigger=trigger, error=str(exc))
            return None


async def refresh_if_stale(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    max_age: timedelta,
) -> dict[str, object] | None:
    """Refresh missing/stale cells after startup without delaying API readiness."""
    try:
        async with session_factory() as session:
            snapshot = await data_snapshot(session)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        _stamp(state="failed", trigger="startup", error=f"freshness check failed: {exc}")
        log.error("ingest_freshness_check_failed", error=str(exc))
        return None

    latest = snapshot["latest_bucket"]
    if not data_is_stale(latest, now=datetime.now(UTC), max_age=max_age):
        _stamp(state="fresh", trigger="startup", **snapshot)
        log.info("ingest_skipped_fresh", **snapshot)
        return snapshot
    return await run_ingest(session_factory, trigger="startup")


async def maintain_fresh_data(
    session_factory: async_sessionmaker[AsyncSession],
    *,
    max_age: timedelta,
) -> None:
    """Continuously keep the snapshot fresh while the API process is running."""
    check_seconds = max(60.0, max_age.total_seconds() / 4)
    while True:
        result = await refresh_if_stale(session_factory, max_age=max_age)
        # Retry operational failures promptly; otherwise check four times per freshness
        # window so the refresh happens close to the configured age.
        await asyncio.sleep(300.0 if result is None else check_seconds)
