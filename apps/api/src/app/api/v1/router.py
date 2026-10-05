"""Aggregates all v1 routers. Versioning the API surface lets contracts evolve without
breaking deployed clients (a new /api/v2 can coexist)."""

from fastapi import APIRouter

from app.api.v1.routes import admin, geocode, health, stress

api_router = APIRouter()
api_router.include_router(health.router, tags=["system"])
api_router.include_router(stress.router, tags=["stress"])
api_router.include_router(geocode.router, tags=["geocode"])
api_router.include_router(admin.router, tags=["admin"])
