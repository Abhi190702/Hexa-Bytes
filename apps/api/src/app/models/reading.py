"""Raw time-series measurements in NATIVE units (dB, devices, °C, AQI). Normalization to
0–100 happens at compute time (see app.domain.methodology), never on write.

Backed by a TimescaleDB hypertable when the extension is present (created in the migration);
falls back to a plain table otherwise. `time` is part of the PK because hypertables require
the partitioning column in every unique key.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Reading(Base):
    __tablename__ = "readings"

    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    sensor_id: Mapped[str] = mapped_column(String, primary_key=True)
    # metric: noise | density | heat | aqi
    metric: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    h3_r9: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)

    __table_args__ = (
        Index("ix_readings_h3_time", "h3_r9", "time"),
        Index("ix_readings_metric_time", "metric", "time"),
    )
