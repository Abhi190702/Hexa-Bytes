"""add locality column to stress_cells

Revision ID: 0003_add_locality
Revises: 0002_add_greenery
Create Date: 2026-06-05

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_add_locality"
down_revision: str | None = "0002_add_greenery"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("stress_cells", sa.Column("locality", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("stress_cells", "locality")
