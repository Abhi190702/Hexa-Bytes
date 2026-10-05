"""Read-route behavior during first-run ingestion."""

from typing import Any

from app.api.v1.routes import stress


async def test_empty_bootstrap_response_is_not_cached(monkeypatch: Any) -> None:
    async def no_cells(session: object) -> tuple[None, list[dict[str, Any]]]:
        return None, []

    monkeypatch.setattr(stress, "_latest_cells", no_cells)
    response = await stress.get_stress_cells(
        bbox="76.8,28.3,77.5,28.9",
        session=object(),  # type: ignore[arg-type]
    )

    assert response.headers["cache-control"] == "no-store"
    assert b'"count":0' in response.body
