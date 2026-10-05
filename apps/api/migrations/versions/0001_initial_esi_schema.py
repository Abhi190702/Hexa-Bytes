"""initial ESI schema: sensors, readings, stress_cells

Revision ID: 0001_initial_esi
Revises:
Create Date: 2026-06-04

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_esi"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sensors",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("h3_r9", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_sensors_h3_r9", "sensors", ["h3_r9"])

    op.create_table(
        "readings",
        sa.Column("time", sa.DateTime(timezone=True), primary_key=True),
        sa.Column("sensor_id", sa.String(), primary_key=True),
        sa.Column("metric", sa.String(), primary_key=True),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("h3_r9", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
    )
    op.create_index("ix_readings_h3_time", "readings", ["h3_r9", "time"])
    op.create_index("ix_readings_metric_time", "readings", ["metric", "time"])

    op.create_table(
        "stress_cells",
        sa.Column("bucket", sa.DateTime(timezone=True), primary_key=True),
        sa.Column("h3_r9", sa.String(), primary_key=True),
        sa.Column("centroid_lat", sa.Float(), nullable=False),
        sa.Column("centroid_lng", sa.Float(), nullable=False),
        sa.Column("noise_score", sa.Float(), nullable=True),
        sa.Column("density_score", sa.Float(), nullable=True),
        sa.Column("heat_score", sa.Float(), nullable=True),
        sa.Column("aqi_score", sa.Float(), nullable=True),
        sa.Column("esi", sa.Float(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("sample_counts", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_stress_cells_bbox", "stress_cells", ["centroid_lng", "centroid_lat"])
    op.create_index("ix_stress_cells_bucket", "stress_cells", ["bucket"])

    # Promote `readings` to a TimescaleDB hypertable when the extension is available.
    # Plain Postgres simply keeps the regular table — the platform still works.
    op.execute(
        """
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') THEN
            CREATE EXTENSION IF NOT EXISTS timescaledb;
            PERFORM create_hypertable('readings', 'time', if_not_exists => TRUE);
          END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.drop_table("readings")
    op.drop_table("stress_cells")
    op.drop_table("sensors")
