# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

EvoComb maps urban **Environmental Stress** (measurable environmental burden, not psychological stress) over Delhi NCR on an H3 resolution‑9 hex grid. It is a monorepo with three parts:

- `apps/api`: a FastAPI + async SQLAlchemy backend running on Python 3.12, managed with **uv**. It uses Postgres with TimescaleDB and PostGIS, plus Redis.
- `apps/web`: a Next.js 15 / React 19 frontend. It uses MapLibre + deck.gl for `/map` and a Three.js scroll-driven landing page at `/`.
- `packages/shared-types`: TypeScript contracts, partly generated from the API's OpenAPI schema. `packages/config` holds the shared ESLint and tsconfig base.

The pnpm workspace (`pnpm-workspace.yaml`) covers only `apps/web` and `packages/*`. `apps/api/package.json` is a Turbo shim, but because the API is outside the workspace, the root `pnpm dev|lint|typecheck` commands do **not** run the Python side. Run the API commands from `apps/api`.

## Commands

Frontend (repo root, Node 22, pnpm 9):

```sh
pnpm install
pnpm --filter @platform/web dev      # Next dev server (needs NEXT_PUBLIC_API_URL, see below)
pnpm lint | pnpm typecheck | pnpm build
pnpm format / pnpm format:check      # prettier: single quotes, width 100
pnpm gen:types                       # regenerate packages/shared-types/src/generated/api.ts
                                     # from a running API (API_OPENAPI_URL, default localhost:8000)
```

`apps/web/src/lib/env.ts` validates the `NEXT_PUBLIC_*` variables with zod when the module loads. If `NEXT_PUBLIC_API_URL` is missing or not a valid URL, `next build` fails. CI sets it to `https://api.example.com` for that reason.

Backend (`apps/api`):

```sh
uv sync
uv run uvicorn app.main:app --reload --port 8000
uv run ruff check .
uv run mypy src                                  # strict mode
uv run pytest                                    # asyncio_mode=auto, pythonpath=src
uv run pytest tests/test_methodology.py::test_name
uv run alembic upgrade head
uv run python -m app.ingestion.run               # one real-data ingest (writes stress_cells)
uv run python -m app.ingestion.build_osm_cache   # rebuild committed OSM cache (slow, Overpass)
uv run python -m app.dev.simulate                # synthetic data; requires API_ENV=development
```

Full stack: copy `.env.example` to `.env`, then run `docker compose up`. `compose.override.yaml` is applied automatically; it exposes the db, redis, mqtt, and api ports and hot-reloads the API. nginx serves the app on :80.

CI (`.github/workflows/ci.yml`) runs web lint, typecheck, and build, then API ruff, mypy, and pytest.

## Architecture

### ESI computation: the backend is the single source of truth

`apps/api/src/app/domain/methodology.py` defines the four metrics (`noise`, `density`, `heat`, `aqi`), their calibration anchors, their 0–100 normalization, and the weighted sum `ESI = 0.30·Noise + 0.25·Density + 0.20·Heat + 0.25·AQI`. It also defines greenery relief and confidence. `domain/health.py` builds a population-level, associational health-risk layer on top of the ESI. It has explicit guardrails: nothing in it is an individual prediction, it is anchored to published EPA/WHO thresholds, and density is deliberately excluded from health claims.

The frontend mirrors only the **render** constants (weights for display, the color ramp) in `packages/shared-types/src/domain/*.ts` and `apps/web/src/lib/heuristics.ts`. If you change a weight or metric key in the backend, update those mirrors to match. Do not re-implement any formula on the frontend.

### Data pipeline

1. `services/ingest.py` (`ingest_real`) collects the inputs for each cell in the NCR footprint:
   - heat: MET Norway temperature plus a modeled urban-heat-island offset
   - AQI: Open-Meteo, IDW-interpolated
   - density: OSM POI counts
   - noise: distance to major OSM roads
   - greenery: OSM parks and forest

   It writes `Reading` rows.
2. `services/aggregation.py` (`recompute_cells`) takes the mean of each metric per H3 cell, normalizes it through `methodology`, and upserts time-bucketed `stress_cells`. The simulator and real ingestion both go through this one compute path.
3. Static OSM features are **not** fetched live. They come from the committed `apps/api/.cache/ncr_*.json` files, which are stamped with bbox and resolution; a mismatch forces a refetch. After changing `NCR_BBOX` (in `services/coverage.py`) or any OSM query, rebuild the cache and commit it. `tests/test_deployment_config.py` checks that the Docker image ships the cache.
4. `services/ingestion_runtime.py` runs ingestion single-flight with a freshness check. When `INGEST_ON_STARTUP=true` (set in production via `render.yaml`), the FastAPI lifespan starts it as a background loop. `POST /api/v1/admin/ingest` triggers it manually and is guarded by `INGEST_TOKEN`; unauthenticated calls are allowed only while the database is empty. `.github/workflows/ingest.yml` also runs migrations and ingestion every 6 hours against the managed DB, because the Render instance runs out of memory on large ingests.

### Serving

`api/v1/routes/stress.py` caches the latest bucket's cells in process, rechecks for a newer bucket at most once a minute, filters by viewport in memory, and serializes with orjson. GZip middleware is on. The OpenAPI schema is at `/api/v1/openapi.json` and docs are at `/api/v1/docs`. The `/ws` WebSocket is currently just a heartbeat/echo stub, and MQTT is provisioned but has no consumer yet ("Phase 2").

Settings come from `core/config.py` (pydantic-settings, reading `.env`). If `DATABASE_URL` is set, it overrides the `POSTGRES_*` values, is rewritten to the asyncpg driver, and connects with SSL. Alembic migrations are in `apps/api/migrations/versions`. The container's `start.sh` runs `alembic upgrade head` before starting uvicorn.

### Frontend

- `/map` (`app/map/page.tsx`) fetches cells through `hooks/useStressCells.ts`. That hook uses TanStack Query keyed on rounded viewport bounds from the zustand `stores/map-store.ts`, with `keepPreviousData` so the map doesn't blank during a pan. Cells render through `components/map/layers/stressHexLayer.ts` (deck.gl) over MapLibre.
- `/` renders `components/site/Experience.tsx`. This is the scroll-driven WebGL story: Lenis and GSAP drive a single storyboard that writes to a `SceneBus`, and Three.js reads it each frame. Read `apps/web/src/components/site/README.md` before working on it; it covers accessibility, reduced motion, and performance constraints. `components/landing/*` looks like the previous landing page and is not imported by `app/page.tsx`.

## Deployment

The API and Postgres deploy on Render through the `render.yaml` blueprint, using the Docker image built from `apps/api/Dockerfile`. The web app deploys on Vercel with only `NEXT_PUBLIC_API_URL` required. The API's CORS allows `API_CORS_ORIGINS` plus a regex matching any `*.vercel.app` origin.

## Conventions

- Python: ruff line length 100 (rules E, F, I, UP, B, ASYNC, RUF), strict mypy with the pydantic plugin, 4-space indent. TypeScript: prettier (single quotes, trailing commas, width 100), 2-space indent, LF line endings.
- Modules open with a docstring or comment explaining *why* they exist. Keep that style when adding modules.
