"""Add processing activities and legal basis tracking.

Revision ID: 002
Revises: 001
Create Date: 2026-03-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create legal_basis enum table
    op.create_table(
        "legal_basis",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.String(255), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("basis_type", sa.String(50), nullable=False),  # consent, contract, legal_obligation, vital_interests, public_task, legitimate_interest
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("legitimate_interest_reason", sa.Text(), nullable=True),  # For legitimate_interest basis
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_legal_basis_project", "legal_basis", ["project_id"])
    
    # Create processing_activities table
    op.create_table(
        "processing_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", sa.String(255), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("legal_basis_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("data_categories", postgresql.JSON(astext_type=sa.Text()), default=list),  # e.g., ["email", "usage_data"]
        sa.Column("data_retention_days", sa.Integer(), nullable=True),
        sa.Column("recipients", sa.Text(), nullable=True),  # Who receives the data
        sa.Column("safeguards", sa.Text(), nullable=True),  # Security measures
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["legal_basis_id"], ["legal_basis.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_processing_activities_project", "processing_activities", ["project_id"])
    op.create_index("ix_processing_activities_legal_basis", "processing_activities", ["legal_basis_id"])
    
    # Add legal_basis_id to session_events table
    op.add_column(
        "session_events",
        sa.Column("legal_basis_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        "fk_session_events_legal_basis",
        "session_events",
        "legal_basis",
        ["legal_basis_id"],
        ["id"]
    )
    op.create_index("ix_session_events_legal_basis", "session_events", ["legal_basis_id"])
    
    # Insert default "Analytics" legal basis for existing projects
    op.execute("""
        INSERT INTO legal_basis (id, project_id, name, basis_type, description, legitimate_interest_reason, is_active, created_at, updated_at)
        SELECT 
            gen_random_uuid()::uuid,
            'default',
            'Analytics',
            'legitimate_interest',
            'Processing data for analytics and improving services',
            'We have a legitimate interest in understanding how users interact with our services to improve functionality and user experience',
            true,
            NOW(),
            NOW()
        WHERE NOT EXISTS (SELECT 1 FROM legal_basis WHERE name = 'Analytics' AND project_id = 'default')
    """)
    
    # Insert default "Session Recording" legal basis for existing projects
    op.execute("""
        INSERT INTO legal_basis (id, project_id, name, basis_type, description, legitimate_interest_reason, is_active, created_at, updated_at)
        SELECT 
            gen_random_uuid()::uuid,
            'default',
            'Session Recording',
            'legitimate_interest',
            'Recording user sessions for debugging and user experience improvement',
            'We have a legitimate interest in recording sessions to debug issues and understand user behavior patterns',
            true,
            NOW(),
            NOW()
        WHERE NOT EXISTS (SELECT 1 FROM legal_basis WHERE name = 'Session Recording' AND project_id = 'default')
    """)
    
    # Insert default processing activity for existing projects
    op.execute("""
        INSERT INTO processing_activities (id, project_id, name, purpose, legal_basis_id, data_categories, data_retention_days, safeguards, is_active, created_at, updated_at)
        SELECT 
            gen_random_uuid()::uuid,
            'default',
            'Session Replay Analytics',
            'Record and replay user sessions for debugging and UI/UX analysis',
            lb.id,
            '["session_id", "user_actions", "timestamp", "url", "user_agent"]',
            90,
            'Data encrypted at rest and in transit; access restricted to authorized personnel',
            true,
            NOW(),
            NOW()
        FROM legal_basis lb
        WHERE lb.name = 'Analytics' AND lb.project_id = 'default'
        AND NOT EXISTS (SELECT 1 FROM processing_activities WHERE name = 'Session Replay Analytics' AND project_id = 'default')
    """)


def downgrade() -> None:
    # Remove legal_basis_id from session_events
    op.drop_index("ix_session_events_legal_basis", table_name="session_events")
    op.drop_constraint("fk_session_events_legal_basis", "session_events", type_="foreignkey")
    op.drop_column("session_events", "legal_basis_id")
    
    # Drop processing_activities table
    op.drop_index("ix_processing_activities_legal_basis", table_name="processing_activities")
    op.drop_index("ix_processing_activities_project", table_name="processing_activities")
    op.drop_table("processing_activities")
    
    # Drop legal_basis table
    op.drop_index("ix_legal_basis_project", table_name="legal_basis")
    op.drop_table("legal_basis")
