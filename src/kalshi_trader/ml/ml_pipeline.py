"""ML Pipeline Integration for Kalshi Trader.

Integrates Phase 2 (Confidence Scoring, A/B Testing) with Phase 3
(Feature Engineering, Model Training, Model Registry) and Phase 4
(Safety Controls, Graduation Logic).

Provides a unified interface for:
- Extracting features from trade data
- Training and registering models
- Making predictions with confidence scores
- Tracking model performance
- Managing safety controls and circuit breakers
- Automatic strategy graduation between shadow/live
"""

from __future__ import annotations

import json
import logging
import numpy as np
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

from .confidence_scorer import ConfidenceScorer, SuggestionType
from .ab_testing import ABTesting
from .database import MLDatabase
from .feature_engineering import FeatureEngineer, PriceHistory, FeatureSet
from .model_training import (
    ModelTrainer,
    EnsembleTrainer,
    TrainingConfig,
    TrainingResult,
    ModelType,
)
from .model_registry import (
    ModelRegistry,
    ModelVersion,
    ModelStatus,
)
from .safety_controls import (
    SafetyControls,
    SafetyConfig,
    SafetyState,
    SafetyStatus,
    CircuitBreakerReason,
    create_safety_controls,
)
from .graduation_logic import (
    GraduationLogic,
    GraduationThresholds,
    StrategyMode,
    GraduationDirection,
    create_graduation_logic,
)

logger = logging.getLogger(__name__)


@dataclass
class MLPrediction:
    """Prediction result from ML pipeline."""
    suggestion_type: SuggestionType
    should_trade: bool
    confidence: float
    ml_confidence: float
    combined_confidence: float
    model_version: Optional[str]
    features_used: Dict[str, float] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    safety_check_passed: bool = True
    graduation_status: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'suggestion_type': self.suggestion_type.value,
            'should_trade': self.should_trade,
            'confidence': self.confidence,
            'ml_confidence': self.ml_confidence,
            'combined_confidence': self.combined_confidence,
            'model_version': self.model_version,
            'features_used': self.features_used,
            'timestamp': self.timestamp.isoformat(),
            'safety_check_passed': self.safety_check_passed,
            'graduation_status': self.graduation_status,
        }


@dataclass
class PipelineMetrics:
    """Metrics for the ML pipeline."""
    total_predictions: int = 0
    correct_predictions: int = 0
    total_trades: int = 0
    profitable_trades: int = 0
    
    # By suggestion type
    by_suggestion_type: Dict[str, Dict[str, float]] = field(default_factory=dict)
    
    # Safety metrics
    circuit_breakers_triggered: int = 0
    trades_blocked_by_safety: int = 0
    
    # Graduation metrics
    strategies_in_live: int = 0
    strategies_in_shadow: int = 0
    
    @property
    def accuracy(self) -> float:
        """Calculate prediction accuracy."""
        return self.correct_predictions / self.total_predictions if self.total_predictions > 0 else 0.0
    
    @property
    def win_rate(self) -> float:
        """Calculate trade win rate."""
        return self.profitable_trades / self.total_trades if self.total_trades > 0 else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'total_predictions': self.total_predictions,
            'correct_predictions': self.correct_predictions,
            'accuracy': self.accuracy,
            'total_trades': self.total_trades,
            'profitable_trades': self.profitable_trades,
            'win_rate': self.win_rate,
            'by_suggestion_type': self.by_suggestion_type,
            'circuit_breakers_triggered': self.circuit_breakers_triggered,
            'trades_blocked_by_safety': self.trades_blocked_by_safety,
            'strategies_in_live': self.strategies_in_live,
            'strategies_in_shadow': self.strategies_in_shadow,
        }


class MLPipeline:
    """Unified ML Pipeline for Kalshi Trader.
    
    Integrates all ML components:
    - Feature engineering from price data
    - Model training and registry
    - Prediction with confidence scoring
    - Performance tracking
    - Safety controls (circuit breakers, position sizing)
    - Graduation logic (shadow <-> live trading)
    
    Parameters
    ----------
    db : MLDatabase | None
        Database instance (creates default if None)
    registry : ModelRegistry | None
        Model registry instance (creates default if None)
    feature_engineer : FeatureEngineer | None
        Feature engineer instance (creates default if None)
    confidence_scorer : ConfidenceScorer | None
        Confidence scorer instance (creates default if None)
    ab_testing : ABTesting | None
        A/B testing instance (creates default if None)
    safety_controls : SafetyControls | None
        Safety controls instance (creates default if None)
    graduation_logic : GraduationLogic | None
        Graduation logic instance (creates default if None)
    
    Attributes
    ----------
    ensemble : EnsembleTrainer
        Ensemble trainer for all suggestion types
    safety : SafetyControls
        Safety controls for circuit breakers and position sizing
    graduation : GraduationLogic
        Graduation logic for strategy promotion/demotion
    
    Example
    -------
    >>> from kalshi_trader.ml import MLPipeline, PriceHistory
    >>>
    >>> # Initialize pipeline
    >>> pipeline = MLPipeline()
    >>> pipeline.initialize(balance=1000.0)
    >>>
    >>> # Check safety status
    >>> status = pipeline.get_safety_status()
    >>> print(f"Can trade: {status['state']['is_trading_allowed']}")
    >>>
    >>> # Train models (if enough data)
    >>> if pipeline.has_sufficient_data():
    ...     pipeline.train_all_models()
    >>>
    >>> # Make prediction with safety check
    >>> prediction = pipeline.predict(price_history, SuggestionType.BREAKOUT)
    >>> if prediction.should_trade and prediction.safety_check_passed:
    ...     size = pipeline.calculate_position_size(prediction.combined_confidence)
    ...     print(f"Execute trade: ${size:.2f}")
    >>>
    >>> # Record outcome and check graduation
    >>> pipeline.record_trade_outcome(
    ...     trade_id="trade_001",
    ...     suggestion_type=SuggestionType.BREAKOUT,
    ...     price_history=price_history,
    ...     entry_price=0.45,
    ...     exit_price=0.52,
    ...     pnl=0.07,
    ... )
    """
    
    def __init__(
        self,
        db: Optional[MLDatabase] = None,
        registry: Optional[ModelRegistry] = None,
        feature_engineer: Optional[FeatureEngineer] = None,
        confidence_scorer: Optional[ConfidenceScorer] = None,
        ab_testing: Optional[ABTesting] = None,
        safety_controls: Optional[SafetyControls] = None,
        graduation_logic: Optional[GraduationLogic] = None,
    ):
        self.db = db or MLDatabase()
        self.registry = registry or ModelRegistry()
        self.feature_engineer = feature_engineer or FeatureEngineer()
        self.confidence_scorer = confidence_scorer or ConfidenceScorer(db=self.db)
        self.ab_testing = ab_testing or ABTesting(db=self.db)
        
        # Phase 4: Safety Controls and Graduation Logic
        self.safety = safety_controls or SafetyControls(db=self.db)
        self.graduation = graduation_logic or GraduationLogic(db=self.db)
        
        self.ensemble: Optional[EnsembleTrainer] = None
        self._initialized = False
        self._metrics = PipelineMetrics()
    
    def initialize(self, balance: float = 1000.0) -> None:
        """Initialize all components including safety and graduation.
        
        Parameters
        ----------
        balance : float
            Starting account balance for safety controls
        """
        self.db.initialize()
        self.registry.initialize()
        self.confidence_scorer.initialize()
        self.ab_testing.initialize()
        self.safety.initialize(balance=balance)
        self.graduation.initialize()
        
        # Try to load existing models from registry
        self._load_production_models()
        
        self._initialized = True
        logger.info("ML Pipeline initialized with Phase 4 safety controls and graduation logic")
    
    def _load_production_models(self) -> None:
        """Load production models from registry."""
        self.ensemble = EnsembleTrainer()
        
        for stype in SuggestionType:
            prod_model = self.registry.get_production_model_for_type(stype)
            if prod_model:
                try:
                    # Load the model
                    model_path = prod_model.model_path
                    trainer = ModelTrainer()
                    trainer.load(model_path)
                    
                    # Add to ensemble
                    from .model_training import EnsembleTrainer as ET
                    self.ensemble.trainers[stype] = trainer
                    self.ensemble.results[stype] = TrainingResult(
                        model_type=prod_model.model_type,
                        suggestion_type=stype,
                        training_timestamp=prod_model.training_timestamp,
                        config=TrainingConfig(),
                        n_samples=prod_model.n_samples,
                        n_features=prod_model.n_features,
                        class_distribution={},
                        cv_results=None,
                        test_accuracy=prod_model.test_accuracy,
                        test_precision=prod_model.test_precision,
                        test_recall=prod_model.test_recall,
                        test_f1=prod_model.test_f1,
                        test_auc=prod_model.test_auc,
                        test_log_loss=0.0,
                        feature_importance={},
                        model_path=prod_model.model_path,
                    )
                except Exception as e:
                    # Log error but continue
                    logger.warning(f"Failed to load model for {stype.value}: {e}")
    
    def has_sufficient_data(
        self,
        suggestion_type: Optional[SuggestionType] = None,
        min_samples: int = 200
    ) -> bool:
        """Check if there's sufficient data for training.
        
        Parameters
        ----------
        suggestion_type : SuggestionType | None
            Check for specific type, or all types if None
        min_samples : int
            Minimum samples required
            
        Returns
        -------
        bool
            True if sufficient data exists
        """
        if suggestion_type:
            count = self.db.get_training_data_count(suggestion_type.value)
            return count >= min_samples
        else:
            # Check all types
            for stype in SuggestionType:
                count = self.db.get_training_data_count(stype.value)
                if count < min_samples:
                    return False
            return True
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary of available training data.
        
        Returns
        -------
        dict
            Data summary by suggestion type
        """
        summary = {}
        for stype in SuggestionType:
            count = self.db.get_training_data_count(stype.value)
            summary[stype.value] = {
                'count': count,
                'sufficient': count >= 200,
            }
        return summary
    
    def train_model(
        self,
        suggestion_type: SuggestionType,
        config: Optional[TrainingConfig] = None,
        promote_to_prod: bool = False
    ) -> Optional[TrainingResult]:
        """Train a model for a specific suggestion type.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Type of suggestion to train for
        config : TrainingConfig | None
            Training configuration
        promote_to_prod : bool
            Whether to promote to production immediately
            
        Returns
        -------
        TrainingResult | None
            Training results or None if insufficient data
        """
        config = config or TrainingConfig()
        
        # Get training data
        X, y, feature_names = self.db.get_training_data(suggestion_type.value)
        
        if len(y) < 200:
            logger.warning(f"Insufficient data for {suggestion_type.value}: {len(y)} samples")
            return None
        
        # Convert to numpy arrays
        X = np.array(X)
        y = np.array(y)
        
        # Record training run start
        run_id = f"{suggestion_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.db.record_training_run(
            run_id=run_id,
            model_type=config.model_type.value,
            suggestion_type=suggestion_type.value,
            n_samples=len(y),
            n_features=X.shape[1],
        )
        
        try:
            # Train model
            trainer = ModelTrainer(config)
            result = trainer.train(X, y, feature_names, suggestion_type)
            
            # Save model temporarily
            temp_path = Path(self.registry.artifacts_path) / f"temp_{run_id}.pkl"
            trainer.save(str(temp_path))
            
            # Register model
            version = self.registry.register_model(
                model_name=f"{suggestion_type.value}_predictor",
                training_result=result,
                model_path=str(temp_path),
                description=f"Trained on {len(y)} samples",
            )
            
            # Update training run
            self.db.complete_training_run(
                run_id=run_id,
                cv_accuracy=result.cv_results.mean_accuracy if result.cv_results else None,
                cv_auc=result.cv_results.mean_auc if result.cv_results else None,
                test_accuracy=result.test_accuracy,
                test_auc=result.test_auc,
                status='completed'
            )
            
            # Promote to production if requested
            if promote_to_prod:
                self.registry.promote_to_production(
                    version.version_id,
                    reason="Auto-promoted after training"
                )
            
            # Reload production models
            self._load_production_models()
            
            return result
            
        except Exception as e:
            # Record failure
            self.db.complete_training_run(
                run_id=run_id,
                status='failed'
            )
            logger.error(f"Training failed for {suggestion_type.value}: {e}")
            raise e
    
    def train_all_models(
        self,
        config: Optional[TrainingConfig] = None,
        promote_to_prod: bool = False
    ) -> Dict[SuggestionType, Optional[TrainingResult]]:
        """Train models for all suggestion types.
        
        Parameters
        ----------
        config : TrainingConfig | None
            Training configuration
        promote_to_prod : bool
            Whether to promote to production
            
        Returns
        -------
        dict[SuggestionType, TrainingResult | None]
            Results for each suggestion type
        """
        results = {}
        
        for stype in SuggestionType:
            logger.info(f"Training model for {stype.value}...")
            result = self.train_model(stype, config, promote_to_prod)
            results[stype] = result
            
            if result:
                logger.info(f"  Accuracy: {result.test_accuracy:.3f}, AUC: {result.test_auc:.3f}")
            else:
                logger.info(f"  Skipped - insufficient data")
        
        return results
    
    def predict(
        self,
        price_history: PriceHistory,
        suggestion_type: SuggestionType,
        use_ml: bool = True,
        confidence_threshold: float = 0.6,
        check_safety: bool = True,
    ) -> MLPrediction:
        """Make prediction for a trade suggestion.
        
        Combines Bayesian confidence with ML prediction for
        a more robust confidence score. Includes safety checks
        and graduation status.
        
        Parameters
        ----------
        price_history : PriceHistory
            Historical price data
        suggestion_type : SuggestionType
            Type of suggestion
        use_ml : bool
            Whether to use ML model (if available)
        confidence_threshold : float
            Minimum confidence to recommend trading
        check_safety : bool
            Whether to check safety controls before allowing trade
            
        Returns
        -------
        MLPrediction
            Prediction result with confidence scores and safety status
        """
        # Get Bayesian confidence
        bayesian_confidence = self.confidence_scorer.get_confidence(suggestion_type)
        
        # Extract features
        features = self.feature_engineer.extract_features_for_suggestion_type(
            price_history,
            suggestion_type
        )
        
        # Get ML prediction if available
        ml_confidence = 0.5  # Neutral default
        model_version = None
        
        if use_ml and self.ensemble and suggestion_type in self.ensemble.trainers:
            try:
                X = features.to_array().reshape(1, -1)
                prediction, ml_confidence = self.ensemble.predict(X, suggestion_type)
                
                # Get model version from registry
                prod_model = self.registry.get_production_model_for_type(suggestion_type)
                if prod_model:
                    model_version = prod_model.version_id
                
                # Record prediction for tracking
                pred_id = f"pred_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
                self.db.record_model_prediction(
                    prediction_id=pred_id,
                    trade_id=pred_id,  # Will be updated when trade is executed
                    model_version=model_version or "unknown",
                    suggestion_type=suggestion_type.value,
                    predicted_outcome=ml_confidence,
                    features_used=features.features
                )
            except Exception as e:
                # Fall back to Bayesian if ML fails
                logger.warning(f"ML prediction failed: {e}")
                ml_confidence = 0.5
        
        # Combine confidences (weighted average)
        # Give more weight to ML as it has more data
        if ml_confidence != 0.5:
            combined_confidence = 0.4 * bayesian_confidence + 0.6 * ml_confidence
        else:
            combined_confidence = bayesian_confidence
        
        # Determine if should trade
        should_trade = combined_confidence >= confidence_threshold
        
        # Check safety controls
        safety_check_passed = True
        if check_safety and should_trade:
            can_trade, reason = self.safety.can_open_position()
            if not can_trade:
                safety_check_passed = False
                should_trade = False
                self._metrics.trades_blocked_by_safety += 1
                logger.warning(f"Trade blocked by safety: {reason}")
        
        # Get graduation status
        graduation_status = self.graduation.get_strategy_status(suggestion_type)
        
        # Check if strategy is in live mode
        if should_trade and not self.graduation.is_live(suggestion_type):
            should_trade = False
            logger.info(f"Trade blocked: strategy {suggestion_type.value} not in live mode")
        
        return MLPrediction(
            suggestion_type=suggestion_type,
            should_trade=should_trade,
            confidence=bayesian_confidence,
            ml_confidence=ml_confidence,
            combined_confidence=combined_confidence,
            model_version=model_version,
            features_used=features.features,
            safety_check_passed=safety_check_passed,
            graduation_status=graduation_status,
        )
    
    def calculate_position_size(
        self,
        confidence: float,
        suggestion_type: Optional[SuggestionType] = None,
    ) -> float:
        """Calculate position size using safety controls.
        
        Parameters
        ----------
        confidence : float
            Trade confidence
        suggestion_type : SuggestionType | None
            Strategy type (for win rate lookup)
            
        Returns
        -------
        float
            Position size in dollars
        """
        # Get win rate for Kelly calculation if available
        win_rate = None
        avg_win = None
        avg_loss = None
        
        if suggestion_type:
            status = self.graduation.get_strategy_status(suggestion_type)
            perf = status.get('performance', {})
            win_rate = perf.get('win_rate')
            avg_win = perf.get('avg_win_amount')
            avg_loss = perf.get('avg_loss_amount')
        
        return self.safety.calculate_position_size(
            confidence=confidence,
            win_rate=win_rate,
            avg_win=avg_win,
            avg_loss=avg_loss,
        )
    
    def record_trade_outcome(
        self,
        trade_id: str,
        suggestion_type: SuggestionType,
        price_history: PriceHistory,
        entry_price: float,
        exit_price: float,
        pnl: float,
        position_size: float = 0.0,
        group_assignment: Optional[str] = None,
        auto_graduate: bool = True,
    ) -> Dict[str, Any]:
        """Record trade outcome and update all systems.
        
        This updates:
        - Bayesian confidence scores
        - Safety controls (daily pnl, consecutive losses)
        - Graduation logic (promotion/demotion)
        - Training data
        - A/B testing
        
        Parameters
        ----------
        trade_id : str
            Trade identifier
        suggestion_type : SuggestionType
            Type of suggestion
        price_history : PriceHistory
            Price history at time of trade
        entry_price : float
            Entry price
        exit_price : float
            Exit price
        pnl : float
            Profit/loss
        position_size : float
            Size of position
        group_assignment : str | None
            A/B group assignment
        auto_graduate : bool
            Whether to automatically evaluate graduation
            
        Returns
        -------
        dict
            Summary of updates
        """
        outcome = pnl > 0
        
        # Update Bayesian confidence
        self.confidence_scorer.update_after_trade(suggestion_type, outcome, pnl)
        
        # Update safety controls
        safety_record = self.safety.record_trade(
            trade_id=trade_id,
            pnl=pnl,
            position_size=position_size,
            suggestion_type=suggestion_type.value,
        )
        
        # Check if circuit breaker was triggered
        if self.safety.state.status == SafetyStatus.CIRCUIT_BREAKER:
            self._metrics.circuit_breakers_triggered += 1
        
        # Record for graduation logic
        grad_record = self.graduation.record_trade(suggestion_type, pnl, trade_id)
        
        # Auto-evaluate graduation
        graduation_event = None
        if auto_graduate:
            graduation_event = self.graduation.auto_graduate(suggestion_type)
            if graduation_event:
                logger.info(f"Graduation event: {graduation_event.direction.value} for {suggestion_type.value}")
        
        # Extract and save features for future training
        features = self.feature_engineer.extract_features_for_suggestion_type(
            price_history,
            suggestion_type
        )
        
        self.db.save_training_sample(
            trade_id=trade_id,
            suggestion_type=suggestion_type.value,
            features=features.to_array().tolist(),
            feature_names=features.feature_names,
            outcome=outcome,
            pnl=pnl,
            confidence=self.confidence_scorer.get_confidence(suggestion_type)
        )
        
        # Record in A/B testing if group assigned
        if group_assignment:
            self.ab_testing.record_trade_outcome(
                trade_id=trade_id,
                user_id="system",
                group_assignment=group_assignment,
                suggestion_type=suggestion_type.value,
                confidence=self.confidence_scorer.get_confidence(suggestion_type),
                entry_price=entry_price
            )
            self.ab_testing.complete_trade(trade_id, exit_price, pnl)
        
        return {
            'trade_id': trade_id,
            'bayesian_updated': True,
            'safety_record': safety_record,
            'graduation_record': grad_record,
            'graduation_event': graduation_event.to_dict() if graduation_event else None,
            'auto_graduate': auto_graduate,
        }
    
    def record_position_opened(self, position_size: float) -> None:
        """Record that a position was opened.
        
        Parameters
        ----------
        position_size : float
            Size of opened position
        """
        self.safety.record_position_opened(position_size)
    
    def get_safety_status(self) -> Dict[str, Any]:
        """Get current safety status.
        
        Returns
        -------
        dict
            Safety status summary
        """
        return self.safety.get_status()
    
    def get_graduation_status(self, suggestion_type: Optional[SuggestionType] = None) -> Dict[str, Any]:
        """Get graduation status for strategies.
        
        Parameters
        ----------
        suggestion_type : SuggestionType | None
            Specific strategy to check, or all if None
            
        Returns
        -------
        dict
            Graduation status
        """
        if suggestion_type:
            return self.graduation.get_strategy_status(suggestion_type)
        else:
            return {
                'strategies': self.graduation.get_all_strategy_statuses(),
            }
    
    def get_metrics(self) -> PipelineMetrics:
        """Get pipeline performance metrics.
        
        Returns
        -------
        PipelineMetrics
            Pipeline metrics
        """
        # Get trade outcomes
        outcomes = self.db.get_trade_outcomes(limit=1000)
        completed = [o for o in outcomes if o.outcome is not None]
        
        self._metrics.total_trades = len(completed)
        self._metrics.profitable_trades = sum(1 for o in completed if o.outcome)
        
        # Get metrics by suggestion type
        type_metrics = self.db.get_suggestion_type_metrics()
        self._metrics.by_suggestion_type = type_metrics
        
        # Update graduation metrics
        live_count = 0
        shadow_count = 0
        for stype in SuggestionType:
            if self.graduation.is_live(stype):
                live_count += 1
            else:
                shadow_count += 1
        self._metrics.strategies_in_live = live_count
        self._metrics.strategies_in_shadow = shadow_count
        
        return self._metrics
    
    def get_status(self) -> Dict[str, Any]:
        """Get pipeline status summary.
        
        Returns
        -------
        dict
            Pipeline status
        """
        data_summary = self.get_data_summary()
        
        # Get production models
        prod_models = {}
        for stype in SuggestionType:
            model = self.registry.get_production_model_for_type(stype)
            if model:
                prod_models[stype.value] = {
                    'version': model.version_id,
                    'accuracy': model.test_accuracy,
                    'auc': model.test_auc,
                }
        
        # Get recent training runs
        recent_runs = self.db.get_training_runs(limit=5)
        
        # Get safety status
        safety_status = self.get_safety_status()
        
        # Get graduation status
        graduation_status = self.get_graduation_status()
        
        return {
            'initialized': self._initialized,
            'data_summary': data_summary,
            'production_models': prod_models,
            'recent_training_runs': recent_runs,
            'has_sufficient_data': self.has_sufficient_data(),
            'safety': safety_status,
            'graduation': graduation_status,
        }
    
    def retrain_if_needed(
        self,
        min_accuracy: float = 0.55,
        min_samples: int = 200
    ) -> Optional[Dict[SuggestionType, TrainingResult]]:
        """Retrain models if performance drops below threshold.
        
        Parameters
        ----------
        min_accuracy : float
            Minimum accuracy before retraining
        min_samples : int
            Minimum samples required for retraining
            
        Returns
        -------
        dict | None
            Retraining results or None if not needed
        """
        if not self.has_sufficient_data(min_samples=min_samples):
            return None
        
        needs_retrain = []
        
        for stype in SuggestionType:
            prod_model = self.registry.get_production_model_for_type(stype)
            if prod_model and prod_model.test_accuracy < min_accuracy:
                needs_retrain.append(stype)
        
        if not needs_retrain:
            return None
        
        results = {}
        for stype in needs_retrain:
            logger.info(f"Retraining {stype.value} model (accuracy below threshold)")
            result = self.train_model(stype, promote_to_prod=True)
            results[stype] = result
        
        return results
    
    def promote_to_live(self, suggestion_type: SuggestionType, reason: Optional[str] = None) -> Optional[Any]:
        """Manually promote a strategy to live trading.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to promote
        reason : str | None
            Reason for promotion
            
        Returns
        -------
        GraduationEvent | None
            Event record if promotion occurred
        """
        return self.graduation.promote_to_live(suggestion_type, reason)
    
    def demote_to_shadow(self, suggestion_type: SuggestionType, reason: Optional[str] = None) -> Optional[Any]:
        """Manually demote a strategy to shadow trading.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to demote
        reason : str | None
            Reason for demotion
            
        Returns
        -------
        GraduationEvent | None
            Event record if demotion occurred
        """
        return self.graduation.demote_to_shadow(suggestion_type, reason)
    
    def reset_circuit_breaker(self) -> None:
        """Manually reset circuit breaker."""
        self.safety._reset_circuit_breaker()
    
    def reset_daily_stats(self) -> None:
        """Reset daily statistics (call at market open)."""
        self.safety.reset_daily_stats()


def create_pipeline(
    db_path: Optional[str] = None,
    registry_path: Optional[str] = None,
    balance: float = 1000.0,
    **safety_config
) -> MLPipeline:
    """Create and initialize ML pipeline.
    
    Convenience function for creating a fully configured
    ML pipeline with safety controls and graduation logic.
    
    Parameters
    ----------
    db_path : str | None
        Path to database
    registry_path : str | None
        Path to model registry
    balance : float
        Starting account balance
    **safety_config
        Safety configuration parameters
        
    Returns
    -------
    MLPipeline
        Initialized pipeline
    """
    db = MLDatabase(db_path) if db_path else MLDatabase()
    registry = ModelRegistry(registry_path) if registry_path else ModelRegistry()
    
    # Create safety controls with config
    safety_config_obj = SafetyConfig(**safety_config) if safety_config else SafetyConfig()
    safety = SafetyControls(db=db, config=safety_config_obj)
    
    # Create graduation logic
    graduation = GraduationLogic(db=db)
    
    pipeline = MLPipeline(
        db=db,
        registry=registry,
        safety_controls=safety,
        graduation_logic=graduation,
    )
    pipeline.initialize(balance=balance)
    
    return pipeline
