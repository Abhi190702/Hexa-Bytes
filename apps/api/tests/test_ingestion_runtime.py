"""Operational ingestion behavior that must remain deterministic."""

from datetime import UTC, datetime, timedelta

from app.services.ingestion_runtime import data_is_stale

NOW = datetime(2026, 7, 24, 12, 0, tzinfo=UTC)
MAX_AGE = timedelta(hours=6)


def test_missing_data_is_stale() -> None:
    assert data_is_stale(None, now=NOW, max_age=MAX_AGE)


def test_recent_data_is_fresh() -> None:
    latest = NOW - timedelta(hours=5, minutes=59)
    assert not data_is_stale(latest, now=NOW, max_age=MAX_AGE)


def test_old_data_is_stale() -> None:
    latest = NOW - timedelta(hours=6, seconds=1)
    assert data_is_stale(latest, now=NOW, max_age=MAX_AGE)


def test_naive_database_timestamp_is_treated_as_utc() -> None:
    latest = (NOW - timedelta(hours=1)).replace(tzinfo=None)
    assert not data_is_stale(latest, now=NOW, max_age=MAX_AGE)
