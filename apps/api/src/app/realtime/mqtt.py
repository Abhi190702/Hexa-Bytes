"""MQTT ingestion — interface stub (NOT wired in Phase 0).

The broker runs in docker compose so the infrastructure exists, but no consumer is
started yet. Phase 2 implements this: subscribe to ESP32 sensor topics, validate
payloads against Pydantic contracts, write time-series rows to TimescaleDB, and publish
to Redis for WebSocket fan-out.

Documented here as the planned contract so the integration point is explicit.
"""

from typing import Protocol


class SensorIngestor(Protocol):
    """Planned Phase 2 contract for the MQTT -> DB/Redis ingestion consumer."""

    async def start(self) -> None: ...

    async def stop(self) -> None: ...
