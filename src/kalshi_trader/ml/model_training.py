"""Model Training Pipeline for Kalshi Trader ML.

Implements XGBoost and LightGBM training with cross-validation,
hyperparameter tuning, and model evaluation.
"""

from __future__ import annotations

import json
import pickle
import numpy as np
import pandas as pd
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any, Callable
from datetime import datetime
from pathlib import Path
from enum import Enum
import warnings

from .confidence_scorer import SuggestionType
from .feature_engineering import FeatureSet, FeatureEngineer

# Optional imports - will be checked at runtime
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    warnings.warn("XGBoost not available. Install with: pip install xgboost")

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    warnings.warn("LightGBM not available. Install with: pip install lightgbm")

try:
    from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, log_loss
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    warnings.warn("scikit-learn not available. Install with: pip install scikit-learn")


class ModelType(str, Enum):
    """Supported model types."""
    XGBOOST = "xgboost"
    LIGHTGBM = "lightgbm"
    ENSEMBLE = "ensemble"


@dataclass
class TrainingConfig:
    """Configuration for model training."""
    model_type: ModelType = ModelType.XGBOOST
    test_size: float = 0.2
    n_splits: int = 5  # Cross-validation folds
    random_state: int = 42
    
    # XGBoost parameters
    xgb_params: Dict[str, Any] = field(default_factory=lambda: {
        'objective': 'binary:logistic',
        'eval_metric': ['logloss', 'auc'],
        'max_depth': 6,
        'learning_rate': 0.1,
        'n_estimators': 100,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'min_child_weight': 1,
        'gamma': 0,
        'reg_alpha': 0.1,
        'reg_lambda': 1.0,
        'random_state': 42,
    })
    
    # LightGBM parameters
    lgb_params: Dict[str, Any] = field(default_factory=lambda: {
        'objective': 'binary',
        'metric': ['binary_logloss', 'auc'],
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'random_state': 42,
    })
    
    # Early stopping
    early_stopping_rounds: int = 20
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'model_type': self.model_type.value,
            'test_size': self.test_size,
            'n_splits': self.n_splits,
            'random_state': self.random_state,
            'xgb_params': self.xgb_params,
            'lgb_params': self.lgb_params,
            'early_stopping_rounds': self.early_stopping_rounds,
        }


@dataclass
class CrossValidationResult:
    """Results from cross-validation."""
    fold_scores: List[Dict[str, float]] = field(default_factory=list)
    mean_accuracy: float = 0.0
    std_accuracy: float = 0.0
    mean_auc: float = 0.0
    std_auc: float = 0.0
    mean_f1: float = 0.0
    std_f1: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'fold_scores': self.fold_scores,
            'mean_accuracy': self.mean_accuracy,
            'std_accuracy': self.std_accuracy,
            'mean_auc': self.mean_auc,
            'std_auc': self.std_auc,
            'mean_f1': self.mean_f1,
            'std_f1': self.std_f1,
        }


@dataclass
class TrainingResult:
    """Results from model training."""
    model_type: ModelType
    suggestion_type: Optional[SuggestionType]
    training_timestamp: datetime
    config: TrainingConfig
    
    # Dataset info
    n_samples: int = 0
    n_features: int = 0
    class_distribution: Dict[str, int] = field(default_factory=dict)
    
    # Cross-validation results
    cv_results: Optional[CrossValidationResult] = None
    
    # Test set performance
    test_accuracy: float = 0.0
    test_precision: float = 0.0
    test_recall: float = 0.0
    test_f1: float = 0.0
    test_auc: float = 0.0
    test_log_loss: float = 0.0
    
    # Feature importance
    feature_importance: Dict[str, float] = field(default_factory=dict)
    
    # Model path
    model_path: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'model_type': self.model_type.value,
            'suggestion_type': self.suggestion_type.value if self.suggestion_type else None,
            'training_timestamp': self.training_timestamp.isoformat(),
            'config': self.config.to_dict(),
            'n_samples': self.n_samples,
            'n_features': self.n_features,
            'class_distribution': self.class_distribution,
            'cv_results': self.cv_results.to_dict() if self.cv_results else None,
            'test_accuracy': self.test_accuracy,
            'test_precision': self.test_precision,
            'test_recall': self.test_recall,
            'test_f1': self.test_f1,
            'test_auc': self.test_auc,
            'test_log_loss': self.test_log_loss,
            'feature_importance': self.feature_importance,
            'model_path': self.model_path,
        }
    
    def to_json(self, filepath: str) -> None:
        """Save results to JSON file."""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    def summary(self) -> str:
        """Generate human-readable summary."""
        lines = [
            f"Training Results for {self.model_type.value}",
            f"Suggestion Type: {self.suggestion_type.value if self.suggestion_type else 'All'}",
            f"Training Time: {self.training_timestamp}",
            f"",
            f"Dataset: {self.n_samples} samples, {self.n_features} features",
            f"Class Distribution: {self.class_distribution}",
            f"",
            f"Cross-Validation:",
        ]
        
        if self.cv_results:
            lines.extend([
                f"  Accuracy: {self.cv_results.mean_accuracy:.3f} (+/- {self.cv_results.std_accuracy:.3f})",
                f"  AUC: {self.cv_results.mean_auc:.3f} (+/- {self.cv_results.std_auc:.3f})",
                f"  F1: {self.cv_results.mean_f1:.3f} (+/- {self.cv_results.std_f1:.3f})",
            ])
        
        lines.extend([
            f"",
            f"Test Set Performance:",
            f"  Accuracy: {self.test_accuracy:.3f}",
            f"  Precision: {self.test_precision:.3f}",
            f"  Recall: {self.test_recall:.3f}",
            f"  F1: {self.test_f1:.3f}",
            f"  AUC: {self.test_auc:.3f}",
            f"  Log Loss: {self.test_log_loss:.3f}",
        ])
        
        if self.feature_importance:
            lines.extend([
                f"",
                f"Top 5 Features:",
            ])
            sorted_features = sorted(
                self.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            for name, importance in sorted_features:
                lines.append(f"  {name}: {importance:.4f}")
        
        return "\n".join(lines)


class ModelTrainer:
    """Model training pipeline for Kalshi Trader.
    
    Trains XGBoost or LightGBM models with cross-validation
    and comprehensive evaluation metrics.
    
    Parameters
    ----------
    config : TrainingConfig
        Training configuration
    feature_engineer : FeatureEngineer
        Feature engineering instance
    
    Attributes
    ----------
    model : Any
        Trained model instance
    scaler : StandardScaler
        Feature scaler (if used)
    
    Example
    -------
    >>> from kalshi_trader.ml import ModelTrainer, TrainingConfig
    >>> from kalshi_trader.ml import FeatureEngineer, PriceHistory
    >>>
    >>> # Prepare data
    >>> X = np.random.randn(500, 25)  # 500 samples, 25 features
    >>> y = np.random.randint(0, 2, 500)  # Binary outcomes
    >>>
    >>> # Train model
    >>> config = TrainingConfig(model_type=ModelType.XGBOOST)
    >>> trainer = ModelTrainer(config)
    >>> result = trainer.train(X, y, feature_names=['f1', 'f2', ...])
    >>>
    >>> print(result.summary())
    Training Results for xgboost
    ...
    >>>
    >>> # Make predictions
    >>> predictions = trainer.predict(X_test)
    """
    
    def __init__(
        self,
        config: Optional[TrainingConfig] = None,
        feature_engineer: Optional[FeatureEngineer] = None
    ):
        self.config = config or TrainingConfig()
        self.feature_engineer = feature_engineer or FeatureEngineer()
        
        self.model: Optional[Any] = None
        self.scaler: Optional[Any] = None
        self.feature_names: List[str] = []
        self.training_result: Optional[TrainingResult] = None
        
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn is required for model training")
    
    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: Optional[List[str]] = None,
        suggestion_type: Optional[SuggestionType] = None,
        validation_data: Optional[Tuple[np.ndarray, np.ndarray]] = None
    ) -> TrainingResult:
        """Train model with cross-validation.
        
        Parameters
        ----------
        X : np.ndarray
            Feature matrix (n_samples, n_features)
        y : np.ndarray
            Target labels (n_samples,)
        feature_names : list[str] | None
            Names of features
        suggestion_type : SuggestionType | None
            Type of suggestion this model is for
        validation_data : tuple | None
            Optional (X_val, y_val) for early stopping
            
        Returns
        -------
        TrainingResult
            Training results with metrics and model info
        """
        self.feature_names = feature_names or [f"feature_{i}" for i in range(X.shape[1])]
        
        # Record class distribution
        unique, counts = np.unique(y, return_counts=True)
        class_distribution = {str(int(k)): int(v) for k, v in zip(unique, counts)}
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.config.test_size,
            random_state=self.config.random_state,
            stratify=y
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Cross-validation
        cv_results = self._cross_validate(X_train_scaled, y_train)
        
        # Train final model on full training set
        self.model = self._train_final_model(
            X_train_scaled, y_train,
            validation_data=validation_data
        )
        
        # Evaluate on test set
        test_metrics = self._evaluate_test_set(X_test_scaled, y_test)
        
        # Get feature importance
        feature_importance = self._get_feature_importance()
        
        # Create result
        result = TrainingResult(
            model_type=self.config.model_type,
            suggestion_type=suggestion_type,
            training_timestamp=datetime.now(),
            config=self.config,
            n_samples=len(y),
            n_features=X.shape[1],
            class_distribution=class_distribution,
            cv_results=cv_results,
            **test_metrics,
            feature_importance=feature_importance,
        )
        
        self.training_result = result
        return result
    
    def _cross_validate(
        self,
        X: np.ndarray,
        y: np.ndarray
    ) -> CrossValidationResult:
        """Perform cross-validation."""
        cv = StratifiedKFold(
            n_splits=self.config.n_splits,
            shuffle=True,
            random_state=self.config.random_state
        )
        
        fold_scores = []
        
        for fold, (train_idx, val_idx) in enumerate(cv.split(X, y)):
            X_train_fold, X_val_fold = X[train_idx], X[val_idx]
            y_train_fold, y_val_fold = y[train_idx], y[val_idx]
            
            # Train fold model
            model = self._create_model()
            
            if self.config.model_type == ModelType.XGBOOST and XGBOOST_AVAILABLE:
                model.fit(
                    X_train_fold, y_train_fold,
                    eval_set=[(X_val_fold, y_val_fold)],
                    verbose=False
                )
            elif self.config.model_type == ModelType.LIGHTGBM and LIGHTGBM_AVAILABLE:
                model.fit(
                    X_train_fold, y_train_fold,
                    eval_set=[(X_val_fold, y_val_fold)],
                    callbacks=[lgb.early_stopping(self.config.early_stopping_rounds, verbose=False)]
                )
            else:
                model.fit(X_train_fold, y_train_fold)
            
            # Evaluate
            y_pred = model.predict(X_val_fold)
            y_prob = model.predict_proba(X_val_fold)[:, 1] if hasattr(model, 'predict_proba') else y_pred
            
            scores = {
                'fold': fold + 1,
                'accuracy': accuracy_score(y_val_fold, y_pred),
                'precision': precision_score(y_val_fold, y_pred, zero_division=0),
                'recall': recall_score(y_val_fold, y_pred, zero_division=0),
                'f1': f1_score(y_val_fold, y_pred, zero_division=0),
                'auc': roc_auc_score(y_val_fold, y_prob) if len(np.unique(y_val_fold)) > 1 else 0.5,
            }
            fold_scores.append(scores)
        
        # Calculate mean and std
        return CrossValidationResult(
            fold_scores=fold_scores,
            mean_accuracy=np.mean([s['accuracy'] for s in fold_scores]),
            std_accuracy=np.std([s['accuracy'] for s in fold_scores]),
            mean_auc=np.mean([s['auc'] for s in fold_scores]),
            std_auc=np.std([s['auc'] for s in fold_scores]),
            mean_f1=np.mean([s['f1'] for s in fold_scores]),
            std_f1=np.std([s['f1'] for s in fold_scores]),
        )
    
    def _train_final_model(
        self,
        X: np.ndarray,
        y: np.ndarray,
        validation_data: Optional[Tuple[np.ndarray, np.ndarray]] = None
    ) -> Any:
        """Train final model on full training data."""
        model = self._create_model()
        
        if validation_data is not None:
            X_val, y_val = validation_data
            X_val_scaled = self.scaler.transform(X_val)
            
            if self.config.model_type == ModelType.XGBOOST and XGBOOST_AVAILABLE:
                model.fit(
                    X, y,
                    eval_set=[(X_val_scaled, y_val)],
                    verbose=False
                )
            elif self.config.model_type == ModelType.LIGHTGBM and LIGHTGBM_AVAILABLE:
                model.fit(
                    X, y,
                    eval_set=[(X_val_scaled, y_val)],
                    callbacks=[lgb.early_stopping(self.config.early_stopping_rounds, verbose=False)]
                )
            else:
                model.fit(X, y)
        else:
            model.fit(X, y)
        
        return model
    
    def _create_model(self) -> Any:
        """Create model instance based on config."""
        if self.config.model_type == ModelType.XGBOOST:
            if not XGBOOST_AVAILABLE:
                raise ImportError("XGBoost not available")
            return xgb.XGBClassifier(**self.config.xgb_params)
        
        elif self.config.model_type == ModelType.LIGHTGBM:
            if not LIGHTGBM_AVAILABLE:
                raise ImportError("LightGBM not available")
            return lgb.LGBMClassifier(**self.config.lgb_params)
        
        else:
            raise ValueError(f"Unsupported model type: {self.config.model_type}")
    
    def _evaluate_test_set(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """Evaluate model on test set."""
        y_pred = self.model.predict(X_test)
        y_prob = self.model.predict_proba(X_test)[:, 1] if hasattr(self.model, 'predict_proba') else y_pred
        
        return {
            'test_accuracy': accuracy_score(y_test, y_pred),
            'test_precision': precision_score(y_test, y_pred, zero_division=0),
            'test_recall': recall_score(y_test, y_pred, zero_division=0),
            'test_f1': f1_score(y_test, y_pred, zero_division=0),
            'test_auc': roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.5,
            'test_log_loss': log_loss(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.0,
        }
    
    def _get_feature_importance(self) -> Dict[str, float]:
        """Extract feature importance from model."""
        if self.model is None:
            return {}
        
        importance = {}
        
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            importance = {
                name: float(imp)
                for name, imp in zip(self.feature_names, importances)
            }
        
        return importance
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions on new data.
        
        Parameters
        ----------
        X : np.ndarray
            Feature matrix
            
        Returns
        -------
        np.ndarray
            Predicted labels
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Get prediction probabilities.
        
        Parameters
        ----------
        X : np.ndarray
            Feature matrix
            
        Returns
        -------
        np.ndarray
            Predicted probabilities for class 1
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        X_scaled = self.scaler.transform(X)
        
        if hasattr(self.model, 'predict_proba'):
            return self.model.predict_proba(X_scaled)[:, 1]
        else:
            return self.model.predict(X_scaled)
    
    def save(self, filepath: str) -> None:
        """Save trained model to file.
        
        Parameters
        ----------
        filepath : str
            Path to save model
        """
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")
        
        data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'config': self.config.to_dict(),
            'training_result': self.training_result.to_dict() if self.training_result else None,
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
    
    def load(self, filepath: str) -> None:
        """Load trained model from file.
        
        Parameters
        ----------
        filepath : str
            Path to saved model
        """
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        self.model = data['model']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.config = TrainingConfig(**data['config'])
        
        if data.get('training_result'):
            # Reconstruct training result
            result_dict = data['training_result']
            self.training_result = TrainingResult(
                model_type=ModelType(result_dict['model_type']),
                suggestion_type=SuggestionType(result_dict['suggestion_type']) if result_dict['suggestion_type'] else None,
                training_timestamp=datetime.fromisoformat(result_dict['training_timestamp']),
                config=self.config,
                **{k: v for k, v in result_dict.items() if k not in ['model_type', 'suggestion_type', 'training_timestamp', 'config']}
            )
    
    def get_confidence_score(self, X: np.ndarray) -> float:
        """Get confidence score for prediction.
        
        Returns the probability of class 1 (success).
        
        Parameters
        ----------
        X : np.ndarray
            Feature matrix (single sample or batch)
            
        Returns
        -------
        float
            Confidence score (0-1)
        """
        if X.ndim == 1:
            X = X.reshape(1, -1)
        
        probs = self.predict_proba(X)
        return float(np.mean(probs))


class EnsembleTrainer:
    """Ensemble trainer combining multiple models.
    
    Trains separate models for each suggestion type and
    provides ensemble predictions.
    
    Parameters
    ----------
    base_config : TrainingConfig
        Base configuration for all models
    
    Example
    -------
    >>> from kalshi_trader.ml import EnsembleTrainer, TrainingConfig
    >>>
    >>> trainer = EnsembleTrainer(TrainingConfig())
    >>>
    >>> # Train all models
    >>> results = trainer.train_all_models(trade_data)
    >>>
    >>> # Get prediction for specific suggestion type
    >>> confidence = trainer.predict(history, SuggestionType.BREAKOUT)
    """
    
    def __init__(self, base_config: Optional[TrainingConfig] = None):
        self.base_config = base_config or TrainingConfig()
        self.trainers: Dict[SuggestionType, ModelTrainer] = {}
        self.results: Dict[SuggestionType, TrainingResult] = {}
    
    def train_for_suggestion_type(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: List[str],
        suggestion_type: SuggestionType
    ) -> TrainingResult:
        """Train model for a specific suggestion type.
        
        Parameters
        ----------
        X : np.ndarray
            Feature matrix
        y : np.ndarray
            Target labels
        feature_names : list[str]
            Feature names
        suggestion_type : SuggestionType
            Type of suggestion
            
        Returns
        -------
        TrainingResult
            Training results
        """
        trainer = ModelTrainer(config=self.base_config)
        result = trainer.train(X, y, feature_names, suggestion_type)
        
        self.trainers[suggestion_type] = trainer
        self.results[suggestion_type] = result
        
        return result
    
    def predict(
        self,
        X: np.ndarray,
        suggestion_type: SuggestionType
    ) -> Tuple[int, float]:
        """Get prediction and confidence for a suggestion type.
        
        Parameters
        ----------
        X : np.ndarray
            Feature matrix
        suggestion_type : SuggestionType
            Type of suggestion
            
        Returns
        -------
        tuple[int, float]
            (prediction, confidence)
        """
        if suggestion_type not in self.trainers:
            raise ValueError(f"No model trained for {suggestion_type}")
        
        trainer = self.trainers[suggestion_type]
        prediction = trainer.predict(X)[0]
        confidence = trainer.get_confidence_score(X)
        
        return int(prediction), confidence
    
    def get_all_results(self) -> Dict[SuggestionType, TrainingResult]:
        """Get all training results."""
        return self.results
    
    def save_all(self, directory: str) -> Dict[SuggestionType, str]:
        """Save all trained models.
        
        Parameters
        ----------
        directory : str
            Directory to save models
            
        Returns
        -------
        dict[SuggestionType, str]
            Mapping of suggestion type to model path
        """
        import os
        os.makedirs(directory, exist_ok=True)
        
        paths = {}
        for stype, trainer in self.trainers.items():
            filename = f"model_{stype.value}.pkl"
            filepath = os.path.join(directory, filename)
            trainer.save(filepath)
            paths[stype] = filepath
        
        return paths
    
    def load_all(self, directory: str) -> None:
        """Load all trained models.
        
        Parameters
        ----------
        directory : str
            Directory containing saved models
        """
        import os
        
        for stype in SuggestionType:
            filename = f"model_{stype.value}.pkl"
            filepath = os.path.join(directory, filename)
            
            if os.path.exists(filepath):
                trainer = ModelTrainer()
                trainer.load(filepath)
                self.trainers[stype] = trainer
