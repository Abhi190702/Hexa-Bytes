"""Entrypoint: `python -m app.ingestion.run` — pull live AQI + temperature once.

Requires WAQI_TOKEN. (A scheduled/looped version arrives with the full Phase 4 scheduler.)
"""

import asyncio

from app.db.session import create_engine, create_session_factory
from app.services.ingest import ingest_real


async def _main() -> None:
    engine = create_engine()
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            result = await ingest_real(session)
        print(f"Ingest result: {result}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(_main())
