"""Aggregated Environmental Stress per H3 cell per time bucket — the table the read API
and heatmap serve from. One row = one cell's ESI snapshot.

bbox filtering uses plain lat/lng centroid columns (btree) so it runs on any Postgres;
a PostGIS GiST geometry is a Phase-7 upgrade. H3 remains the spatial index per methodology.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Float, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StressCell(Base):
    __tablename__ = "stress_cells"

    bucket: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    h3_r9: Mapped[str] = mapped_column(String, primary_key=True)
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lng: Mapped[float] = mapped_column(Float, nullable=False)

    noise_score: Mapped[float | None] = mapped_column(Float)
    density_score: Mapped[float | None] = mapped_column(Float)
    heat_score: Mapped[float | None] = mapped_column(Float)
    aqi_score: Mapped[float | None] = mapped_column(Float)

    esi: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    greenery: Mapped[float | None] = mapped_column(Float)  # 0–1 green coverage (relief)
    locality: Mapped[str | None] = mapped_column(String)  # nearest named area
    sample_counts: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_stress_cells_bbox", "centroid_lng", "centroid_lat"),
        Index("ix_stress_cells_bucket", "bucket"),
    )
