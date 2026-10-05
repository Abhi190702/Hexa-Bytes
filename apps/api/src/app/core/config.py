"""Typed application settings.

12-factor config: everything comes from the environment and is validated on load,
so the service fails fast on misconfiguration instead of erroring at request time.
Vars are namespaced (POSTGRES_*, REDIS_*, MQTT_*, API_*) to stay legible as the
platform grows.
"""

from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- PostgreSQL / TimescaleDB / PostGIS ---
    postgres_user: str = "urban"
    postgres_password: str = "changeme"
    postgres_db: str = "urban_stress"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    # Full connection string override (e.g. an external/managed DB URL). When set, it wins
    # over the POSTGRES_* parts and connects with SSL (for external managed Postgres).
    database_url_override: str = Field(default="", validation_alias="DATABASE_URL")

    # --- Redis ---
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""

    # --- MQTT (provisioned now; consumer wired in Phase 2) ---
    mqtt_host: str = "localhost"
    mqtt_port: int = 1883

    # --- API ---
    api_env: str = "development"
    api_log_level: str = "INFO"
    api_cors_origins: str = "http://localhost:3000"
    # Regex for additional allowed origins — defaults to any Vercel deployment.
    api_cors_origin_regex: str = r"https://([a-z0-9-]+\.)*vercel\.app"

    # Token guarding the manual data-refresh endpoint (POST /api/v1/admin/ingest).
    ingest_token: str = ""
    # When enabled, maintain a non-blocking data refresh loop. It ingests after startup if
    # the latest snapshot is missing/stale and keeps checking while the API is alive.
    # Production enables this explicitly; local development/tests stay deterministic.
    ingest_on_startup: bool = False
    ingest_max_age_minutes: int = Field(default=360, ge=1)

    # --- External data providers (Phase 4) ---
    waqi_token: str = ""  # free token from https://aqicn.org/data-platform/token/
    # Polite identifier sent to OpenStreetMap Nominatim (reverse geocoding).
    geocoder_user_agent: str = "urban-stress-platform/0.1"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        """Async SQLAlchemy URL (asyncpg driver)."""
        if self.database_url_override:
            url = (
                self.database_url_override.replace(
                    "postgresql://", "postgresql+asyncpg://"
                ).replace("postgres://", "postgresql+asyncpg://")
            )
            return url.split("?")[0]  # drop sslmode etc.; SSL handled via connect_args
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def db_use_ssl(self) -> bool:
        """External/managed Postgres (via DATABASE_URL) requires SSL."""
        return bool(self.database_url_override)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def alembic_database_url(self) -> str:
        """Sync URL for Alembic migrations (psycopg/asyncpg-agnostic via asyncpg async env)."""
        return self.database_url

    @computed_field  # type: ignore[prop-decorator]
    @property
    def redis_url(self) -> str:
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/0"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so settings are parsed once per process."""
    return Settings()
