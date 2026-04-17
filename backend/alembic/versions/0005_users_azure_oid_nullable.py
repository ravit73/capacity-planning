"""make users.azure_oid nullable for pre-provisioned accounts

Revision ID: 0005
Revises: 0004
Create Date: 2024-01-01 00:00:04.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # azure_oid is NULL until the pre-provisioned user logs in for the first time
    op.alter_column("users", "azure_oid", nullable=True)
    # Add case-insensitive unique index on email
    op.create_index(
        "ix_users_email_lower",
        "users",
        [sa.text("lower(email)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_email_lower", "users")
    op.alter_column("users", "azure_oid", nullable=False)
