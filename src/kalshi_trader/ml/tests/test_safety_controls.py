"""Tests for Safety Controls module.

Tests circuit breakers, position sizing, exposure limits, and cooldown periods.
"""

import pytest
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from kalshi_trader.ml.safety_controls import (
    SafetyControls,
    SafetyConfig,
    SafetyStatus,
    SafetyState,
    CircuitBreakerReason,
    create_safety_controls,
)
from kalshi_trader.ml.database import MLDatabase


class TestSafetyConfig:
    """Test SafetyConfig dataclass."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = SafetyConfig()
        
        assert config.max_consecutive_losses == 3
        assert config.max_daily_loss == -50.0
        assert config.position_size_method == "fixed_fractional"
        assert config.fixed_fraction == 0.05
        assert config.kelly_fraction == 0.5
        assert config.max_position_percent == 0.20
        assert config.max_open_positions == 5
        assert config.cooldown_minutes == 30
    
    def test_custom_config(self):
        """Test custom configuration values."""
        config = SafetyConfig(
            max_consecutive_losses=5,
            max_daily_loss=-100.0,
            fixed_fraction=0.10,
            kelly_fraction=0.25,
        )
        
        assert config.max_consecutive_losses == 5
        assert config.max_daily_loss == -100.0
        assert config.fixed_fraction == 0.10
        assert config.kelly_fraction == 0.25
    
    def test_config_serialization(self):
        """Test config to/from dict."""
        config = SafetyConfig(max_consecutive_losses=2)
        data = config.to_dict()
        restored = SafetyConfig.from_dict(data)
        
        assert restored.max_consecutive_losses == 2
        assert restored.max_daily_loss == config.max_daily_loss


class TestSafetyState:
    """Test SafetyState dataclass."""
    
    def test_default_state(self):
        """Test default state values."""
        state = SafetyState()
        
        assert state.status == SafetyStatus.NORMAL
        assert state.consecutive_losses == 0
        assert state.daily_pnl == 0.0
        assert state.open_positions == 0
        assert state.is_trading_allowed is True
        assert state.can_open_position is True
    
    def test_trading_blocked_in_circuit_breaker(self):
        """Test trading blocked during circuit breaker."""
        state = SafetyState()
        state.status = SafetyStatus.CIRCUIT_BREAKER
        
        assert state.is_trading_allowed is False
    
    def test_trading_blocked_when_max_positions(self):
        """Test trading blocked at max positions."""
        state = SafetyState()
        state.open_positions = 6  # Over limit
        
        assert state.can_open_position is False
    
    def test_cooldown_allows_trading_after_expiry(self):
        """Test trading allowed after cooldown expires."""
        state = SafetyState()
        state.status = SafetyStatus.COOLDOWN
        state.circuit_breaker_until = datetime.now() - timedelta(minutes=1)
        
        assert state.is_trading_allowed is True
    
    def test_cooldown_blocks_trading_before_expiry(self):
        """Test trading blocked during cooldown."""
        state = SafetyState()
        state.status = SafetyStatus.COOLDOWN
        state.circuit_breaker_until = datetime.now() + timedelta(minutes=10)
        
        assert state.is_trading_allowed is False


class TestSafetyControls:
    """Test SafetyControls functionality."""
    
    @pytest.fixture
    def safety(self):
        """Create fresh safety controls for each test."""
        config = SafetyConfig()
        safety = SafetyControls(config=config)
        safety.initialize(balance=1000.0)
        return safety
    
    @pytest.fixture
    def safety_with_db(self):
        """Create safety controls with database."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            db = MLDatabase(str(db_path))
            db.initialize()
            
            config = SafetyConfig()
            safety = SafetyControls(db=db, config=config)
            safety.initialize(balance=1000.0)
            yield safety
    
    def test_initialization(self, safety):
        """Test that safety controls initialize correctly."""
        assert safety._initialized is True
        assert safety.state.total_balance == 1000.0
        assert safety.can_trade() is True
    
    def test_can_trade_not_initialized(self):
        """Test that trading is blocked when not initialized."""
        safety = SafetyControls()
        assert safety.can_trade() is False
    
    def test_check_circuit_breakers_no_trigger(self, safety):
        """Test that circuit breakers don't trigger on normal state."""
        reason = safety.check_circuit_breakers()
        assert reason is None
    
    def test_circuit_breaker_consecutive_losses(self, safety):
        """Test circuit breaker triggers on consecutive losses."""
        # Record 3 consecutive losing trades
        for i in range(3):
            safety.record_trade(f"trade_{i}", pnl=-10.0, position_size=10.0, suggestion_type="test")
        
        assert safety.state.status == SafetyStatus.CIRCUIT_BREAKER
        assert safety.can_trade() is False
        assert safety.state.circuit_breaker_reason == CircuitBreakerReason.CONSECUTIVE_LOSSES
    
    def test_circuit_breaker_daily_loss(self, safety):
        """Test circuit breaker triggers on daily loss limit."""
        # Loss exceeding daily limit
        safety.record_trade("trade_1", pnl=-60.0, position_size=60.0, suggestion_type="test")
        
        assert safety.state.status == SafetyStatus.CIRCUIT_BREAKER
        assert safety.state.circuit_breaker_reason == CircuitBreakerReason.DAILY_LOSS_LIMIT
    
    def test_manual_circuit_breaker(self, safety):
        """Test manual circuit breaker trigger."""
        safety.trigger_circuit_breaker(CircuitBreakerReason.MANUAL, "Testing manual trigger")
        
        assert safety.state.status == SafetyStatus.CIRCUIT_BREAKER
        assert safety.state.circuit_breaker_reason == CircuitBreakerReason.MANUAL
        assert safety.can_trade() is False
    
    def test_circuit_breaker_cooldown_expires(self, safety):
        """Test that circuit breaker expires after cooldown."""
        # Trigger breaker with 0 minute cooldown to expire immediately
        safety.config.cooldown_minutes = 0
        safety.trigger_circuit_breaker(CircuitBreakerReason.MANUAL)
        
        # Should be expired immediately
        assert safety.can_trade() is True
    
    def test_circuit_breaker_reset_consecutive_losses(self, safety):
        """Test that consecutive losses reset after cooldown."""
        safety.config.cooldown_minutes = 0
        safety.state.consecutive_losses = 5
        
        safety.trigger_circuit_breaker(CircuitBreakerReason.CONSECUTIVE_LOSSES)
        safety._reset_circuit_breaker()
        
        assert safety.state.consecutive_losses == 0
    
    def test_position_size_fixed_fractional(self, safety):
        """Test fixed fractional position sizing."""
        safety.config.position_size_method = "fixed_fractional"
        safety.config.fixed_fraction = 0.05
        
        size = safety.calculate_position_size(confidence=0.7)
        
        # 5% of $1000 scaled by confidence (0.5 + 0.7*0.5 = 0.85)
        expected_base = 1000.0 * 0.05
        expected_size = expected_base * 0.85
        assert size == pytest.approx(expected_size, rel=0.01)
    
    def test_position_size_kelly(self, safety):
        """Test Kelly criterion position sizing."""
        safety.config.position_size_method = "kelly"
        safety.config.kelly_fraction = 0.5
        
        size = safety.calculate_position_size(
            confidence=0.8,
            win_rate=0.6,
            avg_win=20.0,
            avg_loss=10.0,
        )
        
        # Kelly = (bp - q) / b = (2*0.6 - 0.4) / 2 = 0.4
        # Half Kelly = 0.2 = 20%
        # But max_position_percent limits to 20%
        assert size > 0
        assert size <= 200.0  # Max 20% of 1000
    
    def test_position_size_max_cap(self, safety):
        """Test that position size is capped at max_position_percent."""
        safety.config.fixed_fraction = 0.5  # 50% - but will be capped
        safety.config.max_position_percent = 0.20
        
        size = safety.calculate_position_size(confidence=1.0)
        
        assert size <= 200.0  # Max 20% of 1000
    
    def test_kelly_size_calculation(self, safety):
        """Test Kelly size calculation."""
        size = safety.calculate_kelly_size(
            win_rate=0.6,
            avg_win=20.0,
            avg_loss=10.0,
            confidence=1.0,
        )
        
        # Kelly = (0.6*2 - 0.4) / 2 = 0.4
        # Half Kelly = 0.2
        expected = 1000.0 * 0.2
        assert size == pytest.approx(expected, rel=0.01)
    
    def test_kelly_size_with_zero_values(self, safety):
        """Test Kelly calculation with edge cases."""
        size = safety.calculate_kelly_size(win_rate=0.6, avg_win=20.0, avg_loss=0.0)
        assert size == 0.0
        
        size = safety.calculate_kelly_size(win_rate=0.0, avg_win=20.0, avg_loss=10.0)
        assert size == 0.0
    
    def test_can_open_position_normal(self, safety):
        """Test that positions can be opened normally."""
        allowed, reason = safety.can_open_position(position_size=50.0)
        
        assert allowed is True
        assert reason == "OK"
    
    def test_can_open_position_too_large(self, safety):
        """Test that oversized positions are rejected."""
        allowed, reason = safety.can_open_position(position_size=250.0)
        
        assert allowed is False
        assert "max" in reason.lower()
    
    def test_can_open_position_max_exceeded(self, safety):
        """Test that max open positions blocks new positions."""
        safety.state.open_positions = 6
        
        allowed, reason = safety.can_open_position(position_size=50.0)
        
        assert allowed is False
        assert "max open positions" in reason.lower()
    
    def test_record_trade_updates_state(self, safety):
        """Test that recording trades updates safety state."""
        record = safety.record_trade("trade_1", pnl=50.0, position_size=50.0, suggestion_type="test")
        
        assert safety.state.daily_pnl == 50.0
        assert safety.state.consecutive_losses == 0
        assert safety.state.total_balance == 1050.0
    
    def test_record_trade_consecutive_losses(self, safety):
        """Test consecutive loss tracking."""
        safety.record_trade("trade_1", pnl=-10.0, position_size=10.0, suggestion_type="test")
        safety.record_trade("trade_2", pnl=-15.0, position_size=15.0, suggestion_type="test")
        
        assert safety.state.consecutive_losses == 2
    
    def test_record_trade_resets_consecutive_on_win(self, safety):
        """Test that wins reset consecutive losses."""
        safety.state.consecutive_losses = 2
        safety.record_trade("trade_1", pnl=10.0, position_size=10.0, suggestion_type="test")
        
        assert safety.state.consecutive_losses == 0
    
    def test_record_position_opened(self, safety):
        """Test position opened tracking."""
        safety.record_position_opened(position_size=50.0)
        
        assert safety.state.open_positions == 1
        assert safety.state.open_position_value == 50.0
        assert safety.state.last_trade_time is not None
    
    def test_get_status(self, safety):
        """Test getting safety status."""
        status = safety.get_status()
        
        assert "state" in status
        assert "config" in status
        assert status["state"]["is_trading_allowed"] is True
    
    def test_reset_daily_stats(self, safety):
        """Test daily stats reset."""
        safety.state.daily_pnl = -30.0
        safety.state.consecutive_losses = 2
        
        safety.reset_daily_stats()
        
        assert safety.state.daily_pnl == 0.0
        assert safety.state.consecutive_losses == 0
    
    def test_database_integration(self, safety_with_db):
        """Test database persistence of safety events."""
        safety_with_db.trigger_circuit_breaker(CircuitBreakerReason.MANUAL, "Test")
        
        # Should have recorded breaker in database
        active = safety_with_db.db.get_active_circuit_breaker()
        assert active is not None
        assert active.reason == "manual"


class TestSafetyControlsIntegration:
    """Integration tests for safety controls."""
    
    @pytest.fixture
    def safety(self):
        """Create safety controls for integration tests."""
        config = SafetyConfig(
            max_consecutive_losses=3,
            max_daily_loss=-50.0,
            fixed_fraction=0.05,
            max_position_percent=0.20,
            max_open_positions=5,
        )
        safety = SafetyControls(config=config)
        safety.initialize(balance=1000.0)
        return safety
    
    def test_full_trading_scenario(self, safety):
        """Test complete trading flow with safety controls."""
        # Initial state
        assert safety.can_trade() is True
        
        # Some winning trades
        for i in range(2):
            safety.record_trade(f"win_{i}", pnl=20.0, position_size=50.0, suggestion_type="test")
        
        assert safety.state.daily_pnl == 40.0
        assert safety.can_trade() is True
        
        # Some losing trades (but not consecutive)
        safety.record_trade("loss_1", pnl=-10.0, position_size=50.0, suggestion_type="test")
        safety.record_trade("win_3", pnl=15.0, position_size=50.0, suggestion_type="test")
        
        assert safety.state.consecutive_losses == 0  # Reset by win
        
        # Now hit consecutive losses
        for i in range(3):
            safety.record_trade(f"loss_{i+2}", pnl=-5.0, position_size=50.0, suggestion_type="test")
        
        # Circuit breaker should trigger
        assert safety.state.consecutive_losses == 3
        assert safety.state.status == SafetyStatus.CIRCUIT_BREAKER
        assert safety.can_trade() is False
    
    def test_position_sizing_with_consecutive_losses(self, safety):
        """Test position sizing doesn't execute if circuit breaker active."""
        # Trigger breaker
        safety.trigger_circuit_breaker(CircuitBreakerReason.MANUAL)
        
        # Should still calculate size, but trades should be blocked
        size = safety.calculate_position_size(confidence=0.8)
        assert size > 0
        
        # But can't actually trade
        assert safety.can_trade() is False
    
    def test_exposure_limits_enforcement(self, safety):
        """Test exposure limits are properly enforced."""
        # Try to open multiple positions
        safety.record_position_opened(100.0)
        safety.record_position_opened(100.0)
        safety.record_position_opened(100.0)
        
        allowed, reason = safety.can_open_position(position_size=100.0)
        assert allowed is True  # 4th position OK
        
        safety.record_position_opened(100.0)
        
        # 5th position is at limit
        allowed, reason = safety.can_open_position(position_size=100.0)
        assert allowed is False  # 6th position blocked


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
