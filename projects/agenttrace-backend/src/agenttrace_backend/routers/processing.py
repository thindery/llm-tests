"""API endpoints for GDPR Processing Activities and Legal Basis management."""

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import db_manager
from ..models import LegalBasis, ProcessingActivity, SessionEvent

router = APIRouter(prefix="/api/v1/processing", tags=["Processing Activities"])


def now_utc():
    """Get current UTC timestamp."""
    return datetime.now(timezone.utc)


# ==================== Pydantic Models ====================

class LegalBasisCreate(BaseModel):
    """Create legal basis request."""
    name: str = Field(..., min_length=1, max_length=255, description="Name of the legal basis")
    basis_type: str = Field(..., description="GDPR Article 6 basis type")
    description: Optional[str] = Field(None, description="Description of the legal basis")
    legitimate_interest_reason: Optional[str] = Field(None, description="Required for legitimate_interest basis")


class LegalBasisUpdate(BaseModel):
    """Update legal basis request."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    basis_type: Optional[str] = None
    description: Optional[str] = None
    legitimate_interest_reason: Optional[str] = None
    is_active: Optional[bool] = None


class LegalBasisResponse(BaseModel):
    """Legal basis response model."""
    id: str
    project_id: str
    name: str
    basis_type: str
    description: Optional[str]
    legitimate_interest_reason: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProcessingActivityCreate(BaseModel):
    """Create processing activity request."""
    name: str = Field(..., min_length=1, max_length=255, description="Name of the processing activity")
    purpose: str = Field(..., min_length=1, description="Purpose of processing")
    legal_basis_id: str = Field(..., description="UUID of associated legal basis")
    data_categories: List[str] = Field(default=[], description="Categories of data processed")
    data_retention_days: Optional[int] = Field(None, ge=0, description="Data retention period in days")
    recipients: Optional[str] = Field(None, description="Recipients of the data")
    safeguards: Optional[str] = Field(None, description="Security measures")


class ProcessingActivityUpdate(BaseModel):
    """Update processing activity request."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    purpose: Optional[str] = None
    legal_basis_id: Optional[str] = None
    data_categories: Optional[List[str]] = None
    data_retention_days: Optional[int] = Field(None, ge=0)
    recipients: Optional[str] = None
    safeguards: Optional[str] = None
    is_active: Optional[bool] = None


class ProcessingActivityResponse(BaseModel):
    """Processing activity response model."""
    id: str
    project_id: str
    name: str
    purpose: str
    legal_basis_id: str
    legal_basis: Optional[LegalBasisResponse] = None
    data_categories: List[str]
    data_retention_days: Optional[int]
    recipients: Optional[str]
    safeguards: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProcessingActivityExport(BaseModel):
    """Export format for processing activities (Article 30 compliant)."""
    activity_name: str
    purpose: str
    legal_basis: str
    data_categories: str
    data_retention: str
    recipients: str
    safeguards: str


# ==================== Legal Basis Endpoints ====================

@router.post("/legal-basis", response_model=LegalBasisResponse, status_code=201)
async def create_legal_basis(
    request: Request,
    data: LegalBasisCreate,
    project_id: str = Query(..., description="Project ID"),
):
    """Create a new GDPR Legal Basis.
    
    Valid basis types: consent, contract, legal_obligation, vital_interests, public_task, legitimate_interest
    """
    valid_types = ["consent", "contract", "legal_obligation", "vital_interests", "public_task", "legitimate_interest"]
    if data.basis_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid basis_type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Require legitimate_interest_reason for legitimate_interest basis
    if data.basis_type == "legitimate_interest" and not data.legitimate_interest_reason:
        raise HTTPException(
            status_code=400,
            detail="legitimate_interest_reason is required when basis_type is 'legitimate_interest'"
        )
    
    legal_basis = LegalBasis(
        id=uuid.uuid4(),
        project_id=project_id,
        name=data.name,
        basis_type=data.basis_type,
        description=data.description,
        legitimate_interest_reason=data.legitimate_interest_reason,
        is_active=True,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    
    async with db_manager.get_session() as session:
        session.add(legal_basis)
        await session.commit()
        await session.refresh(legal_basis)
        return LegalBasisResponse.from_orm(legal_basis)


@router.get("/legal-basis", response_model=List[LegalBasisResponse])
async def list_legal_basis(
    project_id: str = Query(..., description="Project ID"),
    include_inactive: bool = Query(False, description="Include inactive legal basis"),
):
    """List all legal basis for a project."""
    async with db_manager.get_session() as session:
        query = select(LegalBasis).where(LegalBasis.project_id == project_id)
        if not include_inactive:
            query = query.where(LegalBasis.is_active == True)
        result = await session.execute(query)
        legal_bases = result.scalars().all()
        return [LegalBasisResponse.from_orm(lb) for lb in legal_bases]


@router.get("/legal-basis/{legal_basis_id}", response_model=LegalBasisResponse)
async def get_legal_basis(
    legal_basis_id: str,
    project_id: str = Query(..., description="Project ID"),
):
    """Get a specific legal basis by ID."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(LegalBasis).where(
                LegalBasis.id == legal_basis_id,
                LegalBasis.project_id == project_id
            )
        )
        legal_basis = result.scalar_one_or_none()
        if not legal_basis:
            raise HTTPException(status_code=404, detail="Legal basis not found")
        return LegalBasisResponse.from_orm(legal_basis)


@router.patch("/legal-basis/{legal_basis_id}", response_model=LegalBasisResponse)
async def update_legal_basis(
    legal_basis_id: str,
    data: LegalBasisUpdate,
    project_id: str = Query(..., description="Project ID"),
):
    """Update a legal basis."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(LegalBasis).where(
                LegalBasis.id == legal_basis_id,
                LegalBasis.project_id == project_id
            )
        )
        legal_basis = result.scalar_one_or_none()
        if not legal_basis:
            raise HTTPException(status_code=404, detail="Legal basis not found")
        
        # Validate basis type if provided
        if data.basis_type:
            valid_types = ["consent", "contract", "legal_obligation", "vital_interests", "public_task", "legitimate_interest"]
            if data.basis_type not in valid_types:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid basis_type. Must be one of: {', '.join(valid_types)}"
                )
        
        # Require legitimate_interest_reason when changing to legitimate_interest
        if data.basis_type == "legitimate_interest" and not (data.legitimate_interest_reason or legal_basis.legitimate_interest_reason):
            raise HTTPException(
                status_code=400,
                detail="legitimate_interest_reason is required when basis_type is 'legitimate_interest'"
            )
        
        # Update fields
        update_data = data.model_dump(exclude_unset=True, exclude_none=True)
        if update_data:
            await session.execute(
                update(LegalBasis)
                .where(LegalBasis.id == legal_basis_id)
                .values(**update_data, updated_at=now_utc())
            )
            await session.commit()
        
        await session.refresh(legal_basis)
        return LegalBasisResponse.from_orm(legal_basis)


@router.delete("/legal-basis/{legal_basis_id}", status_code=204)
async def delete_legal_basis(
    legal_basis_id: str,
    project_id: str = Query(..., description="Project ID"),
):
    """Soft delete a legal basis (sets is_active to False)."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(LegalBasis).where(
                LegalBasis.id == legal_basis_id,
                LegalBasis.project_id == project_id
            )
        )
        legal_basis = result.scalar_one_or_none()
        if not legal_basis:
            raise HTTPException(status_code=404, detail="Legal basis not found")
        
        # Check if it's used by any processing activities
        pa_result = await session.execute(
            select(ProcessingActivity).where(
                ProcessingActivity.legal_basis_id == legal_basis_id,
                ProcessingActivity.is_active == True
            )
        )
        if pa_result.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail="Cannot delete legal basis that is in use by active processing activities"
            )
        
        legal_basis.is_active = False
        legal_basis.updated_at = now_utc()
        await session.commit()
    return Response(status_code=204)


# ==================== Processing Activity Endpoints ====================

@router.post("/activities", response_model=ProcessingActivityResponse, status_code=201)
async def create_processing_activity(
    data: ProcessingActivityCreate,
    project_id: str = Query(..., description="Project ID"),
):
    """Create a new Processing Activity (GDPR Article 30 record)."""
    # Verify legal basis exists
    async with db_manager.get_session() as session:
        lb_result = await session.execute(
            select(LegalBasis).where(
                LegalBasis.id == data.legal_basis_id,
                LegalBasis.project_id == project_id
            )
        )
        if not lb_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Legal basis not found for this project")
        
        activity = ProcessingActivity(
            id=uuid.uuid4(),
            project_id=project_id,
            name=data.name,
            purpose=data.purpose,
            legal_basis_id=uuid.UUID(data.legal_basis_id),
            data_categories=data.data_categories,
            data_retention_days=data.data_retention_days,
            recipients=data.recipients,
            safeguards=data.safeguards,
            is_active=True,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        
        session.add(activity)
        await session.commit()
        await session.refresh(activity)
        
        # Load related legal basis
        lb_result = await session.execute(
            select(LegalBasis).where(LegalBasis.id == activity.legal_basis_id)
        )
        legal_basis = lb_result.scalar_one()
        
        response = ProcessingActivityResponse.from_orm(activity)
        response.legal_basis = LegalBasisResponse.from_orm(legal_basis)
        return response


@router.get("/activities", response_model=List[ProcessingActivityResponse])
async def list_processing_activities(
    project_id: str = Query(..., description="Project ID"),
    include_inactive: bool = Query(False, description="Include inactive activities"),
):
    """List all processing activities for a project."""
    async with db_manager.get_session() as session:
        query = select(ProcessingActivity).where(ProcessingActivity.project_id == project_id)
        if not include_inactive:
            query = query.where(ProcessingActivity.is_active == True)
        result = await session.execute(query)
        activities = result.scalars().all()
        
        response_list = []
        for activity in activities:
            lb_result = await session.execute(
                select(LegalBasis).where(LegalBasis.id == activity.legal_basis_id)
            )
            legal_basis = lb_result.scalar_one()
            
            response = ProcessingActivityResponse.from_orm(activity)
            response.legal_basis = LegalBasisResponse.from_orm(legal_basis)
            response_list.append(response)
        
        return response_list


@router.get("/activities/{activity_id}", response_model=ProcessingActivityResponse)
async def get_processing_activity(
    activity_id: str,
    project_id: str = Query(..., description="Project ID"),
):
    """Get a specific processing activity by ID."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ProcessingActivity).where(
                ProcessingActivity.id == activity_id,
                ProcessingActivity.project_id == project_id
            )
        )
        activity = result.scalar_one_or_none()
        if not activity:
            raise HTTPException(status_code=404, detail="Processing activity not found")
        
        lb_result = await session.execute(
            select(LegalBasis).where(LegalBasis.id == activity.legal_basis_id)
        )
        legal_basis = lb_result.scalar_one()
        
        response = ProcessingActivityResponse.from_orm(activity)
        response.legal_basis = LegalBasisResponse.from_orm(legal_basis)
        return response


@router.patch("/activities/{activity_id}", response_model=ProcessingActivityResponse)
async def update_processing_activity(
    activity_id: str,
    data: ProcessingActivityUpdate,
    project_id: str = Query(..., description="Project ID"),
):
    """Update a processing activity."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ProcessingActivity).where(
                ProcessingActivity.id == activity_id,
                ProcessingActivity.project_id == project_id
            )
        )
        activity = result.scalar_one_or_none()
        if not activity:
            raise HTTPException(status_code=404, detail="Processing activity not found")
        
        # Verify new legal basis if provided
        if data.legal_basis_id:
            lb_result = await session.execute(
                select(LegalBasis).where(
                    LegalBasis.id == data.legal_basis_id,
                    LegalBasis.project_id == project_id
                )
            )
            if not lb_result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Legal basis not found for this project")
        
        # Update fields
        update_data = data.model_dump(exclude_unset=True, exclude_none=True)
        if update_data:
            # Handle UUID conversion for legal_basis_id
            if "legal_basis_id" in update_data:
                update_data["legal_basis_id"] = uuid.UUID(update_data["legal_basis_id"])
            
            await session.execute(
                update(ProcessingActivity)
                .where(ProcessingActivity.id == activity_id)
                .values(**update_data, updated_at=now_utc())
            )
            await session.commit()
        
        await session.refresh(activity)
        
        lb_result = await session.execute(
            select(LegalBasis).where(LegalBasis.id == activity.legal_basis_id)
        )
        legal_basis = lb_result.scalar_one()
        
        response = ProcessingActivityResponse.from_orm(activity)
        response.legal_basis = LegalBasisResponse.from_orm(legal_basis)
        return response


@router.delete("/activities/{activity_id}", status_code=204)
async def delete_processing_activity(
    activity_id: str,
    project_id: str = Query(..., description="Project ID"),
):
    """Soft delete a processing activity (sets is_active to False)."""
    async with db_manager.get_session() as session:
        result = await session.execute(
            select(ProcessingActivity).where(
                ProcessingActivity.id == activity_id,
                ProcessingActivity.project_id == project_id
            )
        )
        activity = result.scalar_one_or_none()
        if not activity:
            raise HTTPException(status_code=404, detail="Processing activity not found")
        
        activity.is_active = False
        activity.updated_at = now_utc()
        await session.commit()
    return Response(status_code=204)


# ==================== Export Endpoint (Article 30 Compliance) ====================

@router.get("/export/csv", response_class=PlainTextResponse)
async def export_processing_activities_csv(
    project_id: str = Query(..., description="Project ID"),
):
    """Export processing activities as CSV (GDPR Article 30 compliant format).
    
    Generates a CSV file that can be provided to supervisory authorities
    as part of Article 30 record-keeping obligations.
    """
    async with db_manager.get_session() as session:
        query = select(ProcessingActivity).where(
            ProcessingActivity.project_id == project_id,
            ProcessingActivity.is_active == True
        )
        result = await session.execute(query)
        activities = result.scalars().all()
        
        if not activities:
            raise HTTPException(status_code=404, detail="No processing activities found for this project")
        
        # Prepare CSV data
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "Activity Name",
            "Purpose",
            "Legal Basis",
            "Data Categories",
            "Data Retention (Days)",
            "Recipients",
            "Safeguards",
            "Created At",
            "Updated At"
        ])
        
        # Write data rows
        for activity in activities:
            lb_result = await session.execute(
                select(LegalBasis).where(LegalBasis.id == activity.legal_basis_id)
            )
            legal_basis = lb_result.scalar_one()
            
            writer.writerow([
                activity.name,
                activity.purpose,
                f"{legal_basis.name} ({legal_basis.basis_type})",
                ", ".join(activity.data_categories) if activity.data_categories else "",
                str(activity.data_retention_days) if activity.data_retention_days else "N/A",
                activity.recipients or "N/A",
                activity.safeguards or "N/A",
                activity.created_at.isoformat() if activity.created_at else "",
                activity.updated_at.isoformat() if activity.updated_at else ""
            ])
        
        csv_content = output.getvalue()
        output.close()
        
        return PlainTextResponse(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="processing_activities_{project_id}_{datetime.now(timezone.utc).strftime("%Y%m%d")}.csv"'
            }
        )


@router.get("/export/markdown", response_class=PlainTextResponse)
async def export_processing_activities_markdown(
    project_id: str = Query(..., description="Project ID"),
):
    """Export processing activities as Markdown (GDPR Article 30 compliant format).
    
    Generates a Markdown document that can be used for internal documentation
    or provided to supervisory authorities.
    """
    async with db_manager.get_session() as session:
        query = select(ProcessingActivity).where(
            ProcessingActivity.project_id == project_id,
            ProcessingActivity.is_active == True
        )
        result = await session.execute(query)
        activities = result.scalars().all()
        
        if not activities:
            raise HTTPException(status_code=404, detail="No processing activities found for this project")
        
        # Build Markdown content
        lines = []
        lines.append(f"# Processing Activity Records - {project_id}")
        lines.append(f"_Generated: {datetime.now(timezone.utc).isoformat()}_")
        lines.append("")
        lines.append(f"This document contains the processing activity records maintained pursuant to **GDPR Article 30**.")
        lines.append("")
        lines.append("---")
        lines.append("")
        
        for i, activity in enumerate(activities, 1):
            lb_result = await session.execute(
                select(LegalBasis).where(LegalBasis.id == activity.legal_basis_id)
            )
            legal_basis = lb_result.scalar_one()
            
            lines.append(f"## {i}. {activity.name}")
            lines.append("")
            lines.append(f"**Purpose:** {activity.purpose}")
            lines.append("")
            lines.append(f"**Legal Basis:** {legal_basis.name} ({legal_basis.basis_type})")
            if legal_basis.basis_type == "legitimate_interest" and legal_basis.legitimate_interest_reason:
                lines.append(f"_Legitimate Interest Assessment: {legal_basis.legitimate_interest_reason}_")
            lines.append("")
            lines.append(f"**Data Categories:** {', '.join(activity.data_categories) if activity.data_categories else 'N/A'}")
            lines.append("")
            lines.append(f"**Data Retention:** {activity.data_retention_days} days" if activity.data_retention_days else "**Data Retention:** Not specified")
            lines.append("")
            lines.append(f"**Recipients:** {activity.recipients or 'N/A'}")
            lines.append("")
            lines.append(f"**Security Measures:** {activity.safeguards or 'N/A'}")
            lines.append("")
            lines.append(f"**Last Updated:** {activity.updated_at.isoformat() if activity.updated_at else 'N/A'}")
            lines.append("")
            lines.append("---")
            lines.append("")
        
        md_content = "\n".join(lines)
        
        return PlainTextResponse(
            content=md_content,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f'attachment; filename="processing_activities_{project_id}_{datetime.now(timezone.utc).strftime("%Y%m%d")}.md"'
            }
        )
