"""Async Redis client factory.

Redis is the hot path for realtime fan-out: in Phase 2 it carries pub/sub between the
MQTT ingestion consumer and WebSocket broadcasters, and caches latest-value reads. The
pool is created once in the app lifespan.
"""

from redis.asyncio import Redis

from app.core.config import get_settings


def create_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)
