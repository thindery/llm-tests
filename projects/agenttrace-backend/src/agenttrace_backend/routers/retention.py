"""API endpoints for GDPR data retention settings and management.

Provides endpoints for:
- Retention policy configuration
- Legal hold management  
- Export job management
- Manual purge operations
- Audit log viewing
"""

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import PlainTextResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update, and_, or_, desc
from dateutil.parser import isoparse

from ..database import db_manager
from ..models import (
    Session, User, LegalHold, ExportJob, RetentionAuditLog, now_utc
)
from ..retention_worker import retention_worker

router = APIRouter(prefix="/api/v1/retention", tags=["Data Retention"])


# ==================== Pydantic Models ====================

class RetentionSettingsUpdate(BaseModel):
    """Update retention settings request."""
    retention_policy_enabled: Optional[bool] = Field(None, description="Enable automatic retention enforcement")
    retention_period_days: Optional[int] = Field(None, ge=1, description="Retention period in days (minimum 1)")


class RetentionSettingsResponse(BaseModel):
    """Retention settings response model."""
    user_id: str
    retention_policy_enabled: bool
    retention_period_days: int
    last_purge_at: Optional[datetime]
    next_scheduled_purge: Optional[str] = None
    
    class Config:
        from_attributes = True


class LegalHoldCreate(BaseModel):
    """Create legal hold request."""
    session_id: str = Field(..., description="Session ID to place on hold")
    reason: str = Field(..., min_length=1, max_length=2000, description="Reason for legal hold")
    reference_id: Optional[str] = Field(None, max_length=255, description="Case or reference number")
    expires_at: Optional[datetime] = Field(None, description="Optional expiration date for the hold")
    
    @field_validator('expires_at')
    @classmethod
    def validate_expiration(cls, v):
        if v and v <= datetime.now(timezone.utc):
            raise ValueError("Expiration date must be in the future")
        return v


class LegalHoldUpdate(BaseModel):
    """Update legal hold request."""
    reason: Optional[str] = Field(None, min_length=1, max_length=2000)
    reference_id: Optional[str] = Field(None, max_length=255)
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None
    
    @field_validator('expires_at')
    @classmethod
    def validate_expiration(cls, v):
        if v and v <= datetime.now(timezone.utc):
            raise ValueError("Expiration date must be in the future")
        return v


class LegalHoldResponse(BaseModel):
    """Legal hold response model."""
    id: str
    session_id: str
    user_id: str
    reason: str
    reference_id: Optional[str]
    created_by: str
    expires_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ExportJobCreate(BaseModel):
    """Create export job request (GDPR portability)."""
    session_ids: List[str] = Field(..., min_length=1, description="List of session IDs to export")
    format: str = Field("json", description="Export format: json, csv, or zip")
    
    @field_validator('format')
    @classmethod
    def validate_format(cls, v):
        if v not in ["json", "csv", "zip"]:
            raise ValueError("Format must be one of: json, csv, zip")
        return v


class ExportJobResponse(BaseModel):
    """Export job response model."""
    id: str
    user_id: str
    session_ids: List[str]
    format: str
    status: str
    storage_key: Optional[str]
    expires_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class RetentionAuditResponse(BaseModel):
    """Retention audit log entry response."""
    id: str
    user_id: Optional[str]
    session_id: Optional[str]
    action: str
    details: dict
    performed_by: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class PurgeRequest(BaseModel):
    """Manual purge request."""
    force: bool = Field(False, description="Force purge even if no retention policy is set")
    dry_run: bool = Field(False, description="Show what would be purged without actually deleting")


class PurgeResponse(BaseModel):
    """Manual purge response."""
    sessions_deleted: int
    sessions_skipped: int
    user_id: str
    performed_at: str
    dry_run: bool


# ==================== Retention Settings Endpoints ====================

@router.get("/settings", response_model=RetentionSettingsResponse)
async def get_retention_settings(
    user_id: str = Query(..., description="User ID"),
):
    """Get data retention settings for a user.
    
    Returns the current retention policy configuration including
    whether auto-purge is enabled and the retention period.
    """
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate next scheduled purge (3 AM UTC after last purge)
        next_purge = None
        if user.last_purge_at:
            next_purge = (user.last_purge_at + timedelta(days=1)).replace(
                hour=3, minute=0, second=0
            ).isoformat()
        
        return RetentionSettingsResponse(
            user_id=str(user.id),
            retention_policy_enabled=user.retention_policy_enabled or False,
            retention_period_days=user.retention_period_days or 90,
            last_purge_at=user.last_purge_at,
            next_scheduled_purge=next_purge
        )


@router.patch("/settings", response_model=RetentionSettingsResponse)
async def update_retention_settings(
    data: RetentionSettingsUpdate,
    user_id: str = Query(..., description="User ID"),
    performed_by: Optional[str] = Query(None, description="Admin user performing the update"),
):
    """Update data retention settings for a user.
    
    Adjust retention policy settings including enabling/disabling
    automatic purge and changing retention period.
    """
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Apply updates
        await session.execute(
            update(User)
            .where(User.id == user_id)
            .values(**update_data)
        )
        
        # Log audit
        audit = RetentionAuditLog(
            user_id=user_id,
            action="settings_update",
            performed_by=performed_by,
            details={
                "settings_changed": update_data,
                "previous_retention_days": user.retention_period_days,
                "previous_enabled": user.retention_policy_enabled
            }
        )
        session.add(audit)
        await session.commit()
        
        await session.refresh(user)
        return RetentionSettingsResponse(
            user_id=str(user.id),
            retention_policy_enabled=user.retention_policy_enabled or False,
            retention_period_days=user.retention_period_days or 90,
            last_purge_at=user.last_purge_at
        )


# ==================== Legal Hold Endpoints ====================

@router.post("/legal-holds", response_model=LegalHoldResponse, status_code=201)
async def create_legal_hold(
    data: LegalHoldCreate,
    user_id: str = Query(..., description="User ID"),
    created_by: str = Query(..., description="User creating the hold"),
):
    """Create a new legal hold for a session.
    
    Prevents the session from being purged during retention enforcement.
    Used for litigation, investigation, or other legal purposes.
    """
    async with db_manager.get_session() as session:
        # Verify session exists and belongs to user
        sess_result = await session.execute(
            select(Session).where(
                and_(
                    Session.id == data.session_id,
                    Session.user_id == user_id
                )
            )
        )
        if not sess_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if there's already an active hold
        existing = await session.execute(
            select(LegalHold).where(
                and_(
                    LegalHold.session_id == data.session_id,
                    LegalHold.is_active == True
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Active legal hold already exists for this session")
        
        # Create the hold
        hold = LegalHold(
            id=uuid.uuid4(),
            session_id=uuid.UUID(data.session_id),
            user_id=uuid.UUID(user_id),
            reason=data.reason,
            reference_id=data.reference_id,
            created_by=uuid.UUID(created_by),
            expires_at=data.expires_at,
            is_active=True,
            created_at=now_utc(),
            updated_at=now_utc()
        )
        session.add(hold)
        
        # Log audit
        audit = RetentionAuditLog(
            user_id=user_id,
            session_id=data.session_id,
            action="legal_hold",
            performed_by=created_by,
            details={
                "hold_id": str(hold.id),
                "reference_id": data.reference_id,
                "expiration": data.expires_at.isoformat() if data.expires_at else None
            }
        )
        session.add(audit)
        await session.commit()
        await session.refresh(hold)
        
        return LegalHoldResponse.from_orm(hold)


@router.get("/legal-holds", response_model=List[LegalHoldResponse])
async def list_legal_holds(
    user_id: str = Query(..., description="User ID"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    include_inactive: bool = Query(False, description="Include inactive/expired holds"),
):
    """List all legal holds for a user.
    
    Returns legal holds that prevent session deletion.
    """
    async with db_manager.get_session() as session:
        query = select(LegalHold).where(LegalHold.user_id == user_id)
        
        if session_id:
            query = query.where(LegalHold.session_id == session_id)
        
        if not include_inactive:
            query = query.where(
                and_(
                    LegalHold.is_active == True,
                    or_(
                        LegalHold.expires_at.is_(None),
                        LegalHold.expires_at > now_utc()
                    )
                )
            )
        
        result = await session.execute(query.order_by(desc(LegalHold.created_at)))
        holds = result.scalars().all()
        return [LegalHoldResponse.from_orm(h) for h in holds]


@router.get("/legal-holds/{hold_id}", response_model=LegalHoldResponse)
async def get_legal_hold(
    hold_id: str,
    user_id: str = Query(..., description="User ID"),
):
    """Get a specific legal hold by ID."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(LegalHold).where(
                and_(
                    LegalHold.id == hold_id,
                    LegalHold.user_id == user_id
                )
            )
        )
        hold = result.scalar_one_or_none()
        if not hold:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        return LegalHoldResponse.from_orm(hold)


@router.patch("/legal-holds/{hold_id}", response_model=LegalHoldResponse)
async def update_legal_hold(
    hold_id: str,
    data: LegalHoldUpdate,
    user_id: str = Query(..., description="User ID"),
):
    """Update a legal hold.
    
    Can be used to extend expiration, update reason, or deactivate.
    """
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(LegalHold).where(
                and_(
                    LegalHold.id == hold_id,
                    LegalHold.user_id == user_id
                )
            )
        )
        hold = result.scalar_one_or_none()
        if not hold:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        
        await session.execute(
            update(LegalHold)
            .where(LegalHold.id == hold_id)
            .values(**update_data, updated_at=now_utc())
        )
        await session.flush()
        
        # Log audit
        audit = RetentionAuditLog(
            user_id=user_id,
            session_id=str(hold.session_id),
            action="settings_update",
            details={
                "hold_id": hold_id,
                "update_type": "legal_hold",
                "changes": update_data
            }
        )
        session.add(audit)
        await session.commit()
        await session.refresh(hold)
        return LegalHoldResponse.from_orm(hold)


@router.delete("/legal-holds/{hold_id}", status_code=204)
async def delete_legal_hold(
    hold_id: str,
    user_id: str = Query(..., description="User ID"),
    performed_by: Optional[str] = Query(None, description="User removing the hold"),
):
    """Deactivate/remove a legal hold.
    
    Soft deletion - marks the hold as inactive.
    """
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(LegalHold).where(
                and_(
                    LegalHold.id == hold_id,
                    LegalHold.user_id == user_id
                )
            )
        )
        hold = result.scalar_one_or_none()
        if not hold:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        
        hold.is_active = False
        hold.updated_at = now_utc()
        
        # Log audit
        audit = RetentionAuditLog(
            user_id=user_id,
            session_id=str(hold.session_id),
            action="legal_hold",
            performed_by=performed_by,
            details={
                "hold_id": hold_id,
                "action": "removed"
            }
        )
        session.add(audit)
        await session.commit()
    return Response(status_code=204)


# ==================== Export Job Endpoints ====================

@router.post("/exports", response_model=ExportJobResponse, status_code=201)
async def create_export_job(
    data: ExportJobCreate,
    user_id: str = Query(..., description="User ID"),
):
    """Create a new GDPR data export job.
    
    Initiates an export of session data for GDPR portability requests.
    The export process is asynchronous.
    """
    async with db_manager.get_session() as session:
        # Verify all sessions belong to user
        result = await session.execute(
            select(Session).where(
                and_(
                    Session.id.in_(data.session_ids),
                    Session.user_id == user_id
                )
            )
        )
        found_sessions = result.scalars().all()
        found_ids = {str(s.id) for s in found_sessions}
        missing = set(data.session_ids) - found_ids
        
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Sessions not found: {', '.join(missing)}"
            )
        
        # Create export job
        export = ExportJob(
            id=uuid.uuid4(),
            user_id=uuid.UUID(user_id),
            session_ids=data.session_ids,
            format=data.format,
            status="pending",
            expires_at=now_utc() + timedelta(days=30),
            created_at=now_utc()
        )
        session.add(export)
        
        # Log audit
        audit = RetentionAuditLog(
            user_id=user_id,
            action="export",
            details={
                "export_id": str(export.id),
                "session_count": len(data.session_ids),
                "format": data.format
            }
        )
        session.add(audit)
        await session.commit()
        await session.refresh(export)
        
        return ExportJobResponse.from_orm(export)


@router.get("/exports", response_model=List[ExportJobResponse])
async def list_export_jobs(
    user_id: str = Query(..., description="User ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all export jobs for a user."""
    async with db_manager.get_session() as session:
        query = select(ExportJob).where(ExportJob.user_id == user_id)
        if status:
            query = query.where(ExportJob.status == status)
        
        result = await session.execute(query.order_by(desc(ExportJob.created_at)))
        exports = result.scalars().all()
        return [ExportJobResponse.from_orm(e) for e in exports]


@router.get("/exports/{export_id}", response_model=ExportJobResponse)
async def get_export_job(
    export_id: str,
    user_id: str = Query(..., description="User ID"),
):
    """Get export job status and details."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ExportJob).where(
                and_(
                    ExportJob.id == export_id,
                    ExportJob.user_id == user_id
                )
            )
        )
        export = result.scalar_one_or_none()
        if not export:
            raise HTTPException(status_code=404, detail="Export job not found")
        return ExportJobResponse.from_orm(export)


@router.delete("/exports/{export_id}", status_code=204)
async def cancel_export_job(
    export_id: str,
    user_id: str = Query(..., description="User ID"),
):
    """Cancel a pending export job."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ExportJob).where(
                and_(
                    ExportJob.id == export_id,
                    ExportJob.user_id == user_id,
                    ExportJob.status.in_(["pending", "processing"])
                )
            )
        )
        export = result.scalar_one_or_none()
        if not export:
            raise HTTPException(
                status_code=404,
                detail="Export job not found or already completed"
            )
        
        export.status = "cancelled"
        await session.commit()
    return Response(status_code=204)


# ==================== Manual Purge Endpoints ====================

@router.post("/purge", response_model=PurgeResponse)
async def manual_purge(
    data: PurgeRequest,
    user_id: str = Query(..., description="User ID"),
    performed_by: Optional[str] = Query(None, description="Admin performing purge"),
):
    """Manually trigger retention purge for a user.
    
    Useful for testing or immediate compliance requirements.
    Use dry_run=true to preview what would be deleted.
    """
    if data.dry_run:
        # Calculate what would be purged
        async with db_manager.get_session() as session:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            retention_days = user.retention_period_days or 90
            cutoff_date = now_utc() - timedelta(days=retention_days)
            
            result = await session.execute(
                select(Session).where(
                    and_(
                        Session.user_id == user_id,
                        Session.created_at < cutoff_date,
                        Session.is_purged == False,
                        Session.deleted_at.is_(None)
                    )
                )
            )
            expired = result.scalars().all()
            
            return PurgeResponse(
                sessions_deleted=len(expired),
                sessions_skipped=0,
                user_id=user_id,
                performed_at=now_utc().isoformat(),
                dry_run=True
            )
    
    # Real purge
    try:
        result = await retention_worker.manual_purge_user(user_id, performed_by)
        return PurgeResponse(
            sessions_deleted=result["sessions_deleted"],
            sessions_skipped=result["sessions_skipped"],
            user_id=user_id,
            performed_at=result["performed_at"],
            dry_run=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Purge failed: {str(e)}")


# ==================== Audit Log Endpoints ====================

@router.get("/audit-log", response_model=List[RetentionAuditResponse])
async def get_audit_log(
    user_id: Optional[str] = Query(None, description="Filter by user"),
    session_id: Optional[str] = Query(None, description="Filter by session"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
):
    """Get retention audit log.
    
    Shows all retention-related actions including purges, exports,
    legal holds, and settings changes.
    """
    async with db_manager.get_session() as session:
        query = select(RetentionAuditLog)
        
        if user_id:
            query = query.where(RetentionAuditLog.user_id == user_id)
        if session_id:
            query = query.where(RetentionAuditLog.session_id == session_id)
        if action:
            query = query.where(RetentionAuditLog.action == action)
        
        query = query.order_by(desc(RetentionAuditLog.created_at)).limit(limit)
        result = await session.execute(query)
        logs = result.scalars().all()
        return [RetentionAuditResponse.from_orm(log) for log in logs]


@router.get("/audit-log/export", response_class=PlainTextResponse)
async def export_audit_log(
    user_id: Optional[str] = Query(None, description="Filter by user"),
    start_date: Optional[datetime] = Query(None, description="Start date (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO 8601)"),
):
    """Export audit log as CSV for compliance reporting."""
    async with db_manager.get_session() as session:
        query = select(RetentionAuditLog)
        
        if user_id:
            query = query.where(RetentionAuditLog.user_id == user_id)
        if start_date:
            query = query.where(RetentionAuditLog.created_at >= start_date)
        if end_date:
            query = query.where(RetentionAuditLog.created_at <= end_date)
        
        result = await session.execute(query.order_by(desc(RetentionAuditLog.created_at)))
        logs = result.scalars().all()
        
        if not logs:
            raise HTTPException(status_code=404, detail="No audit logs found")
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Timestamp", "Action", "User ID", "Session ID", 
            "Performed By", "Details"
        ])
        
        for log in logs:
            writer.writerow([
                log.created_at.isoformat() if log.created_at else "",
                log.action,
                str(log.user_id) if log.user_id else "",
                str(log.session_id) if log.session_id else "",
                str(log.performed_by) if log.performed_by else "",
                str(log.details) if log.details else ""
            ])
        
        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="retention_audit_{datetime.now(timezone.utc).strftime("%Y%m%d")}.csv"'
            }
        )


# Need to import timedelta here
from datetime import timedelta