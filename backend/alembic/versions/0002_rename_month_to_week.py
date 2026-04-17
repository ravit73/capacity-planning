"""rename month to week in capacity_entries

Revision ID: 0002
Revises: 0001
Create Date: 2024-01-01 00:00:01.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename column month → week
    op.alter_column("capacity_entries", "month", new_column_name="week")

    # Replace unique constraint
    op.drop_constraint("uq_capacity_entry", "capacity_entries", type_="unique")
    op.create_unique_constraint(
        "uq_capacity_entry", "capacity_entries", ["week", "employee_id", "project_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_capacity_entry", "capacity_entries", type_="unique")
    op.alter_column("capacity_entries", "week", new_column_name="month")
    op.create_unique_constraint(
        "uq_capacity_entry", "capacity_entries", ["month", "employee_id", "project_id"]
    )
