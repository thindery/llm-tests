"""
Pydantic schemas for ML Pipeline.

Defines data validation and serialization schemas for predictions
and shadow mode operations.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict, field_validator


# ============================================
# Prediction Schemas
# ============================================

class PredictionBase(BaseModel):
    """Base schema for predictions with common fields."""
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "model_version": "v1.0.0",
            "predicted_category": "bug",
            "confidence_score": 0.95,
            "features_used": {
                "title_length": 42,
                "description_length": 256,
                "has_stack_trace": True,
            }
        }
    })
    
    model_version: str = Field(
        ..., 
        min_length=1, 
        max_length=50,
        description="Version of the ML model that made the prediction"
    )
    predicted_category: str = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="The category predicted by the model"
    )
    confidence_score: float = Field(
        ..., 
        ge=0.0, 
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )
    features_used: Dict[str, Any] = Field(
        default_factory=dict,
        description="JSON object containing the features used for this prediction"
    )
    
    @field_validator("confidence_score")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        """Ensure confidence score is within valid range."""
        if v < 0.0 or v > 1.0:
            raise ValueError("Confidence score must be between 0.0 and 1.0")
        return round(v, 2)  # Round to 2 decimal places


class PredictionCreate(PredictionBase):
    """Schema for creating a new prediction."""
    
    ticket_id: UUID = Field(
        ..., 
        description="Foreign key to the tickets table"
    )


class PredictionUpdate(BaseModel):
    """Schema for updating an existing prediction (e.g., resolving it)."""
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "was_correct": True,
            "resolved_at": "2026-03-19T10:30:00Z"
        }
    })
    
    was_correct: Optional[bool] = Field(
        None,
        description="Whether the prediction matched the actual outcome"
    )
    resolved_at: Optional[datetime] = Field(
        None,
        description="Timestamp when the actual outcome was known"
    )


class PredictionInDB(PredictionBase):
    """Schema for prediction as stored in the database."""
    
    model_config = ConfigDict(from_attributes=True)
    
    prediction_id: UUID = Field(
        ..., 
        description="Unique identifier for the prediction"
    )
    ticket_id: UUID = Field(
        ..., 
        description="Foreign key to the tickets table"
    )
    created_at: datetime = Field(
        ..., 
        description="Timestamp when the prediction was made"
    )
    resolved_at: Optional[datetime] = Field(
        None,
        description="Timestamp when the actual outcome was known"
    )
    was_correct: Optional[bool] = Field(
        None,
        description="Whether the prediction matched the actual outcome"
    )
    
    @property
    def is_resolved(self) -> bool:
        """Check if the prediction has been resolved."""
        return self.was_correct is not None


class PredictionResponse(PredictionInDB):
    """Schema for prediction API responses."""
    
    is_resolved: bool = Field(
        ..., 
        description="Whether the prediction has been resolved"
    )


# ============================================
# Shadow Prediction Schemas
# ============================================

class ShadowPredictionBase(BaseModel):
    """Base schema for shadow predictions with common fields."""
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "actual_outcome": "feature_request",
            "comparison_metrics": {
                "predicted": "bug",
                "actual": "feature_request",
                "match": False,
                "confidence_delta": 0.45
            }
        }
    })
    
    actual_outcome: Optional[str] = Field(
        None,
        max_length=100,
        description="The actual category that was assigned to the ticket"
    )
    comparison_metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="JSON object containing detailed comparison metrics"
    )


class ShadowPredictionCreate(ShadowPredictionBase):
    """Schema for creating a new shadow prediction record."""
    
    prediction_id: UUID = Field(
        ..., 
        description="Foreign key to predictions table"
    )


class ShadowPredictionUpdate(BaseModel):
    """Schema for updating a shadow prediction record."""
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "actual_outcome": "bug",
            "comparison_metrics": {
                "latency_ms": 150,
                "model_load_time_ms": 45
            }
        }
    })
    
    actual_outcome: Optional[str] = Field(
        None,
        max_length=100,
        description="The actual category that was assigned"
    )
    comparison_metrics: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional comparison metrics to merge"
    )


class ShadowPredictionInDB(ShadowPredictionBase):
    """Schema for shadow prediction as stored in the database."""
    
    model_config = ConfigDict(from_attributes=True)
    
    shadow_prediction_id: UUID = Field(
        ..., 
        description="Unique identifier for the shadow prediction record"
    )
    prediction_id: UUID = Field(
        ..., 
        description="Foreign key to predictions table"
    )
    created_at: datetime = Field(
        ..., 
        description="Timestamp when the shadow record was created"
    )
    updated_at: datetime = Field(
        ..., 
        description="Timestamp when the shadow record was last updated"
    )
    
    @property
    def is_resolved(self) -> bool:
        """Check if the shadow prediction has an actual outcome recorded."""
        return self.actual_outcome is not None


class ShadowPredictionResponse(ShadowPredictionInDB):
    """Schema for shadow prediction API responses."""
    
    is_resolved: bool = Field(
        ..., 
        description="Whether the shadow prediction has been resolved"
    )
    accuracy: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Prediction accuracy (1.0 if correct, 0.0 if incorrect)"
    )


# ============================================
# Resolution Schemas
# ============================================

class PredictionResolution(BaseModel):
    """
    Schema for resolving a prediction with actual outcome.
    
    Used when the actual category is known and we want to
    evaluate the prediction accuracy.
    """
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "actual_outcome": "bug",
            "comparison_metrics": {
                "resolution_source": "manual_review",
                "reviewed_by": "user_123"
            }
        }
    })
    
    actual_outcome: str = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="The actual category that was assigned to the ticket"
    )
    comparison_metrics: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional metrics from the resolution process"
    )


# ============================================
# Batch Operation Schemas
# ============================================

class BatchPredictionCreate(BaseModel):
    """Schema for creating multiple predictions in a batch."""
    
    predictions: list[PredictionCreate] = Field(
        ..., 
        min_length=1,
        max_length=1000,
        description="List of predictions to create"
    )


class BatchPredictionResponse(BaseModel):
    """Schema for batch prediction creation response."""
    
    created_count: int = Field(
        ..., 
        description="Number of predictions successfully created"
    )
    failed_count: int = Field(
        ..., 
        description="Number of predictions that failed to create"
    )
    prediction_ids: list[UUID] = Field(
        default_factory=list,
        description="IDs of successfully created predictions"
    )


# ============================================
# Statistics Schemas
# ============================================

class PredictionStats(BaseModel):
    """Schema for prediction statistics."""
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "total_predictions": 1000,
            "resolved_predictions": 750,
            "correct_predictions": 680,
            "accuracy_percentage": 90.67,
            "avg_confidence": 0.87,
            "model_version": "v1.0.0"
        }
    })
    
    total_predictions: int = Field(
        ..., 
        ge=0,
        description="Total number of predictions"
    )
    resolved_predictions: int = Field(
        ..., 
        ge=0,
        description="Number of predictions that have been resolved"
    )
    correct_predictions: int = Field(
        ..., 
        ge=0,
        description="Number of predictions that were correct"
    )
    accuracy_percentage: float = Field(
        ..., 
        ge=0.0,
        le=100.0,
        description="Accuracy percentage"
    )
    avg_confidence: float = Field(
        ..., 
        ge=0.0,
        le=1.0,
        description="Average confidence score"
    )
    model_version: Optional[str] = Field(
        None,
        description="Model version these statistics apply to"
    )


class ShadowModeStats(BaseModel):
    """Schema for shadow mode statistics."""
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "total_shadow_predictions": 500,
            "resolved_predictions": 400,
            "accuracy_percentage": 85.5,
            "avg_latency_ms": 150.0,
            "pending_count": 100
        }
    })
    
    total_shadow_predictions: int = Field(
        ..., 
        ge=0,
        description="Total number of shadow predictions"
    )
    resolved_predictions: int = Field(
        ..., 
        ge=0,
        description="Number of shadow predictions with known outcomes"
    )
    accuracy_percentage: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Overall accuracy percentage"
    )
    avg_latency_ms: Optional[float] = Field(
        None,
        ge=0.0,
        description="Average prediction latency in milliseconds"
    )
    pending_count: int = Field(
        ..., 
        ge=0,
        description="Number of predictions awaiting resolution"
    )