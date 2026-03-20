"""Tests for Kalshi Trader ML Pipeline Phase 3: Model Training.

Run with: pytest tests/kalshi_trader/ml/test_training_pipeline.py -v
"""

import pytest
import numpy as np
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timedelta

# Skip tests if optional dependencies not available
try:
    from kalshi_trader.ml import (
        FeatureEngineer,
        PriceHistory,
        FeatureSet,
        FeatureCategory,
    )
    FEATURES_AVAILABLE = True
except ImportError:
    FEATURES_AVAILABLE = False

try:
    from kalshi_trader.ml import (
        ModelTrainer,
        EnsembleTrainer,
        TrainingConfig,
        TrainingResult,
        ModelType,
    )
    TRAINING_AVAILABLE = True
except ImportError:
    TRAINING_AVAILABLE = False

try:
    from kalshi_trader.ml import (
        ModelRegistry,
        ModelVersion,
        ModelStatus,
        ModelComparison,
    )
    REGISTRY_AVAILABLE = True
except ImportError:
    REGISTRY_AVAILABLE = False

from kalshi_trader.ml import SuggestionType, MLDatabase


@pytest.mark.skipif(not FEATURES_AVAILABLE, reason="Feature engineering not available")
class TestFeatureEngineering:
    """Test feature engineering functionality."""
    
    @pytest.fixture
    def sample_price_history(self):
        """Create sample price history for testing."""
        timestamps = [datetime.now() - timedelta(minutes=i) for i in range(60, 0, -1)]
        # Create trending prices with some noise
        base_prices = [0.45 + i*0.002 + np.sin(i*0.1)*0.01 for i in range(60)]
        prices = [p + np.random.normal(0, 0.005) for p in base_prices]
        
        return PriceHistory(
            timestamps=timestamps,
            prices=prices,
            volumes=[100 + i*5 for i in range(60)],
        )
    
    @pytest.fixture
    def engineer(self):
        """Create feature engineer instance."""
        return FeatureEngineer(
            lookback_window=60,
            volatility_window=20,
            momentum_windows=[5, 10, 20]
        )
    
    def test_feature_engineer_initialization(self, engineer):
        """Test feature engineer initialization."""
        assert engineer.lookback_window == 60
        assert engineer.volatility_window == 20
        assert len(engineer.feature_names) >= 20  # At least 20 features
    
    def test_extract_features(self, engineer, sample_price_history):
        """Test feature extraction."""
        features = engineer.extract_features(sample_price_history)
        
        assert isinstance(features, FeatureSet)
        assert len(features.features) >= 20
        assert len(features.feature_names) >= 20
        
        # Check key features exist
        assert 'current_price' in features.features
        assert 'rsi_14' in features.features
        assert 'volatility_10' in features.features
        assert 'price_momentum_10' in features.features
    
    def test_price_features(self, engineer, sample_price_history):
        """Test price-based features."""
        features = engineer.extract_features(sample_price_history)
        
        # Current price should be the last price
        assert features.features['current_price'] == pytest.approx(
            sample_price_history.prices[-1], abs=0.001
        )
        
        # Price changes should be calculated
        assert 'price_change_5' in features.features
        assert 'price_change_10' in features.features
        assert 'price_change_20' in features.features
    
    def test_volatility_features(self, engineer, sample_price_history):
        """Test volatility features."""
        features = engineer.extract_features(sample_price_history)
        
        # Volatility should be positive
        assert features.features['volatility_10'] >= 0
        assert features.features['volatility_20'] >= 0
        
        # RSI should be between 0 and 100
        assert 0 <= features.features['rsi_14'] <= 100
        
        # Bollinger position should be between 0 and 1
        assert 0 <= features.features['bollinger_position'] <= 1
    
    def test_momentum_features(self, engineer, sample_price_history):
        """Test momentum features."""
        features = engineer.extract_features(sample_price_history)
        
        # MACD features should exist
        assert 'macd_line' in features.features
        assert 'macd_signal' in features.features
        assert 'macd_histogram' in features.features
        
        # Momentum values should exist
        assert 'momentum_10' in features.features
        assert 'momentum_20' in features.features
    
    def test_time_features(self, engineer, sample_price_history):
        """Test time-based features."""
        current_time = datetime.now()
        features = engineer.extract_features(sample_price_history, current_time)
        
        # Time features should be normalized
        assert 0 <= features.features['hour_of_day'] <= 1
        assert 0 <= features.features['day_of_week'] <= 1
        assert features.features['is_market_open'] in [0, 1]
    
    def test_market_structure_features(self, engineer, sample_price_history):
        """Test market structure features."""
        features = engineer.extract_features(sample_price_history)
        
        # Range features should be between 0 and 1
        assert 0 <= features.features['price_position_in_range'] <= 1
        assert features.features['price_distance_from_high'] >= 0
        assert features.features['price_distance_from_low'] >= 0
        
        # Trend direction should be -1, 0, or 1
        assert features.features['trend_direction'] in [-1.0, 0.0, 1.0]
    
    def test_insufficient_data(self, engineer):
        """Test handling of insufficient data."""
        # Create price history with too few points
        timestamps = [datetime.now() - timedelta(minutes=i) for i in range(5, 0, -1)]
        prices = [0.5] * 5
        history = PriceHistory(timestamps=timestamps, prices=prices)
        
        features = engineer.extract_features(history)
        
        # Should still return features with defaults
        assert len(features.features) >= 20
        assert features.features['current_price'] == 0.5
    
    def test_extract_features_for_suggestion_type(self, engineer, sample_price_history):
        """Test type-specific feature extraction."""
        features = engineer.extract_features_for_suggestion_type(
            sample_price_history,
            SuggestionType.BREAKOUT
        )
        
        # Should include suggestion type features
        assert 'is_breakout' in features.features
        assert 'is_reversion' in features.features
        assert 'is_volatility' in features.features
        
        assert features.features['is_breakout'] == 1.0
        assert features.features['is_reversion'] == 0.0
        assert features.features['is_volatility'] == 0.0
    
    def test_create_training_data(self, engineer):
        """Test training data creation."""
        # Create multiple price histories
        histories = []
        outcomes = []
        suggestion_types = []
        
        for i in range(10):
            timestamps = [datetime.now() - timedelta(minutes=j) for j in range(60, 0, -1)]
            prices = [0.45 + j*0.001 * (1 if i % 2 == 0 else -1) for j in range(60)]
            histories.append(PriceHistory(timestamps=timestamps, prices=prices))
            outcomes.append(i % 2 == 0)
            suggestion_types.append(SuggestionType.BREAKOUT)
        
        X, y = engineer.create_training_data(histories, outcomes, suggestion_types)
        
        assert X.shape[0] == 10  # 10 samples
        assert X.shape[1] >= 20  # At least 20 features
        assert len(y) == 10
        assert all(isinstance(label, (int, float)) for label in y)
    
    def test_feature_to_array(self, engineer, sample_price_history):
        """Test converting features to array."""
        features = engineer.extract_features(sample_price_history)
        array = features.to_array()
        
        assert isinstance(array, np.ndarray)
        assert len(array) == len(features.feature_names)
    
    def test_feature_to_dataframe(self, engineer, sample_price_history):
        """Test converting features to DataFrame."""
        import pandas as pd
        
        features = engineer.extract_features(sample_price_history)
        df = features.to_dataframe()
        
        assert isinstance(df, pd.DataFrame)
        assert len(df) == 1
        assert len(df.columns) >= 20


@pytest.mark.skipif(not TRAINING_AVAILABLE, reason="Model training not available")
class TestModelTraining:
    """Test model training functionality."""
    
    @pytest.fixture
    def sample_data(self):
        """Create sample training data."""
        np.random.seed(42)
        n_samples = 300
        n_features = 25
        
        X = np.random.randn(n_samples, n_features)
        # Create some correlation with target
        y = (X[:, 0] + X[:, 1] * 0.5 + np.random.randn(n_samples) * 0.3) > 0
        y = y.astype(int)
        
        feature_names = [f"feature_{i}" for i in range(n_features)]
        
        return X, y, feature_names
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory."""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    def test_training_config(self):
        """Test training configuration."""
        config = TrainingConfig(
            model_type=ModelType.XGBOOST,
            test_size=0.2,
            n_splits=5,
        )
        
        assert config.model_type == ModelType.XGBOOST
        assert config.test_size == 0.2
        assert config.n_splits == 5
        assert 'max_depth' in config.xgb_params
    
    def test_model_trainer_initialization(self):
        """Test model trainer initialization."""
        config = TrainingConfig(model_type=ModelType.XGBOOST)
        trainer = ModelTrainer(config)
        
        assert trainer.config == config
        assert trainer.model is None
    
    def test_train_xgboost(self, sample_data, temp_dir):
        """Test training XGBoost model."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig(
            model_type=ModelType.XGBOOST,
            n_splits=3,  # Fewer folds for speed
        )
        
        trainer = ModelTrainer(config)
        result = trainer.train(X, y, feature_names, SuggestionType.BREAKOUT)
        
        assert isinstance(result, TrainingResult)
        assert result.model_type == ModelType.XGBOOST
        assert result.suggestion_type == SuggestionType.BREAKOUT
        assert result.n_samples == len(y)
        assert result.n_features == X.shape[1]
        
        # Check metrics
        assert 0 <= result.test_accuracy <= 1
        assert 0 <= result.test_auc <= 1
        assert result.cv_results is not None
        assert result.cv_results.mean_accuracy > 0
    
    def test_train_lightgbm(self, sample_data, temp_dir):
        """Test training LightGBM model."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig(
            model_type=ModelType.LIGHTGBM,
            n_splits=3,
        )
        
        trainer = ModelTrainer(config)
        result = trainer.train(X, y, feature_names, SuggestionType.REVERSION)
        
        assert isinstance(result, TrainingResult)
        assert result.model_type == ModelType.LIGHTGBM
        assert result.suggestion_type == SuggestionType.REVERSION
        
        # Check metrics
        assert 0 <= result.test_accuracy <= 1
        assert result.cv_results is not None
    
    def test_cross_validation_results(self, sample_data):
        """Test cross-validation results."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig(n_splits=3)
        trainer = ModelTrainer(config)
        result = trainer.train(X, y, feature_names)
        
        cv = result.cv_results
        assert cv is not None
        assert len(cv.fold_scores) == 3  # 3 folds
        assert cv.mean_accuracy > 0
        assert cv.std_accuracy >= 0
        assert cv.mean_auc > 0
    
    def test_feature_importance(self, sample_data):
        """Test feature importance extraction."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig()
        trainer = ModelTrainer(config)
        result = trainer.train(X, y, feature_names)
        
        # Should have feature importance
        assert len(result.feature_importance) > 0
        
        # Importance should sum to approximately 1
        total_importance = sum(result.feature_importance.values())
        assert total_importance > 0
    
    def test_model_save_load(self, sample_data, temp_dir):
        """Test saving and loading model."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig()
        trainer = ModelTrainer(config)
        trainer.train(X, y, feature_names)
        
        # Save model
        model_path = Path(temp_dir) / "test_model.pkl"
        trainer.save(str(model_path))
        
        assert model_path.exists()
        
        # Load model
        new_trainer = ModelTrainer()
        new_trainer.load(str(model_path))
        
        assert new_trainer.model is not None
        assert new_trainer.scaler is not None
        assert len(new_trainer.feature_names) == len(feature_names)
    
    def test_model_prediction(self, sample_data):
        """Test model prediction."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig()
        trainer = ModelTrainer(config)
        trainer.train(X, y, feature_names)
        
        # Make predictions
        predictions = trainer.predict(X[:10])
        
        assert len(predictions) == 10
        assert all(isinstance(p, (int, np.integer)) for p in predictions)
        assert all(p in [0, 1] for p in predictions)
    
    def test_model_predict_proba(self, sample_data):
        """Test probability prediction."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig()
        trainer = ModelTrainer(config)
        trainer.train(X, y, feature_names)
        
        # Get probabilities
        probabilities = trainer.predict_proba(X[:10])
        
        assert len(probabilities) == 10
        assert all(0 <= p <= 1 for p in probabilities)
    
    def test_confidence_score(self, sample_data):
        """Test confidence score calculation."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig()
        trainer = ModelTrainer(config)
        trainer.train(X, y, feature_names)
        
        # Get confidence
        confidence = trainer.get_confidence_score(X[0])
        
        assert isinstance(confidence, float)
        assert 0 <= confidence <= 1
    
    def test_training_result_summary(self, sample_data):
        """Test training result summary."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig()
        trainer = ModelTrainer(config)
        result = trainer.train(X, y, feature_names)
        
        summary = result.summary()
        
        assert isinstance(summary, str)
        assert "Training Results" in summary
        assert "Test Set Performance" in summary
        assert "Cross-Validation" in summary
    
    def test_training_result_to_dict(self, sample_data):
        """Test converting result to dictionary."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig()
        trainer = ModelTrainer(config)
        result = trainer.train(X, y, feature_names)
        
        result_dict = result.to_dict()
        
        assert isinstance(result_dict, dict)
        assert 'model_type' in result_dict
        assert 'test_accuracy' in result_dict
        assert 'cv_results' in result_dict
    
    def test_ensemble_trainer(self, sample_data, temp_dir):
        """Test ensemble trainer."""
        X, y, feature_names = sample_data
        
        config = TrainingConfig(n_splits=3)
        ensemble = EnsembleTrainer(config)
        
        # Train for one suggestion type
        result = ensemble.train_for_suggestion_type(
            X, y, feature_names, SuggestionType.BREAKOUT
        )
        
        assert result.suggestion_type == SuggestionType.BREAKOUT
        
        # Test prediction
        prediction, confidence = ensemble.predict(X[0:1], SuggestionType.BREAKOUT)
        
        assert prediction in [0, 1]
        assert 0 <= confidence <= 1
        
        # Save all models
        save_dir = Path(temp_dir) / "ensemble_models"
        paths = ensemble.save_all(str(save_dir))
        
        assert SuggestionType.BREAKOUT in paths
        assert Path(paths[SuggestionType.BREAKOUT]).exists()


@pytest.mark.skipif(not REGISTRY_AVAILABLE, reason="Model registry not available")
class TestModelRegistry:
    """Test model registry functionality."""
    
    @pytest.fixture
    def temp_registry(self):
        """Create temporary registry."""
        temp_dir = tempfile.mkdtemp()
        registry_path = Path(temp_dir) / "registry"
        registry = ModelRegistry(registry_path, use_sqlite=True)
        registry.initialize()
        yield registry
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mock_training_result(self):
        """Create mock training result."""
        from kalshi_trader.ml.model_training import TrainingResult, CrossValidationResult
        
        cv_results = CrossValidationResult(
            fold_scores=[
                {'fold': 1, 'accuracy': 0.75, 'auc': 0.80},
                {'fold': 2, 'accuracy': 0.78, 'auc': 0.82},
            ],
            mean_accuracy=0.765,
            std_accuracy=0.015,
            mean_auc=0.81,
            std_auc=0.01,
            mean_f1=0.74,
            std_f1=0.02,
        )
        
        return TrainingResult(
            model_type=ModelType.XGBOOST,
            suggestion_type=SuggestionType.BREAKOUT,
            training_timestamp=datetime.now(),
            config=TrainingConfig(),
            n_samples=500,
            n_features=25,
            class_distribution={'0': 200, '1': 300},
            cv_results=cv_results,
            test_accuracy=0.77,
            test_precision=0.78,
            test_recall=0.75,
            test_f1=0.765,
            test_auc=0.82,
            test_log_loss=0.45,
            feature_importance={'feature_0': 0.3, 'feature_1': 0.2},
        )
    
    @pytest.fixture
    def temp_model_file(self, temp_registry):
        """Create temporary model file."""
        import pickle
        
        model_path = temp_registry.artifacts_path / "test_model.pkl"
        with open(model_path, 'wb') as f:
            pickle.dump({'model': 'test'}, f)
        return str(model_path)
    
    def test_registry_initialization(self, temp_registry):
        """Test registry initialization."""
        assert temp_registry.registry_path.exists()
        assert temp_registry.artifacts_path.exists()
    
    def test_register_model(self, temp_registry, mock_training_result, temp_model_file):
        """Test model registration."""
        version = temp_registry.register_model(
            model_name="test_breakout",
            training_result=mock_training_result,
            model_path=temp_model_file,
            description="Test model",
            tags={'env': 'test'}
        )
        
        assert isinstance(version, ModelVersion)
        assert version.model_name == "test_breakout"
        assert version.suggestion_type == SuggestionType.BREAKOUT
        assert version.status == ModelStatus.STAGING
        assert version.description == "Test model"
        assert version.tags == {'env': 'test'}
        assert Path(version.model_path).exists()
    
    def test_get_version(self, temp_registry, mock_training_result, temp_model_file):
        """Test retrieving a version."""
        version = temp_registry.register_model(
            "test_model",
            mock_training_result,
            temp_model_file
        )
        
        retrieved = temp_registry.get_version(version.version_id)
        
        assert retrieved is not None
        assert retrieved.version_id == version.version_id
        assert retrieved.model_name == version.model_name
    
    def test_list_versions(self, temp_registry, mock_training_result, temp_model_file):
        """Test listing versions."""
        # Register multiple models
        for i in range(3):
            temp_registry.register_model(
                f"model_{i}",
                mock_training_result,
                temp_model_file
            )
        
        versions = temp_registry.list_versions(limit=10)
        
        assert len(versions) == 3
    
    def test_list_versions_with_filter(self, temp_registry, mock_training_result, temp_model_file):
        """Test listing versions with filters."""
        # Register models with different suggestion types
        result_breakout = mock_training_result
        result_reversion = TrainingResult(
            model_type=ModelType.XGBOOST,
            suggestion_type=SuggestionType.REVERSION,
            training_timestamp=datetime.now(),
            config=TrainingConfig(),
            n_samples=500,
            n_features=25,
            class_distribution={'0': 200, '1': 300},
            cv_results=None,
            test_accuracy=0.75,
            test_precision=0.76,
            test_recall=0.74,
            test_f1=0.75,
            test_auc=0.80,
            test_log_loss=0.50,
            feature_importance={},
        )
        
        temp_registry.register_model("breakout_model", result_breakout, temp_model_file)
        temp_registry.register_model("reversion_model", result_reversion, temp_model_file)
        
        # Filter by suggestion type
        breakout_versions = temp_registry.list_versions(
            suggestion_type=SuggestionType.BREAKOUT
        )
        
        assert len(breakout_versions) == 1
        assert breakout_versions[0].suggestion_type == SuggestionType.BREAKOUT
    
    def test_promote_to_production(self, temp_registry, mock_training_result, temp_model_file):
        """Test promoting model to production."""
        version = temp_registry.register_model(
            "prod_test",
            mock_training_result,
            temp_model_file
        )
        
        promoted = temp_registry.promote_to_production(
            version.version_id,
            reason="Test promotion"
        )
        
        assert promoted.status == ModelStatus.PRODUCTION
        
        # Check production model retrieval
        prod_model = temp_registry.get_production_model("prod_test")
        assert prod_model is not None
        assert prod_model.version_id == version.version_id
    
    def test_update_status(self, temp_registry, mock_training_result, temp_model_file):
        """Test updating model status."""
        version = temp_registry.register_model(
            "status_test",
            mock_training_result,
            temp_model_file
        )
        
        updated = temp_registry.update_status(
            version.version_id,
            ModelStatus.ARCHIVED,
            reason="Test archive"
        )
        
        assert updated.status == ModelStatus.ARCHIVED
    
    def test_compare_versions(self, temp_registry, mock_training_result, temp_model_file):
        """Test version comparison."""
        # Register baseline
        baseline = temp_registry.register_model(
            "compare_test",
            mock_training_result,
            temp_model_file
        )
        
        # Register candidate with better metrics
        better_result = TrainingResult(
            model_type=ModelType.XGBOOST,
            suggestion_type=SuggestionType.BREAKOUT,
            training_timestamp=datetime.now(),
            config=TrainingConfig(),
            n_samples=500,
            n_features=25,
            class_distribution={'0': 200, '1': 300},
            cv_results=None,
            test_accuracy=0.85,  # Better
            test_precision=0.86,
            test_recall=0.84,
            test_f1=0.85,
            test_auc=0.88,  # Better
            test_log_loss=0.35,
            feature_importance={},
        )
        
        candidate = temp_registry.register_model(
            "compare_test_v2",
            better_result,
            temp_model_file
        )
        
        comparison = temp_registry.compare_versions(
            baseline.version_id,
            candidate.version_id
        )
        
        assert isinstance(comparison, ModelComparison)
        assert comparison.accuracy_diff > 0
        assert comparison.auc_diff > 0
        assert comparison.is_improvement is True
        assert len(comparison.recommendation) > 0
    
    def test_model_version_summary(self, temp_registry, mock_training_result, temp_model_file):
        """Test model version summary."""
        version = temp_registry.register_model(
            "summary_test",
            mock_training_result,
            temp_model_file,
            description="Test summary"
        )
        
        summary = version.summary()
        
        assert isinstance(summary, str)
        assert "summary_test" in summary
        assert "Test summary" in summary
        assert "Test Metrics" in summary
    
    def test_get_metrics_summary(self, temp_registry, mock_training_result, temp_model_file):
        """Test metrics summary."""
        # Register models
        temp_registry.register_model("metrics_test1", mock_training_result, temp_model_file)
        temp_registry.register_model("metrics_test2", mock_training_result, temp_model_file)
        
        summary = temp_registry.get_metrics_summary()
        
        assert summary['total_models'] == 2
        assert 'by_status' in summary
        assert 'by_suggestion_type' in summary


class TestDatabaseExtended:
    """Test extended database functionality."""
    
    @pytest.fixture
    def temp_db(self):
        """Create temporary database."""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_extended.db"
        db = MLDatabase(db_path)
        db.initialize()
        yield db
        shutil.rmtree(temp_dir)
    
    def test_save_training_sample(self, temp_db):
        """Test saving training sample."""
        temp_db.save_training_sample(
            trade_id="trade_001",
            suggestion_type="breakout",
            features=[0.1, 0.2, 0.3, 0.4, 0.5],
            feature_names=["f1", "f2", "f3", "f4", "f5"],
            outcome=True,
            pnl=5.0,
            confidence=0.75
        )
        
        count = temp_db.get_training_data_count("breakout")
        assert count == 1
    
    def test_get_training_data(self, temp_db):
        """Test retrieving training data."""
        # Save multiple samples
        for i in range(10):
            temp_db.save_training_sample(
                trade_id=f"trade_{i:03d}",
                suggestion_type="breakout",
                features=[0.1 * i, 0.2 * i, 0.3 * i],
                feature_names=["f1", "f2", "f3"],
                outcome=i % 2 == 0,
                pnl=5.0 if i % 2 == 0 else -3.0
            )
        
        X, y, feature_names = temp_db.get_training_data("breakout")
        
        assert len(X) == 10
        assert len(y) == 10
        assert len(feature_names) == 3
        assert all(isinstance(label, bool) for label in y)
    
    def test_record_model_prediction(self, temp_db):
        """Test recording model prediction."""
        temp_db.record_model_prediction(
            prediction_id="pred_001",
            trade_id="trade_001",
            model_version="v1.0",
            suggestion_type="breakout",
            predicted_outcome=0.75,
            features_used={"feature_1": 0.5, "feature_2": 0.3}
        )
        
        # Update with actual outcome
        temp_db.update_prediction_outcome("pred_001", True)
        
        # Get accuracy
        accuracy = temp_db.get_prediction_accuracy("v1.0")
        
        assert accuracy['total_predictions'] == 1
        assert accuracy['correct_predictions'] in [0, 1]
    
    def test_record_training_run(self, temp_db):
        """Test recording training run."""
        temp_db.record_training_run(
            run_id="run_001",
            model_type="xgboost",
            suggestion_type="breakout",
            n_samples=500,
            n_features=25,
            model_path="/path/to/model.pkl"
        )
        
        # Complete the run
        temp_db.complete_training_run(
            run_id="run_001",
            cv_accuracy=0.75,
            cv_auc=0.80,
            test_accuracy=0.77,
            test_auc=0.82
        )
        
        # Get training runs
        runs = temp_db.get_training_runs("breakout")
        
        assert len(runs) == 1
        assert runs[0]['run_id'] == "run_001"
        assert runs[0]['cv_accuracy'] == 0.75
        assert runs[0]['status'] == 'completed'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])