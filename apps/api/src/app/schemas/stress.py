"""Read-side contracts for the Environmental Stress heatmap. Part of the OpenAPI schema,
so these are the source of truth for the frontend's generated TypeScript types."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class StressScoresOut(BaseModel):
    """Per-metric normalized scores (0–100). Null = no recent data for that metric."""

    noise: float | None = None
    density: float | None = None
    heat: float | None = None
    aqi: float | None = None


class StressCellOut(BaseModel):
    h3: str
    lat: float
    lng: float
    esi: float
    scores: StressScoresOut
    confidence: float
    greenery: float | None = None
    locality: str | None = None
    updated_at: datetime


class StressCellCollection(BaseModel):
    bucket: datetime | None
    count: int
    truncated: bool  # true if the bbox held more cells than the response cap
    cells: list[StressCellOut]
