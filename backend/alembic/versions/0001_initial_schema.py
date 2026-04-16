"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_departments_id", "departments", ["id"])

    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_employees_id", "employees", ["id"])

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("color_hex", sa.String(7), nullable=False, server_default="#6366f1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_projects_id", "projects", ["id"])

    op.create_table(
        "capacity_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("month", "employee_id", "project_id", name="uq_capacity_entry"),
    )
    op.create_index("ix_capacity_entries_id", "capacity_entries", ["id"])


def downgrade() -> None:
    op.drop_table("capacity_entries")
    op.drop_table("projects")
    op.drop_table("employees")
    op.drop_table("departments")
