-- Runs once on first DB init (empty data dir). Enables the extensions the platform is
-- built on. Schema/tables are managed by Alembic migrations, not here.

CREATE EXTENSION IF NOT EXISTS timescaledb;  -- time-series hypertables
CREATE EXTENSION IF NOT EXISTS postgis;      -- spatial types + indexing
