"""Tiny async retry helper — external data sources (Overpass, Open-Meteo) intermittently
throttle/timeout, especially from shared cloud IPs, so we back off and retry."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable


async def with_retries[T](
    make: Callable[[], Awaitable[T]], attempts: int = 3, base: float = 2.0
) -> T:
    last: Exception | None = None
    for i in range(attempts):
        try:
            return await make()
        except Exception as exc:
            last = exc
            await asyncio.sleep(base * (i + 1))
    raise RuntimeError(f"failed after {attempts} attempts: {last}")
