"""FastAPI application factory.

The lifespan owns process-scoped resources (async DB engine, Redis pool): created on
startup, disposed on shutdown. The OpenAPI schema is served at /api/v1/openapi.json,
which is the source the frontend's TypeScript types are generated from.
"""

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from datetime import timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db import session as db_session
from app.db.redis import create_redis
from app.db.session import create_engine, create_session_factory
from app.realtime.websocket import router as ws_router
from app.services.ingestion_runtime import maintain_fresh_data

settings = get_settings()
configure_logging(settings.api_log_level)
log = get_logger("app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    engine = create_engine()
    session_factory = create_session_factory(engine)
    db_session.session_factory = session_factory
    redis = create_redis()
    app.state.engine = engine
    app.state.redis = redis
    ingestion_task: asyncio.Task[object] | None = None
    if settings.ingest_on_startup:
        ingestion_task = asyncio.create_task(
            maintain_fresh_data(
                session_factory,
                max_age=timedelta(minutes=settings.ingest_max_age_minutes),
            ),
            name="ingestion-scheduler",
        )
    log.info("startup", env=settings.api_env)
    try:
        yield
    finally:
        if ingestion_task is not None:
            if not ingestion_task.done():
                ingestion_task.cancel()
            with suppress(asyncio.CancelledError):
                await ingestion_task
        await redis.aclose()
        await engine.dispose()
        log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="EvoComb API",
        version="0.0.0",
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        lifespan=lifespan,
    )

    # Compress responses (the cell payload shrinks ~5–10×).
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.api_cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api/v1")
    app.include_router(ws_router)
    return app


app = create_app()
