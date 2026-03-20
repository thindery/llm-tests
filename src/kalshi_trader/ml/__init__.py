"""ML Pipeline for Kalshi Trader - Confidence Scoring, A/B Testing, Model Training & Production Integration.

This module provides:
- Bayesian confidence scoring for trade suggestions
- A/B testing framework for strategy validation
- Feature engineering (20+ features per model)
- Model training pipeline (XGBoost/LightGBM)
- Model registry for version control
- Metrics tracking and statistical analysis
- Safety controls with circuit breakers
- Graduation logic for shadow/live trading
- Production integration with graceful degradation
- Configuration system with environment support

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
    >>>
    >>> # Safety controls
    >>> from kalshi_trader.ml import SafetyControls, SafetyConfig
    >>> safety = SafetyControls(config=SafetyConfig(max_daily_loss=-50.0))
    >>>
    >>> # Graduation logic
    >>> from kalshi_trader.ml import GraduationLogic
    >>> grad = GraduationLogic()
    >>> grad.record_trade(SuggestionType.BREAKOUT, pnl=10.0)
    >>> grad.auto_graduate(SuggestionType.BREAKOUT)
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

# Phase 4: Safety Controls & Graduation Logic
from .safety_controls import (
    SafetyControls,
    SafetyConfig,
    SafetyState,
    SafetyStatus,
    CircuitBreakerReason,
    CircuitBreakerRecord,
    create_safety_controls,
)
from .graduation_logic import (
    GraduationLogic,
    GraduationThresholds,
    StrategyMode,
    GraduationDirection,
    GraduationEvent,
    StrategyPerformance,
    create_graduation_logic,
)

# Phase 5: Production Integration & Monitoring
from .config import (
    MLConfig,
    IntegrationConfig,
    MonitoringConfig,
    NotificationConfig,
    MLFeatureLevel,
    Environment,
    SlackConfig,
    EmailConfig,
    load_config,
)
from .trading_integration import (
    MLEnhancedTrader,
    MLTradingLoop,
    TradeSuggestion,
    MLEnhancedTrade,
    create_ml_trader,
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
    # Phase 4: Safety Controls
    "SafetyControls",
    "SafetyConfig",
    "SafetyState",
    "SafetyStatus",
    "CircuitBreakerReason",
    "CircuitBreakerRecord",
    "create_safety_controls",
    # Phase 4: Graduation Logic
    "GraduationLogic",
    "GraduationThresholds",
    "StrategyMode",
    "GraduationDirection",
    "GraduationEvent",
    "StrategyPerformance",
    "create_graduation_logic",
    # Phase 5: Production Integration
    "MLConfig",
    "IntegrationConfig",
    "MonitoringConfig",
    "NotificationConfig",
    "MLFeatureLevel",
    "Environment",
    "SlackConfig",
    "EmailConfig",
    "load_config",
    "MLEnhancedTrader",
    "MLTradingLoop",
    "TradeSuggestion",
    "MLEnhancedTrade",
    "create_ml_trader",
]

__version__ = "0.5.0"
