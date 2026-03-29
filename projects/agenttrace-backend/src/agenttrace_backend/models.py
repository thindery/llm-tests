"""SQLAlchemy models for AgentTrace database."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID

from .database import Base


def now_utc():
    """Get current UTC timestamp."""
    return datetime.now(timezone.utc)


class SessionStatus(str, Enum):
    """Session recording status."""
    RECORDING = "recording"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class User(Base):
    """User account model."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    # Stripe integration
    stripe_customer_id = Column(String(255), nullable=True)
    subscription_tier = Column(String(50), default="free")
    subscription_status = Column(String(50), default="inactive")
    
    # Quota tracking
    monthly_sessions_used = Column(Integer, default=0)
    monthly_sessions_limit = Column(Integer, default=100)
    
    # GDPR Data Retention
    retention_policy_enabled = Column(Boolean, default=False)
    retention_period_days = Column(Integer, default=90)
    last_purge_at = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index("ix_users_email", "email"),
    )


class Session(Base):
    """Session replay session."""
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Session metadata
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default=SessionStatus.RECORDING)
    
    # Source info
    source_url = Column(String(2048), nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    # Session data
    started_at = Column(DateTime(timezone=True), default=now_utc)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Storage
    storage_backend = Column(String(50), default="local")  # local, r2, s3
    storage_key = Column(String(512), nullable=True)
    data_size_mb = Column(Float, nullable=True)
    
    # GDPR Soft Delete / Retention
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deletion_reason = Column(String(100), nullable=True)
    is_purged = Column(Boolean, default=False)
    
    # Cost tracking (for LLM sessions)
    estimated_cost_usd = Column(Float, default=0.0)
    token_count = Column(Integer, nullable=True)
    
    # Parsing status
    parsed = Column(Boolean, default=False)
    parsed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    labels = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    __table_args__ = (
        Index("ix_sessions_user_id_created", "user_id", "created_at"),
        Index("ix_sessions_external_id", "external_id"),
        Index("ix_sessions_status", "status"),
    )


class SessionEvent(Base):
    """Individual events within a session."""
    __tablename__ = "session_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    
    # Event data
    event_type = Column(String(100), nullable=False)  # click, scroll, etc.
    event_subtype = Column(String(100), nullable=True)
    timestamp_ms = Column(Integer, nullable=False)  # Timestamp within session
    
    # Event details
    data = Column(JSON, default=dict)  # Full event data
    
    # Position/Element info
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    selector = Column(String(500), nullable=True)
    
    # LLM context
    llm_reasoning = Column(Text, nullable=True)  # Why did agent click here?
    
    # GDPR Legal Basis - required for tracking compliance
    legal_basis_id = Column(UUID(as_uuid=True), ForeignKey("legal_basis.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    
    __table_args__ = (
        Index("ix_events_session_timestamp", "session_id", "timestamp_ms"),
        Index("ix_events_type", "event_type"),
        Index("ix_session_events_legal_basis", "legal_basis_id"),
    )


class SessionShare(Base):
    """Public sharing links for sessions."""
    __tablename__ = "session_shares"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Access control
    password_hash = Column(String(255), nullable=True)
    
    # Analytics
    view_count = Column(Integer, default=0)
    last_viewed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    
    __table_args__ = (
        Index("ix_shares_token", "share_token"),
    )


class APIToken(Base):
    """API tokens for programmatic access."""
    __tablename__ = "api_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    token_hash = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    
    __table_args__ = (
        Index("ix_api_tokens_hash", "token_hash"),
    )


class HealthCheckLog(Base):
    """Database health check logs."""
    __tablename__ = "health_check_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    check_time = Column(DateTime(timezone=True), default=now_utc)
    db_response_ms = Column(Float, nullable=True)
    storage_response_ms = Column(Float, nullable=True)
    
    db_healthy = Column(Boolean, default=False)
    storage_healthy = Column(Boolean, default=False)
    overall_healthy = Column(Boolean, default=False)
    
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    
    __table_args__ = (
        Index("ix_health_overall", "overall_healthy", "created_at"),
    )


class LegalBasis(Base):
    """GDPR Legal Basis for data processing."""
    __tablename__ = "legal_basis"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    
    # GDPR Article 6 basis types
    basis_type = Column(String(50), nullable=False)  # consent, contract, legal_obligation, vital_interests, public_task, legitimate_interest
    description = Column(Text, nullable=True)
    legitimate_interest_reason = Column(Text, nullable=True)  # Required for legitimate_interest basis
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    __table_args__ = (
        Index("ix_legal_basis_project", "project_id"),
    )


class ProcessingActivity(Base):
    """GDPR Article 30 Processing Activity Record."""
    __tablename__ = "processing_activities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(String(255), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=False)
    
    # Link to legal basis
    legal_basis_id = Column(UUID(as_uuid=True), ForeignKey("legal_basis.id"), nullable=False)
    
    # Article 30 requirements
    data_categories = Column(JSON, default=list)  # e.g., ["email", "usage_data", "personal_identifiers"]
    data_retention_days = Column(Integer, nullable=True)
    recipients = Column(Text, nullable=True)  # Who receives the data
    safeguards = Column(Text, nullable=True)  # Security measures (encryption, access controls)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    __table_args__ = (
        Index("ix_processing_activities_project", "project_id"),
        Index("ix_processing_activities_legal_basis", "legal_basis_id"),
    )


class LegalHold(Base):
    """Legal hold to prevent data deletion during litigation or investigation."""
    __tablename__ = "legal_holds"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    reason = Column(Text, nullable=False)
    reference_id = Column(String(255), nullable=True)  # e.g., case number
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)
    
    __table_args__ = (
        Index("ix_legal_holds_session_id", "session_id"),
        Index("ix_legal_holds_user_id", "user_id"),
        Index("ix_legal_holds_active", "is_active", "expires_at"),
        Index("ix_legal_holds_reference_id", "reference_id"),
    )


class ExportJob(Base):
    """GDPR export job for data portability requests."""
    __tablename__ = "export_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    session_ids = Column(JSON, default=list)  # List of session IDs to export
    format = Column(String(50), default="json")  # json, csv, zip
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    
    storage_key = Column(String(512), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        Index("ix_export_jobs_user_id", "user_id"),
        Index("ix_export_jobs_status", "status"),
        Index("ix_export_jobs_expires_at", "expires_at"),
    )


class RetentionAuditLog(Base):
    """Audit log for data retention actions."""
    __tablename__ = "retention_audit_log"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=True)
    
    action = Column(String(100), nullable=False)  # purge, export, legal_hold, settings_update
    details = Column(JSON, default=dict)  # Additional details
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=now_utc)
    
    __table_args__ = (
        Index("ix_retention_audit_user_id", "user_id"),
        Index("ix_retention_audit_session_id", "session_id"),
        Index("ix_retention_audit_created_at", "created_at"),
    )