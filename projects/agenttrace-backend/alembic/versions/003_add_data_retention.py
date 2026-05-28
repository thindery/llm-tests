"""Add data retention policy and legal hold support.

Revision ID: 003
Revises: 002
Create Date: 2026-03-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add retention policy columns to users table
    op.add_column(
        "users",
        sa.Column("retention_policy_enabled", sa.Boolean(), default=False, nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("retention_period_days", sa.Integer(), default=90, nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("last_purge_at", sa.DateTime(timezone=True), nullable=True)
    )
    
    # Add soft delete columns to sessions table
    op.add_column(
        "sessions",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "sessions",
        sa.Column("deletion_reason", sa.String(100), nullable=True)
    )
    op.add_column(
        "sessions",
        sa.Column("is_purged", sa.Boolean(), default=False, nullable=True)
    )
    
    # Create legal_holds table
    op.create_table(
        "legal_holds",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("reference_id", sa.String(255), nullable=True),  # e.g., case number
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_legal_holds_session_id", "legal_holds", ["session_id"])
    op.create_index("ix_legal_holds_user_id", "legal_holds", ["user_id"])
    op.create_index("ix_legal_holds_active", "legal_holds", ["is_active", "expires_at"])
    op.create_index("ix_legal_holds_reference_id", "legal_holds", ["reference_id"])
    
    # Create export_jobs table for tracking pending exports
    op.create_table(
        "export_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_ids", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("format", sa.String(50), default="json"),  # json, csv, zip
        sa.Column("status", sa.String(50), default="pending"),  # pending, processing, completed, failed
        sa.Column("storage_key", sa.String(512), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_export_jobs_user_id", "export_jobs", ["user_id"])
    op.create_index("ix_export_jobs_status", "export_jobs", ["status"])
    op.create_index("ix_export_jobs_expires_at", "export_jobs", ["expires_at"])
    
    # Create retention_audit_log table
    op.create_table(
        "retention_audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),  # purge, export, legal_hold, settings_update
        sa.Column("details", postgresql.JSON(astext_type=sa.Text()), default=dict),
        sa.Column("performed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_retention_audit_user_id", "retention_audit_log", ["user_id"])
    op.create_index("ix_retention_audit_session_id", "retention_audit_log", ["session_id"])
    op.create_index("ix_retention_audit_created_at", "retention_audit_log", ["created_at"])
    
    # Insert default global retention policy
    op.execute("""
        INSERT INTO retention_audit_log (id, action, details, created_at)
        SELECT 
            gen_random_uuid()::uuid,
            'settings_update',
            '{"retention_policy_enabled": false, "retention_period_days": 90, "global_policy": true}',
            NOW()
        WHERE NOT EXISTS (SELECT 1 FROM retention_audit_log WHERE action = 'settings_update' AND (details->>'global_policy')::boolean = true)
    """)


def downgrade() -> None:
    # Drop audit log table
    op.drop_index("ix_retention_audit_created_at", table_name="retention_audit_log")
    op.drop_index("ix_retention_audit_session_id", table_name="retention_audit_log")
    op.drop_index("ix_retention_audit_user_id", table_name="retention_audit_log")
    op.drop_table("retention_audit_log")
    
    # Drop export jobs table
    op.drop_index("ix_export_jobs_expires_at", table_name="export_jobs")
    op.drop_index("ix_export_jobs_status", table_name="export_jobs")
    op.drop_index("ix_export_jobs_user_id", table_name="export_jobs")
    op.drop_table("export_jobs")
    
    # Drop legal holds table
    op.drop_index("ix_legal_holds_reference_id", table_name="legal_holds")
    op.drop_index("ix_legal_holds_active", table_name="legal_holds")
    op.drop_index("ix_legal_holds_user_id", table_name="legal_holds")
    op.drop_index("ix_legal_holds_session_id", table_name="legal_holds")
    op.drop_table("legal_holds")
    
    # Remove session purge columns
    op.drop_column("sessions", "is_purged")
    op.drop_column("sessions", "deletion_reason")
    op.drop_column("sessions", "deleted_at")
    
    # Remove user retention columns
    op.drop_column("users", "last_purge_at")
    op.drop_column("users", "retention_period_days")
    op.drop_column("users", "retention_policy_enabled")
