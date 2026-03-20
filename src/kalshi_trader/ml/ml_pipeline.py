"""ML Pipeline Integration for Kalshi Trader.

Integrates Phase 2 (Confidence Scoring, A/B Testing) with Phase 3
(Feature Engineering, Model Training, Model Registry).

Provides a unified interface for:
- Extracting features from trade data
- Training and registering models
- Making predictions with confidence scores
- Tracking model performance
"""

from __future__ import annotations

import json
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
        }


class MLPipeline:
    """Unified ML Pipeline for Kalshi Trader.
    
    Integrates all ML components:
    - Feature engineering from price data
    - Model training and registry
    - Prediction with confidence scoring
    - Performance tracking
    
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
    
    Attributes
    ----------
    ensemble : EnsembleTrainer
        Ensemble trainer for all suggestion types
    
    Example
    -------
    >>> from kalshi_trader.ml import MLPipeline, PriceHistory
    >>>
    >>> # Initialize pipeline
    >>> pipeline = MLPipeline()
    >>> pipeline.initialize()
    >>>
    >>> # Train models (if enough data)
    >>> if pipeline.has_sufficient_data():
    ...     pipeline.train_all_models()
    >>>
    >>> # Make prediction
    >>> prediction = pipeline.predict(price_history, SuggestionType.BREAKOUT)
    >>> print(f"Should trade: {prediction.should_trade}")
    >>> print(f"Confidence: {prediction.combined_confidence:.2%}")
    """
    
    def __init__(
        self,
        db: Optional[MLDatabase] = None,
        registry: Optional[ModelRegistry] = None,
        feature_engineer: Optional[FeatureEngineer] = None,
        confidence_scorer: Optional[ConfidenceScorer] = None,
        ab_testing: Optional[ABTesting] = None,
    ):
        self.db = db or MLDatabase()
        self.registry = registry or ModelRegistry()
        self.feature_engineer = feature_engineer or FeatureEngineer()
        self.confidence_scorer = confidence_scorer or ConfidenceScorer(db=self.db)
        self.ab_testing = ab_testing or ABTesting(db=self.db)
        
        self.ensemble: Optional[EnsembleTrainer] = None
        self._initialized = False
    
    def initialize(self) -> None:
        """Initialize all components."""
        self.db.initialize()
        self.registry.initialize()
        self.confidence_scorer.initialize()
        self.ab_testing.initialize()
        
        # Try to load existing models from registry
        self._load_production_models()
        
        self._initialized = True
    
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
                    print(f"Failed to load model for {stype.value}: {e}")
    
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
            print(f"Insufficient data for {suggestion_type.value}: {len(y)} samples")
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
            print(f"Training model for {stype.value}...")
            result = self.train_model(stype, config, promote_to_prod)
            results[stype] = result
            
            if result:
                print(f"  Accuracy: {result.test_accuracy:.3f}, AUC: {result.test_auc:.3f}")
            else:
                print(f"  Skipped - insufficient data")
        
        return results
    
    def predict(
        self,
        price_history: PriceHistory,
        suggestion_type: SuggestionType,
        use_ml: bool = True,
        confidence_threshold: float = 0.6
    ) -> MLPrediction:
        """Make prediction for a trade suggestion.
        
        Combines Bayesian confidence with ML prediction for
        a more robust confidence score.
        
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
            
        Returns
        -------
        MLPrediction
            Prediction result with confidence scores
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
                print(f"ML prediction failed: {e}")
                ml_confidence = 0.5
        
        # Combine confidences (weighted average)
        # Give more weight to ML as it has more data
        if ml_confidence != 0.5:
            combined_confidence = 0.4 * bayesian_confidence + 0.6 * ml_confidence
        else:
            combined_confidence = bayesian_confidence
        
        # Determine if should trade
        should_trade = combined_confidence >= confidence_threshold
        
        return MLPrediction(
            suggestion_type=suggestion_type,
            should_trade=should_trade,
            confidence=bayesian_confidence,
            ml_confidence=ml_confidence,
            combined_confidence=combined_confidence,
            model_version=model_version,
            features_used=features.features,
        )
    
    def record_trade_outcome(
        self,
        trade_id: str,
        suggestion_type: SuggestionType,
        price_history: PriceHistory,
        entry_price: float,
        exit_price: float,
        pnl: float,
        group_assignment: Optional[str] = None,
    ) -> None:
        """Record trade outcome and update all systems.
        
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
        group_assignment : str | None
            A/B group assignment
        """
        outcome = pnl > 0
        
        # Update Bayesian confidence
        self.confidence_scorer.update_after_trade(suggestion_type, outcome, pnl)
        
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
                user_id="system",  # Could be parameterized
                group_assignment=group_assignment,
                suggestion_type=suggestion_type.value,
                confidence=self.confidence_scorer.get_confidence(suggestion_type),
                entry_price=entry_price
            )
            self.ab_testing.complete_trade(trade_id, exit_price, pnl)
        
        # Update any pending predictions
        # (In practice, would link prediction_id to trade_id)
    
    def get_metrics(self) -> PipelineMetrics:
        """Get pipeline performance metrics.
        
        Returns
        -------
        PipelineMetrics
            Pipeline metrics
        """
        metrics = PipelineMetrics()
        
        # Get prediction accuracy from database
        # (Would need to track prediction outcomes)
        
        # Get trade outcomes
        outcomes = self.db.get_trade_outcomes(limit=1000)
        completed = [o for o in outcomes if o.outcome is not None]
        
        metrics.total_trades = len(completed)
        metrics.profitable_trades = sum(1 for o in completed if o.outcome)
        
        # Get metrics by suggestion type
        type_metrics = self.db.get_suggestion_type_metrics()
        metrics.by_suggestion_type = type_metrics
        
        return metrics
    
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
        
        return {
            'initialized': self._initialized,
            'data_summary': data_summary,
            'production_models': prod_models,
            'recent_training_runs': recent_runs,
            'has_sufficient_data': self.has_sufficient_data(),
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
            print(f"Retraining {stype.value} model (accuracy below threshold)")
            result = self.train_model(stype, promote_to_prod=True)
            results[stype] = result
        
        return results


def create_pipeline(
    db_path: Optional[str] = None,
    registry_path: Optional[str] = None,
) -> MLPipeline:
    """Create and initialize ML pipeline.
    
    Convenience function for creating a fully configured
    ML pipeline.
    
    Parameters
    ----------
    db_path : str | None
        Path to database
    registry_path : str | None
        Path to model registry
        
    Returns
    -------
    MLPipeline
        Initialized pipeline
    """
    db = MLDatabase(db_path) if db_path else MLDatabase()
    registry = ModelRegistry(registry_path) if registry_path else ModelRegistry()
    
    pipeline = MLPipeline(
        db=db,
        registry=registry,
    )
    pipeline.initialize()
    
    return pipeline
