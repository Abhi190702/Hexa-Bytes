"""Regression checks for the production data assets and bootstrap switch."""

from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parents[1]


def test_docker_image_includes_committed_osm_cache() -> None:
    dockerignore = (API_ROOT / ".dockerignore").read_text().splitlines()
    dockerfile = (API_ROOT / "Dockerfile").read_text()

    assert ".cache" not in dockerignore
    assert "COPY --from=builder /app/.cache /app/.cache" in dockerfile


def test_render_enables_startup_ingestion() -> None:
    blueprint = (REPO_ROOT / "render.yaml").read_text()

    assert "- key: INGEST_ON_STARTUP\n        value: 'true'" in blueprint
    assert "- key: INGEST_MAX_AGE_MINUTES\n        value: '360'" in blueprint
