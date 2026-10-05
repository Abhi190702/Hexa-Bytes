"""add greenery column to stress_cells

Revision ID: 0002_add_greenery
Revises: 0001_initial_esi
Create Date: 2026-06-05

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_add_greenery"
down_revision: str | None = "0001_initial_esi"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("stress_cells", sa.Column("greenery", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("stress_cells", "greenery")
