"""Async database engine and session factory.

Fully async (asyncpg) so request handlers never block the event loop — essential for a
realtime, WebSocket-heavy platform. The engine is created once per process in the app
lifespan and exposed here.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


def create_engine() -> AsyncEngine:
    settings = get_settings()
    connect_args = {"ssl": True} if settings.db_use_ssl else {}
    return create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        future=True,
        connect_args=connect_args,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


# Module-level factory wired by the app lifespan (see app.main).
session_factory: async_sessionmaker[AsyncSession] | None = None


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding a request-scoped async session."""
    if session_factory is None:
        raise RuntimeError("Session factory not initialized; check app lifespan.")
    async with session_factory() as session:
        yield session
