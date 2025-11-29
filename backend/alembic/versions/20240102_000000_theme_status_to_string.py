"""Change theme status from enum to string

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change the status column from enum to string to support custom workflow statuses
    # First, alter the column to text (preserving existing values)
    op.execute("ALTER TABLE themes ALTER COLUMN status TYPE VARCHAR(50) USING status::text")
    
    # Drop the enum type as it's no longer needed
    op.execute("DROP TYPE IF EXISTS themestatus")


def downgrade() -> None:
    # Recreate the enum type
    op.execute("CREATE TYPE themestatus AS ENUM ('active', 'completed', 'archived')")
    
    # Convert the column back to enum (values must match enum values)
    op.execute("ALTER TABLE themes ALTER COLUMN status TYPE themestatus USING status::themestatus")