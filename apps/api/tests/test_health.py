"""Smoke test for the liveness endpoint — proves the app wires up and serves /health.

No external services required: the engine/Redis clients connect lazily, so the lifespan
starts and stops cleanly without a live DB, and /health performs no I/O.
"""

from fastapi.testclient import TestClient

from app.main import app


def test_health_ok() -> None:
    with TestClient(app) as client:
        resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
