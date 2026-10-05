"""Admin endpoints to (re)load real data over HTTP — used where a shell isn't available
(e.g. free hosting). Runs ingestion in the background and exposes its status.

Auth: a valid `INGEST_TOKEN` always works. As a convenience, an unauthenticated call is
allowed ONLY when there is no data yet (first-time bootstrap); once cells exist, a token is
required to refresh.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db import session as db_session
from app.db.session import get_session
from app.models.stress_cell import StressCell
from app.services.ingestion_runtime import (
    data_snapshot,
    ingestion_running,
    run_ingest,
    status_snapshot,
)

router = APIRouter()


async def _run_ingest() -> None:
    if db_session.session_factory is None:
        return
    await run_ingest(db_session.session_factory, trigger="manual")


@router.post("/admin/ingest")
async def trigger_ingest(
    background: BackgroundTasks,
    session: Annotated[AsyncSession, Depends(get_session)],
    x_ingest_token: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    settings = get_settings()
    token_ok = bool(settings.ingest_token) and x_ingest_token == settings.ingest_token
    if not token_ok:
        existing = await session.scalar(select(func.count()).select_from(StressCell))
        if existing and existing > 0:
            raise HTTPException(403, "data already loaded; valid token required to refresh")
    if ingestion_running():
        return {"status": "ingestion already running"}
    background.add_task(_run_ingest)
    return {"status": "ingestion started"}


@router.get("/admin/ingest/status")
async def ingest_status(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, object]:
    return {**status_snapshot(), "data": await data_snapshot(session)}
