"""Health/readiness response contracts.

These Pydantic models are part of the API's OpenAPI schema and therefore the source of
truth for the frontend's generated TypeScript types (see packages/shared-types).
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]


class DependencyStatus(BaseModel):
    database: bool
    redis: bool


class DataStatus(BaseModel):
    has_data: bool
    cells: int
    latest_bucket: datetime | None


class ReadinessResponse(BaseModel):
    status: Literal["ready", "degraded"]
    dependencies: DependencyStatus
    data: DataStatus
