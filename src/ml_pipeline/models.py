"""
SQLAlchemy models for ML Pipeline.

Defines the database schema for predictions and shadow mode tracking.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import uuid4

from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Prediction(Base):
    """
    ML model prediction for ticket categorization.
    
    Stores predictions made by ML models about ticket categories,
    along with confidence scores and feature metadata.
    """
    
    __tablename__ = "predictions"
    
    # Primary key
    prediction_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        comment="Unique identifier for the prediction"
    )
    
    # Foreign key to tickets
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the tickets table"
    )
    
    # Model metadata
    model_version = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Version of the ML model (e.g., 'v1.2.3')"
    )
    
    # Prediction results
    predicted_category = Column(
        String(100),
        nullable=False,
        comment="The category predicted by the model"
    )
    
    confidence_score = Column(
        Float,
        nullable=False,
        index=True,
        comment="Confidence score between 0.0 and 1.0"
    )
    
    # Features used for the prediction
    features_used = Column(
        JSONB,
        nullable=False,
        default=dict,
        comment="JSONB containing the features used for this prediction"
    )
    
    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        index=True,
        comment="Timestamp when the prediction was made"
    )
    
    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when the actual outcome was known"
    )
    
    # Outcome tracking
    was_correct = Column(
        Boolean,
        nullable=True,
        index=True,
        comment="Whether the prediction matched the actual outcome (NULL until resolved)"
    )
    
    # Relationships
    shadow_record = relationship(
        "ShadowPrediction",
        back_populates="prediction",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    # Table constraints
    __table_args__ = (
        CheckConstraint(
            "confidence_score >= 0.0 AND confidence_score <= 1.0",
            name="chk_confidence_range"
        ),
    )
    
    def __repr__(self) -> str:
        return (
            f"Prediction(id={self.prediction_id}, "
            f"ticket={self.ticket_id}, "
            f"category='{self.predicted_category}', "
            f"confidence={self.confidence_score:.2f}, "
            f"model={self.model_version})"
        )
    
    def is_resolved(self) -> bool:
        """Check if the prediction has been resolved."""
        return self.was_correct is not None
    
    def resolve(self, actual_outcome: str) -> bool:
        """
        Resolve the prediction with the actual outcome.
        
        Args:
            actual_outcome: The actual category that was assigned
            
        Returns:
            True if prediction was correct, False otherwise
        """
        self.was_correct = (self.predicted_category == actual_outcome)
        self.resolved_at = datetime.utcnow()
        return self.was_correct
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert prediction to dictionary representation."""
        return {
            "prediction_id": str(self.prediction_id),
            "ticket_id": str(self.ticket_id),
            "model_version": self.model_version,
            "predicted_category": self.predicted_category,
            "confidence_score": self.confidence_score,
            "features_used": self.features_used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "was_correct": self.was_correct,
            "is_resolved": self.is_resolved(),
        }


class ShadowPrediction(Base):
    """
    Shadow mode tracking for ML predictions.
    
    Tracks predictions in shadow mode and compares them against
    actual outcomes for model evaluation without affecting production.
    """
    
    __tablename__ = "shadow_predictions"
    
    # Primary key
    shadow_prediction_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        comment="Unique identifier for the shadow prediction record"
    )
    
    # Foreign key to predictions (unique constraint ensures 1:1 relationship)
    prediction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("predictions.prediction_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="Foreign key to predictions table"
    )
    
    # Actual outcome tracking
    actual_outcome = Column(
        String(100),
        nullable=True,
        index=True,
        comment="The actual category that was assigned to the ticket"
    )
    
    # Comparison metrics stored as JSONB
    comparison_metrics = Column(
        JSONB,
        nullable=False,
        default=dict,
        comment="JSONB containing detailed comparison metrics"
    )
    
    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        index=True,
        comment="Timestamp when the shadow record was created"
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="Timestamp when the shadow record was last updated"
    )
    
    # Relationships
    prediction = relationship(
        "Prediction",
        back_populates="shadow_record"
    )
    
    def __repr__(self) -> str:
        return (
            f"ShadowPrediction(id={self.shadow_prediction_id}, "
            f"prediction={self.prediction_id}, "
            f"actual='{self.actual_outcome}')"
        )
    
    def is_resolved(self) -> bool:
        """Check if the shadow prediction has an actual outcome recorded."""
        return self.actual_outcome is not None
    
    def update_outcome(self, actual_outcome: str, metrics: Optional[Dict[str, Any]] = None) -> None:
        """
        Update the shadow prediction with actual outcome.
        
        Args:
            actual_outcome: The actual category that was assigned
            metrics: Optional additional comparison metrics
        """
        self.actual_outcome = actual_outcome
        
        if metrics:
            self.comparison_metrics.update(metrics)
        
        # Update timestamp
        self.updated_at = datetime.utcnow()
    
    def calculate_accuracy(self) -> Optional[float]:
        """
        Calculate prediction accuracy if resolved.
        
        Returns:
            1.0 if correct, 0.0 if incorrect, None if not resolved
        """
        if not self.is_resolved() or not self.prediction:
            return None
        
        return 1.0 if self.prediction.predicted_category == self.actual_outcome else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert shadow prediction to dictionary representation."""
        accuracy = self.calculate_accuracy()
        
        return {
            "shadow_prediction_id": str(self.shadow_prediction_id),
            "prediction_id": str(self.prediction_id),
            "actual_outcome": self.actual_outcome,
            "comparison_metrics": self.comparison_metrics,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_resolved": self.is_resolved(),
            "accuracy": accuracy,
        }