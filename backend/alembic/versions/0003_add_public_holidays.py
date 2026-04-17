"""add public_holidays table

Revision ID: 0003
Revises: 0002
Create Date: 2024-01-01 00:00:02.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "public_holidays",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_public_holidays_id", "public_holidays", ["id"])
    op.create_index("ix_public_holidays_date", "public_holidays", ["date"])


def downgrade() -> None:
    op.drop_index("ix_public_holidays_date", "public_holidays")
    op.drop_index("ix_public_holidays_id", "public_holidays")
    op.drop_table("public_holidays")
