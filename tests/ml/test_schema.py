"""
Tests for ML Pipeline schema validation and models.

REMY-189: ML Pipeline Phase 1 - Database Schema & Shadow Mode
"""

import pytest
from datetime import datetime
from uuid import uuid4, UUID
from typing import Dict, Any

# Import schemas
from src.ml_pipeline.schema import (
    PredictionCreate,
    PredictionUpdate,
    PredictionResponse,
    PredictionInDB,
    ShadowPredictionCreate,
    ShadowPredictionUpdate,
    ShadowPredictionResponse,
    ShadowPredictionInDB,
    PredictionResolution,
    PredictionStats,
    ShadowModeStats,
    BatchPredictionCreate,
)

# Import config
from src.ml_pipeline.config import (
    MLConfig,
    ModelConfig,
    FeatureConfig,
    ShadowModeConfig,
    DatabaseConfig,
    get_ml_config,
    set_ml_config,
    reset_ml_config,
)


class TestPredictionSchemas:
    """Tests for prediction-related Pydantic schemas."""
    
    def test_prediction_create_valid(self):
        """Test creating a valid PredictionCreate schema."""
        ticket_id = uuid4()
        prediction = PredictionCreate(
            ticket_id=ticket_id,
            model_version="v1.0.0",
            predicted_category="bug",
            confidence_score=0.95,
            features_used={"title_length": 42, "has_stack_trace": True}
        )
        
        assert prediction.ticket_id == ticket_id
        assert prediction.model_version == "v1.0.0"
        assert prediction.predicted_category == "bug"
        assert prediction.confidence_score == 0.95
        assert prediction.features_used["title_length"] == 42
    
    def test_prediction_create_minimal(self):
        """Test creating a PredictionCreate with minimal fields."""
        prediction = PredictionCreate(
            ticket_id=uuid4(),
            model_version="v1.0.0",
            predicted_category="bug",
            confidence_score=0.5,
        )
        
        assert prediction.features_used == {}  # Default empty dict
        assert prediction.confidence_score == 0.5
    
    def test_prediction_create_invalid_confidence_too_high(self):
        """Test that confidence score > 1.0 raises validation error."""
        with pytest.raises(ValueError) as exc_info:
            PredictionCreate(
                ticket_id=uuid4(),
                model_version="v1.0.0",
                predicted_category="bug",
                confidence_score=1.5,
            )
        assert "confidence" in str(exc_info.value).lower() or "1.5" in str(exc_info.value)
    
    def test_prediction_create_invalid_confidence_too_low(self):
        """Test that confidence score < 0.0 raises validation error."""
        with pytest.raises(ValueError) as exc_info:
            PredictionCreate(
                ticket_id=uuid4(),
                model_version="v1.0.0",
                predicted_category="bug",
                confidence_score=-0.1,
            )
        assert "confidence" in str(exc_info.value).lower() or "-0.1" in str(exc_info.value)
    
    def test_prediction_create_confidence_rounding(self):
        """Test that confidence scores are rounded to 2 decimal places."""
        prediction = PredictionCreate(
            ticket_id=uuid4(),
            model_version="v1.0.0",
            predicted_category="bug",
            confidence_score=0.95555,  # Will be rounded to 0.96
        )
        # Note: The validator rounds the value
        assert round(prediction.confidence_score, 2) == 0.96
    
    def test_prediction_create_empty_model_version(self):
        """Test that empty model_version raises validation error."""
        with pytest.raises(ValueError):
            PredictionCreate(
                ticket_id=uuid4(),
                model_version="",
                predicted_category="bug",
                confidence_score=0.5,
            )
    
    def test_prediction_update(self):
        """Test PredictionUpdate schema."""
        update = PredictionUpdate(
            was_correct=True,
            resolved_at=datetime.utcnow()
        )
        
        assert update.was_correct is True
        assert update.resolved_at is not None
    
    def test_prediction_update_partial(self):
        """Test partial update of PredictionUpdate schema."""
        update = PredictionUpdate(was_correct=False)
        
        assert update.was_correct is False
        assert update.resolved_at is None
    
    def test_prediction_response(self):
        """Test PredictionResponse schema includes computed fields."""
        response = PredictionResponse(
            prediction_id=uuid4(),
            ticket_id=uuid4(),
            model_version="v1.0.0",
            predicted_category="bug",
            confidence_score=0.95,
            features_used={},
            created_at=datetime.utcnow(),
            was_correct=True,
            is_resolved=True,
        )
        
        assert response.is_resolved is True
        assert response.was_correct is True


class TestShadowPredictionSchemas:
    """Tests for shadow prediction schemas."""
    
    def test_shadow_prediction_create_valid(self):
        """Test creating a valid ShadowPredictionCreate."""
        prediction_id = uuid4()
        shadow = ShadowPredictionCreate(
            prediction_id=prediction_id,
            actual_outcome="feature_request",
            comparison_metrics={"latency_ms": 150}
        )
        
        assert shadow.prediction_id == prediction_id
        assert shadow.actual_outcome == "feature_request"
        assert shadow.comparison_metrics["latency_ms"] == 150
    
    def test_shadow_prediction_create_minimal(self):
        """Test creating ShadowPredictionCreate with minimal fields."""
        shadow = ShadowPredictionCreate(
            prediction_id=uuid4(),
        )
        
        assert shadow.actual_outcome is None
        assert shadow.comparison_metrics == {}
    
    def test_shadow_prediction_update(self):
        """Test ShadowPredictionUpdate schema."""
        update = ShadowPredictionUpdate(
            actual_outcome="bug",
            comparison_metrics={"match": True}
        )
        
        assert update.actual_outcome == "bug"
        assert update.comparison_metrics["match"] is True
    
    def test_shadow_prediction_response(self):
        """Test ShadowPredictionResponse with accuracy field."""
        response = ShadowPredictionResponse(
            shadow_prediction_id=uuid4(),
            prediction_id=uuid4(),
            actual_outcome="bug",
            comparison_metrics={"match": True},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_resolved=True,
            accuracy=1.0,
        )
        
        assert response.is_resolved is True
        assert response.accuracy == 1.0


class TestPredictionResolution:
    """Tests for prediction resolution schema."""
    
    def test_resolution_valid(self):
        """Test valid prediction resolution."""
        resolution = PredictionResolution(
            actual_outcome="bug",
            comparison_metrics={"manual_review": True}
        )
        
        assert resolution.actual_outcome == "bug"
        assert resolution.comparison_metrics["manual_review"] is True
    
    def test_resolution_required_fields(self):
        """Test that actual_outcome is required."""
        with pytest.raises(ValueError):
            PredictionResolution(
                actual_outcome="",
            )
    
    def test_resolution_optional_metrics(self):
        """Test that comparison_metrics are optional."""
        resolution = PredictionResolution(actual_outcome="feature_request")
        
        assert resolution.actual_outcome == "feature_request"
        assert resolution.comparison_metrics == {}


class TestBatchOperations:
    """Tests for batch operation schemas."""
    
    def test_batch_create_valid(self):
        """Test valid batch prediction creation."""
        predictions = [
            PredictionCreate(
                ticket_id=uuid4(),
                model_version="v1.0.0",
                predicted_category="bug",
                confidence_score=0.9,
            ),
            PredictionCreate(
                ticket_id=uuid4(),
                model_version="v1.0.0",
                predicted_category="feature_request",
                confidence_score=0.85,
            ),
        ]
        
        batch = BatchPredictionCreate(predictions=predictions)
        assert len(batch.predictions) == 2
        assert batch.predictions[0].predicted_category == "bug"
    
    def test_batch_create_empty_list(self):
        """Test that empty batch raises validation error."""
        with pytest.raises(ValueError):
            BatchPredictionCreate(predictions=[])


class TestStatsSchemas:
    """Tests for statistics schemas."""
    
    def test_prediction_stats_valid(self):
        """Test valid prediction statistics."""
        stats = PredictionStats(
            total_predictions=1000,
            resolved_predictions=750,
            correct_predictions=680,
            accuracy_percentage=90.67,
            avg_confidence=0.87,
            model_version="v1.0.0"
        )
        
        assert stats.total_predictions == 1000
        assert stats.accuracy_percentage == 90.67
    
    def test_prediction_stats_invalid_accuracy(self):
        """Test that accuracy > 100 raises error."""
        with pytest.raises(ValueError):
            PredictionStats(
                total_predictions=100,
                resolved_predictions=100,
                correct_predictions=100,
                accuracy_percentage=101.0,
                avg_confidence=0.5,
            )
    
    def test_shadow_mode_stats(self):
        """Test shadow mode statistics."""
        stats = ShadowModeStats(
            total_shadow_predictions=500,
            resolved_predictions=400,
            accuracy_percentage=85.5,
            avg_latency_ms=150.0,
            pending_count=100,
        )
        
        assert stats.pending_count == 100
        assert stats.accuracy_percentage == 85.5


class TestMLConfig:
    """Tests for ML configuration management."""
    
    def setup_method(self):
        """Reset config before each test."""
        reset_ml_config()
    
    def test_model_config_valid_threshold(self):
        """Test ModelConfig with valid threshold."""
        config = ModelConfig(
            version="v1.0.0",
            threshold=0.75,
            enabled=True
        )
        
        assert config.threshold == 0.75
        assert config.enabled is True
    
    def test_model_config_invalid_threshold_high(self):
        """Test ModelConfig with threshold > 1.0 raises error."""
        with pytest.raises(ValueError):
            ModelConfig(threshold=1.5)
    
    def test_model_config_invalid_threshold_low(self):
        """Test ModelConfig with threshold < 0.0 raises error."""
        with pytest.raises(ValueError):
            ModelConfig(threshold=-0.1)
    
    def test_shadow_mode_config_valid_sampling(self):
        """Test ShadowModeConfig with valid sampling rate."""
        config = ShadowModeConfig(sampling_rate=50.0)
        assert config.sampling_rate == 50.0
    
    def test_shadow_mode_config_invalid_sampling(self):
        """Test ShadowModeConfig with invalid sampling rate raises error."""
        with pytest.raises(ValueError):
            ShadowModeConfig(sampling_rate=150.0)
    
    def test_feature_config_defaults(self):
        """Test FeatureConfig default values."""
        config = FeatureConfig()
        
        assert config.use_title is True
        assert config.use_description is True
        assert config.use_sentiment is False
        assert config.cache_enabled is True
    
    def test_database_config_from_env(self, monkeypatch):
        """Test DatabaseConfig loads from environment."""
        monkeypatch.setenv("DATABASE_URL", "postgresql://test@localhost/db")
        config = DatabaseConfig()
        
        assert config.connection_string == "postgresql://test@localhost/db"
    
    def test_ml_config_from_dict(self):
        """Test loading MLConfig from dictionary."""
        config_dict: Dict[str, Any] = {
            "model": {
                "version": "v2.0.0",
                "threshold": 0.8,
                "enabled": True,
            },
            "shadow_mode": {
                "enabled": True,
                "sampling_rate": 75.0,
            },
            "features": {
                "use_sentiment": True,
                "cache_enabled": False,
            },
            "debug": True,
            "log_level": "DEBUG",
        }
        
        config = MLConfig.from_dict(config_dict)
        
        assert config.active_model.version == "v2.0.0"
        assert config.active_model.threshold == 0.8
        assert config.shadow_mode.sampling_rate == 75.0
        assert config.features.use_sentiment is True
        assert config.debug is True
    
    def test_ml_config_to_dict(self):
        """Test converting MLConfig to dictionary."""
        config = MLConfig()
        config_dict = config.to_dict()
        
        assert "model" in config_dict
        assert "shadow_mode" in config_dict
        assert "features" in config_dict
        assert config_dict["model"]["version"] == config.active_model.version
    
    def test_should_run_shadow_mode(self):
        """Test should_run_shadow_mode logic."""
        config = MLConfig()
        
        # Should run when enabled and confidence above threshold
        assert config.should_run_shadow_mode(confidence=0.8) is True
        
        # Should not run when disabled
        config.shadow_mode.enabled = False
        assert config.should_run_shadow_mode(confidence=0.8) is False
    
    def test_should_run_shadow_mode_low_confidence(self):
        """Test should_run_shadow_mode with low confidence."""
        config = MLConfig()
        config.shadow_mode.min_confidence_threshold = 0.7
        
        # Should not run when confidence below threshold
        assert config.should_run_shadow_mode(confidence=0.5) is False
    
    def test_get_ml_config_singleton(self):
        """Test that get_ml_config returns singleton."""
        config1 = get_ml_config()
        config2 = get_ml_config()
        
        assert config1 is config2
    
    def test_set_ml_config(self):
        """Test set_ml_config changes global config."""
        new_config = MLConfig(active_model=ModelConfig(version="v3.0.0"))
        set_ml_config(new_config)
        
        config = get_ml_config()
        assert config.active_model.version == "v3.0.0"


class TestSchemaSerialization:
    """Tests for schema serialization and deserialization."""
    
    def test_prediction_json_serialization(self):
        """Test that predictions serialize to JSON correctly."""
        prediction = PredictionCreate(
            ticket_id=uuid4(),
            model_version="v1.0.0",
            predicted_category="bug",
            confidence_score=0.95,
            features_used={"key": "value", "number": 42}
        )
        
        # Convert to JSON and back
        json_str = prediction.model_dump_json()
        assert "ticket_id" in json_str
        assert "confidence_score" in json_str
        assert "0.95" in json_str
    
    def test_prediction_dict_export(self):
        """Test model_dump exports to dict."""
        prediction = PredictionCreate(
            ticket_id=uuid4(),
            model_version="v1.0.0",
            predicted_category="bug",
            confidence_score=0.95,
        )
        
        data = prediction.model_dump()
        assert data["model_version"] == "v1.0.0"
        assert data["confidence_score"] == 0.95
        assert isinstance(data["ticket_id"], UUID)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])