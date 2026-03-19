"""
ML Pipeline - Machine Learning Prediction Pipeline for Ticket Categorization.

Phase 1: Database Schema & Shadow Mode
- SQLAlchemy models for predictions and shadow mode tracking
- Pydantic schemas for data validation
- Configuration management
"""

from .models import Prediction, ShadowPrediction
from .schema import (
    PredictionCreate,
    PredictionResponse,
    PredictionUpdate,
    ShadowPredictionCreate,
    ShadowPredictionResponse,
    ShadowPredictionUpdate,
    PredictionResolution,
)
from .config import MLConfig, get_ml_config

__version__ = "0.1.0"
__all__ = [
    "Prediction",
    "ShadowPrediction",
    "PredictionCreate",
    "PredictionResponse",
    "PredictionUpdate",
    "ShadowPredictionCreate",
    "ShadowPredictionResponse",
    "ShadowPredictionUpdate",
    "PredictionResolution",
    "MLConfig",
    "get_ml_config",
]