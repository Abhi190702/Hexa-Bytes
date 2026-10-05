#!/usr/bin/env sh
# Container entrypoint: apply DB migrations, then serve on the platform's $PORT
# (Render injects PORT; defaults to 8000 for local Docker).
set -e

echo "Applying database migrations..."
alembic upgrade head

echo "Starting EvoComb API on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
