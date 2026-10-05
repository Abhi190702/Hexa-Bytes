"""Entrypoint: `python -m app.dev.simulate` (requires API_ENV=development)."""

import asyncio

from app.dev.simulator import run_simulation

if __name__ == "__main__":
    count = asyncio.run(run_simulation())
    print(f"Wrote {count} stress cells.")
