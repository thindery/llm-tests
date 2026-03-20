"""ML Pipeline for Kalshi Trader - Confidence Scoring, A/B Testing & Model Training.

This module provides:
- Bayesian confidence scoring for trade suggestions
- A/B testing framework for strategy validation
- Feature engineering (20+ features per model)
- Model training pipeline (XGBoost/LightGBM)
- Model registry for version control
- Metrics tracking and statistical analysis

Example:
    >>> from kalshi_trader.ml import ConfidenceScorer, ABTesting
    >>>
    >>> # Get confidence for a suggestion
    >>> scorer = ConfidenceScorer()
    >>> confidence = scorer.get_confidence("breakout")
    >>>
    >>> # Assign user to A/B group
    >>> ab = ABTesting()
    >>> group = ab.assign_group("user123", "2026-03-19")
    >>>
    >>> # Update after trade completes
    >>> scorer.update_after_trade("breakout", profit=5.0)
    >>>
    >>> # Feature engineering
    >>> from kalshi_trader.ml import FeatureEngineer, PriceHistory
    >>> engineer = FeatureEngineer()
    >>> features = engineer.extract_features(price_history)
    >>>
    >>> # Model training
    >>> from kalshi_trader.ml import ModelTrainer, TrainingConfig, ModelType
    >>> trainer = ModelTrainer(TrainingConfig(model_type=ModelType.XGBOOST))
    >>> result = trainer.train(X, y, feature_names)
    >>>
    >>> # Model registry
    >>> from kalshi_trader.ml import ModelRegistry
    >>> registry = ModelRegistry()
    >>> version = registry.register_model("breakout_model", result, model_path)
"""

from .confidence_scorer import ConfidenceScorer, SuggestionType
from .ab_testing import ABTesting, ABMetrics, ABAssignment
from .database import MLDatabase
from .feature_engineering import (
    FeatureEngineer,
    FeatureSet,
    PriceHistory,
    FeatureCategory,
)
from .model_training import (
    ModelTrainer,
    EnsembleTrainer,
    TrainingConfig,
    TrainingResult,
    CrossValidationResult,
    ModelType,
)
from .model_registry import (
    ModelRegistry,
    ModelVersion,
    ModelComparison,
    ModelStatus,
)
from .ml_pipeline import (
    MLPipeline,
    MLPrediction,
    PipelineMetrics,
    create_pipeline,
)

__all__ = [
    # Phase 2: Confidence & A/B Testing
    "ConfidenceScorer",
    "SuggestionType",
    "ABTesting",
    "ABMetrics",
    "ABAssignment",
    "MLDatabase",
    # Phase 3: Feature Engineering
    "FeatureEngineer",
    "FeatureSet",
    "PriceHistory",
    "FeatureCategory",
    # Phase 3: Model Training
    "ModelTrainer",
    "EnsembleTrainer",
    "TrainingConfig",
    "TrainingResult",
    "CrossValidationResult",
    "ModelType",
    # Phase 3: Model Registry
    "ModelRegistry",
    "ModelVersion",
    "ModelComparison",
    "ModelStatus",
    # Phase 3: Pipeline Integration
    "MLPipeline",
    "MLPrediction",
    "PipelineMetrics",
    "create_pipeline",
]

__version__ = "0.3.0"
