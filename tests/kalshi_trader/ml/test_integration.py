"""Tests for ML Trading Integration."""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

from kalshi_trader.ml.trading_integration import (
    MLEnhancedTrader,
    TradeSuggestion,
    MLEnhancedTrade,
    MLTradingLoop,
)
from kalshi_trader.ml.config import MLConfig, MLFeatureLevel
from kalshi_trader.ml.confidence_scorer import SuggestionType
from kalshi_trader.ml.feature_engineering import PriceHistory


class TestTradeSuggestion:
    """Test TradeSuggestion dataclass."""
    
    def test_creation(self):
        """Test creating a TradeSuggestion."""
        suggestion = TradeSuggestion(
            suggestion_type=SuggestionType.BREAKOUT,
            should_trade=True,
            confidence=0.75,
            bayesian_confidence=0.65,
            ml_confidence=0.80,
            combined_confidence=0.75,
        )
        
        assert suggestion.suggestion_type == SuggestionType.BREAKOUT
        assert suggestion.should_trade is True
        assert suggestion.confidence == 0.75
        assert suggestion.ml_enabled is True
    
    def test_to_dict(self):
        """Test conversion to dictionary."""
        suggestion = TradeSuggestion(
            suggestion_type=SuggestionType.REVERSION,
            should_trade=False,
            confidence=0.45,
            bayesian_confidence=0.50,
            ml_confidence=0.40,
            combined_confidence=0.45,
        )
        
        data = suggestion.to_dict()
        
        assert data['suggestion_type'] == 'reversion'
        assert data['should_trade'] is False
        assert data['confidence'] == 0.45


class TestMLEnhancedTrader:
    """Test MLEnhancedTrader class."""
    
    @pytest.fixture
    def config(self):
        """Create test configuration."""
        return MLConfig(
            integration=type('obj', (object,), {
                'ml_feature_level': MLFeatureLevel.ENHANCED,
                'fallback_to_momentum': True,
                'momentum_confidence_threshold': 0.6,
                'bayesian_weight': 0.4,
                'ml_weight': 0.6,
            })(),
        )
    
    @pytest.fixture
    def mock_pipeline(self):
        """Create mock ML pipeline."""
        mock = MagicMock()
        mock.predict.return_value = MagicMock(
            should_trade=True,
            confidence=0.7,
            ml_confidence=0.8,
            combined_confidence=0.75,
            model_version='v1.0',
            safety_check_passed=True,
            graduation_status={'mode': 'live'},
            features_used={'feature1': 0.5},
        )
        mock.calculate_position_size.return_value = 150.0
        mock.get_safety_status.return_value = {'state': {'is_trading_allowed': True}}
        return mock
    
    def test_initialization(self, config):
        """Test trader initialization."""
        trader = MLEnhancedTrader(config=config)
        assert trader._initialized is False
        assert trader.config == config
    
    def test_get_suggestion_momentum_only_mode(self):
        """Test suggestion in momentum-only mode."""
        config = MLConfig(
            integration=type('obj', (object,), {
                'ml_feature_level': MLFeatureLevel.DISABLED,
                'momentum_confidence_threshold': 0.6,
            })(),
        )
        
        trader = MLEnhancedTrader(config=config)
        trader.initialize(balance=1000.0)
        
        price_history = PriceHistory(prices=[], market_id="TEST")
        
        suggestion = trader.get_suggestion(
            price_history=price_history,
            suggestion_type=SuggestionType.BREAKOUT,
            momentum_confidence=0.7,
        )
        
        assert suggestion.ml_enabled is False
        assert suggestion.should_trade is True
    
    def test_get_suggestion_with_fallback(self, config, mock_pipeline):
        """Test suggestion with fallback on ML failure."""
        trader = MLEnhancedTrader(config=config, pipeline=mock_pipeline)
        trader._ml_available = True
        trader._initialized = True
        
        # Make ML prediction fail
        mock_pipeline.predict.side_effect = Exception("ML error")
        
        price_history = PriceHistory(prices=[], market_id="TEST")
        
        suggestion = trader.get_suggestion(
            price_history=price_history,
            suggestion_type=SuggestionType.BREAKOUT,
            momentum_confidence=0.65,
        )
        
        assert suggestion.used_fallback is True
        assert suggestion.fallback_reason is not None
        assert 'ML failure' in suggestion.fallback_reason
    
    def test_can_trade(self, config, mock_pipeline):
        """Test trading permission check."""
        trader = MLEnhancedTrader(config=config, pipeline=mock_pipeline)
        trader._ml_available = True
        trader._initialized = True
        
        assert trader.can_trade() is True
        
        # Test when circuit breaker active
        mock_pipeline.get_safety_status.return_value = {
            'state': {'is_trading_allowed': False, 'status': 'circuit_breaker'}
        }
        
        assert trader.can_trade() is False
    
    def test_blend_confidences(self, config):
        """Test confidence blending."""
        trader = MLEnhancedTrader(config=config)
        
        # Normal blend
        blended = trader._blend_confidences(0.6, 0.8)
        assert 0.6 < blended < 0.8
        
        # High ML confidence should override
        assert trader._blend_confidences(0.5, 0.9) >= 0.9


class TestMLTradingLoop:
    """Test MLTradingLoop class."""
    
    @pytest.fixture
    def mock_strategy(self):
        """Create mock momentum strategy."""
        mock = MagicMock()
        mock.evaluate_signal.return_value = {'confidence': 0.7, 'strength': 0.8}
        return mock
    
    def test_initialization(self, mock_strategy):
        """Test trading loop initialization."""
        loop = MLTradingLoop(momentum_strategy=mock_strategy)
        assert loop.momentum_strategy == mock_strategy
        assert loop._running is False
    
    def test_start_stop(self, mock_strategy):
        """Test starting and stopping the loop."""
        loop = MLTradingLoop(momentum_strategy=mock_strategy)
        
        loop.start()
        assert loop.is_running is True
        
        loop.stop()
        assert loop.is_running is False
    
    def test_evaluate_signal(self, mock_strategy):
        """Test signal evaluation with ML enhancement."""
        config = MLConfig(
            integration=type('obj', (object,), {
                'ml_feature_level': MLFeatureLevel.DISABLED,
                'momentum_confidence_threshold': 0.6,
            })(),
        )
        
        loop = MLTradingLoop(momentum_strategy=mock_strategy, config=config)
        loop.initialize(balance=1000.0)
        
        price_history = PriceHistory(prices=[], market_id="TEST")
        
        suggestion = loop.evaluate_signal(
            price_history=price_history,
            suggestion_type=SuggestionType.BREAKOUT,
        )
        
        assert isinstance(suggestion, TradeSuggestion)
        assert suggestion.suggestion_type == SuggestionType.BREAKOUT


class TestGracefulDegradation:
    """Test graceful degradation scenarios."""
    
    def test_degradation_when_ml_pipeline_unavailable(self):
        """Test fallback when ML pipeline fails to initialize."""
        config = MLConfig(
            integration=type('obj', (object,), {
                'ml_feature_level': MLFeatureLevel.ENHANCED,
                'fallback_to_momentum': True,
                'momentum_confidence_threshold': 0.6,
            })(),
        )
        
        with patch.object(MLConfig, 'from_env', return_value=config):
            trader = MLEnhancedTrader(config=config)
            
            # Simulate ML init failure by not calling initialize
            trader._initialized = True
            trader._ml_available = False
            
            price_history = PriceHistory(prices=[], market_id="TEST")
            
            suggestion = trader.get_suggestion(
                price_history=price_history,
                suggestion_type=SuggestionType.BREAKOUT,
                momentum_confidence=0.7,
            )
            
            assert suggestion.ml_enabled is False
            assert suggestion.used_fallback is False
    
    def test_full_mode_fails_on_init_error(self):
        """Test that FULL mode raises on ML init failure."""
        config = MLConfig(
            integration=type('obj', (object,), {
                'ml_feature_level': MLFeatureLevel.FULL,
            })(),
        )
        
        trader = MLEnhancedTrader(config=config)
        
        with pytest.raises(Exception):
            trader.initialize(balance=1000.0)
