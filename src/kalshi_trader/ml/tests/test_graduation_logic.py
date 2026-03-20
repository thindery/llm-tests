"""Tests for Graduation Logic module.

Tests promotion/demotion logic between shadow and live trading modes.
"""

import pytest
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from kalshi_trader.ml.graduation_logic import (
    GraduationLogic,
    GraduationThresholds,
    StrategyMode,
    GraduationDirection,
    StrategyPerformance,
    create_graduation_logic,
)
from kalshi_trader.ml.confidence_scorer import SuggestionType
from kalshi_trader.ml.database import MLDatabase


class TestGraduationThresholds:
    """Test GraduationThresholds configuration."""
    
    def test_default_thresholds(self):
        """Test default threshold values."""
        thresholds = GraduationThresholds()
        
        # Promotion thresholds
        assert thresholds.min_trades_promotion == 100
        assert thresholds.min_win_rate_promotion == 0.55
        assert thresholds.min_profit_promotion == 10.0
        
        # Demotion thresholds
        assert thresholds.min_trades_demotion == 50
        assert thresholds.max_win_rate_demotion == 0.45
        assert thresholds.max_loss_demotion == -100.0
    
    def test_custom_thresholds(self):
        """Test custom threshold values."""
        thresholds = GraduationThresholds(
            min_trades_promotion=50,
            min_win_rate_promotion=0.60,
            max_loss_demotion=-200.0,
        )
        
        assert thresholds.min_trades_promotion == 50
        assert thresholds.min_win_rate_promotion == 0.60
        assert thresholds.max_loss_demotion == -200.0
    
    def test_thresholds_serialization(self):
        """Test thresholds serialization."""
        thresholds = GraduationThresholds(min_trades_promotion=75)
        data = thresholds.to_dict()
        restored = GraduationThresholds.from_dict(data)
        
        assert restored.min_trades_promotion == 75
        assert restored.min_win_rate_promotion == thresholds.min_win_rate_promotion


class TestStrategyPerformance:
    """Test StrategyPerformance dataclass."""
    
    def test_default_performance(self):
        """Test default performance values."""
        perf = StrategyPerformance(
            suggestion_type="breakout",
            mode=StrategyMode.SHADOW,
        )
        
        assert perf.suggestion_type == "breakout"
        assert perf.mode == StrategyMode.SHADOW
        assert perf.total_trades == 0
        assert perf.total_pnl == 0.0
        assert perf.win_rate == 0.0
    
    def test_performance_to_dict(self):
        """Test performance serialization."""
        perf = StrategyPerformance(
            suggestion_type="breakout",
            mode=StrategyMode.LIVE,
            total_trades=100,
            wins=60,
            total_pnl=500.0,
            win_rate=0.60,
        )
        
        data = perf.to_dict()
        
        assert data['suggestion_type'] == "breakout"
        assert data['mode'] == "live"
        assert data['total_trades'] == 100
        assert data['win_rate'] == 0.60


class TestGraduationLogic:
    """Test GraduationLogic functionality."""
    
    @pytest.fixture
    def graduation(self):
        """Create fresh graduation logic for each test."""
        thresholds = GraduationThresholds()
        grad = GraduationLogic(thresholds=thresholds)
        grad.initialize()
        return grad
    
    @pytest.fixture
    def graduation_with_db(self):
        """Create graduation logic with database."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            db = MLDatabase(str(db_path))
            db.initialize()
            
            thresholds = GraduationThresholds()
            grad = GraduationLogic(db=db, thresholds=thresholds)
            grad.initialize()
            yield grad
    
    def test_initialization(self, graduation):
        """Test that graduation logic initializes correctly."""
        assert graduation._initialized is True
        
        # All strategies should start in SHADOW mode
        for stype in SuggestionType:
            mode = graduation.get_strategy_mode(stype)
            assert mode == StrategyMode.SHADOW
    
    def test_get_strategy_mode_unknown(self, graduation):
        """Test getting mode for unknown strategy returns SHADOW."""
        mode = graduation.get_strategy_mode("unknown_strategy")
        assert mode == StrategyMode.SHADOW
    
    def test_record_trade_updates_performance(self, graduation):
        """Test that recording trades updates performance."""
        result = graduation.record_trade(SuggestionType.BREAKOUT, pnl=50.0)
        
        assert result['total_trades'] == 1
        assert result['wins'] == 1
        assert result['total_pnl'] == 50.0
        assert result['win_rate'] == 1.0
    
    def test_record_trade_updates_losses(self, graduation):
        """Test loss recording."""
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-30.0)
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.total_trades == 1
        assert perf.wins == 0
        assert perf.losses == 1
        assert perf.total_pnl == -30.0
    
    def test_record_multiple_trades(self, graduation):
        """Test recording multiple trades."""
        trades = [50.0, -20.0, 30.0, -10.0, 40.0]
        
        for i, pnl in enumerate(trades):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=pnl, trade_id=f"trade_{i}")
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.total_trades == 5
        assert perf.wins == 3
        assert perf.losses == 2
        assert perf.total_pnl == 90.0
        assert perf.win_rate == 0.60
    
    def test_win_rate_calculation(self, graduation):
        """Test win rate calculation."""
        # 4 wins, 2 losses
        for i in range(4):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"win_{i}")
        for i in range(2):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0, trade_id=f"loss_{i}")
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.win_rate == pytest.approx(4/6, rel=0.01)
    
    def test_average_win_loss_calculation(self, graduation):
        """Test average win/loss calculation."""
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=50.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=30.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-20.0)
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.avg_win_amount == pytest.approx(40.0, rel=0.01)
        assert perf.avg_loss_amount == pytest.approx(20.0, rel=0.01)
    
    def test_profit_factor_calculation(self, graduation):
        """Test profit factor calculation."""
        # Total wins: 100 + 50 = 150
        # Total losses: 30 + 20 = 50
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=100.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=50.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-30.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-20.0)
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.profit_factor == pytest.approx(150.0 / 50.0, rel=0.01)
    
    def test_evaluate_promotion_not_enough_trades(self, graduation):
        """Test promotion fails with insufficient trades."""
        # Only 50 trades, need 100
        for i in range(50):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"trade_{i}")
        
        result = graduation.evaluate_promotion(SuggestionType.BREAKOUT)
        
        assert result['should_promote'] is False
        assert result['checks']['min_trades']['passed'] is False
    
    def test_evaluate_promotion_not_enough_win_rate(self, graduation):
        """Test promotion fails with insufficient win rate."""
        # 100 trades but only 50% win rate (need 55%)
        for i in range(50):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"win_{i}")
        for i in range(50):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0, trade_id=f"loss_{i}")
        
        result = graduation.evaluate_promotion(SuggestionType.BREAKOUT)
        
        assert result['should_promote'] is False
        assert result['checks']['min_win_rate']['passed'] is False
    
    def test_evaluate_promotion_not_enough_profit(self, graduation):
        """Test promotion fails with insufficient profit."""
        # 100 trades with 60% win rate but small profits
        for i in range(60):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=0.1, trade_id=f"win_{i}")  # Small wins
        for i in range(40):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-0.05, trade_id=f"loss_{i}")  # Small losses
        
        # Total PnL might not meet threshold
        result = graduation.evaluate_promotion(SuggestionType.BREAKOUT)
        
        assert result['should_promote'] is False or result['checks']['min_profit']['passed'] is False
    
    def test_evaluate_promotion_success(self, graduation):
        """Test successful promotion evaluation."""
        # 100 trades with 60% win rate and positive PnL
        for i in range(60):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=20.0, trade_id=f"win_{i}")
        for i in range(40):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0, trade_id=f"loss_{i}")
        
        result = graduation.evaluate_promotion(SuggestionType.BREAKOUT)
        
        assert result['should_promote'] is True
        assert result['checks']['min_trades']['passed'] is True
        assert result['checks']['min_win_rate']['passed'] is True
        assert result['checks']['min_profit']['passed'] is True
    
    def test_promote_to_live_success(self, graduation):
        """Test promoting strategy to live."""
        # First add enough trades
        for i in range(100):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"trade_{i}")
        
        event = graduation.promote_to_live(SuggestionType.BREAKOUT, reason="Test promotion")
        
        assert event is not None
        assert event.direction == GraduationDirection.PROMOTION
        assert event.from_mode == StrategyMode.SHADOW
        assert event.to_mode == StrategyMode.LIVE
        assert graduation.is_live(SuggestionType.BREAKOUT) is True
    
    def test_promote_to_live_already_live(self, graduation):
        """Test promoting already live strategy returns None."""
        # Set to live mode
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        event = graduation.promote_to_live(SuggestionType.BREAKOUT)
        
        assert event is None
    
    def test_promote_to_live_no_data(self, graduation):
        """Test promoting strategy with no data returns None."""
        event = graduation.promote_to_live("unknown_strategy")
        
        assert event is None
    
    def test_evaluate_demotion_low_win_rate(self, graduation):
        """Test demotion due to low win rate."""
        # Set to live mode first
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        # Add 50 trades with 40% win rate (below 45% threshold)
        for i in range(20):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"win_{i}")
        for i in range(30):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0, trade_id=f"loss_{i}")
        
        result = graduation.evaluate_demotion(SuggestionType.BREAKOUT)
        
        assert result['should_demote'] is True
        assert result['checks']['low_win_rate']['triggered'] is True
    
    def test_evaluate_demotion_high_loss(self, graduation):
        """Test demotion due to cumulative loss."""
        # Set to live mode
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        # Add trades resulting in -$150 loss (below -$100 threshold)
        for i in range(50):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-3.0, trade_id=f"trade_{i}")
        
        result = graduation.evaluate_demotion(SuggestionType.BREAKOUT)
        
        assert result['should_demote'] is True
        assert result['checks']['high_loss']['triggered'] is True
    
    def test_evaluate_demotion_not_enough_trades(self, graduation):
        """Test demotion not triggered with insufficient trades."""
        # Set to live mode
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        # Only 40 trades with terrible performance
        for i in range(10):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=1.0, trade_id=f"win_{i}")
        for i in range(30):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0, trade_id=f"loss_{i}")
        
        result = graduation.evaluate_demotion(SuggestionType.BREAKOUT)
        
        assert result['should_demote'] is False
        assert result['checks']['min_trades_met']['triggered'] is False
    
    def test_demote_to_shadow_success(self, graduation):
        """Test demoting strategy to shadow."""
        # Set to live mode
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        event = graduation.demote_to_shadow(SuggestionType.BREAKOUT, reason="Test demotion")
        
        assert event is not None
        assert event.direction == GraduationDirection.DEMOTION
        assert event.from_mode == StrategyMode.LIVE
        assert event.to_mode == StrategyMode.SHADOW
        assert graduation.is_live(SuggestionType.BREAKOUT) is False
    
    def test_demote_to_shadow_already_shadow(self, graduation):
        """Test demoting already shadow strategy returns None."""
        event = graduation.demote_to_shadow(SuggestionType.BREAKOUT)
        
        assert event is None
    
    def test_auto_graduate_promotion(self, graduation):
        """Test auto-graduation promotes strategy."""
        # Add sufficient trades for promotion
        for i in range(100):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=15.0, trade_id=f"trade_{i}")
        
        event = graduation.auto_graduate(SuggestionType.BREAKOUT)
        
        assert event is not None
        assert event.direction == GraduationDirection.PROMOTION
        assert graduation.is_live(SuggestionType.BREAKOUT) is True
    
    def test_auto_graduate_demotion(self, graduation):
        """Test auto-graduation demotes strategy."""
        # Set to live mode
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        # Add terrible performance
        for i in range(50):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-5.0, trade_id=f"trade_{i}")
        
        event = graduation.auto_graduate(SuggestionType.BREAKOUT)
        
        assert event is not None
        assert event.direction == GraduationDirection.DEMOTION
        assert graduation.is_live(SuggestionType.BREAKOUT) is False
    
    def test_auto_graduate_maintain(self, graduation):
        """Test auto-graduation maintains current mode when criteria not met."""
        # Add some trades but not enough for promotion
        for i in range(50):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=20.0, trade_id=f"trade_{i}")
        
        event = graduation.auto_graduate(SuggestionType.BREAKOUT)
        
        assert event is None  # No graduation occurred
        assert graduation.is_live(SuggestionType.BREAKOUT) is False
    
    def test_get_strategy_status(self, graduation):
        """Test getting strategy status."""
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=50.0)
        
        status = graduation.get_strategy_status(SuggestionType.BREAKOUT)
        
        assert status['suggestion_type'] == "breakout"
        assert status['mode'] == "shadow"
        assert status['performance'] is not None
        assert isinstance(status['ready_for_promotion'], bool)
    
    def test_get_all_strategy_statuses(self, graduation):
        """Test getting all strategy statuses."""
        statuses = graduation.get_all_strategy_statuses()
        
        assert len(statuses) == len(SuggestionType)
        
        for status in statuses:
            assert 'suggestion_type' in status
            assert 'mode' in status
    
    def test_reset_strategy(self, graduation):
        """Test resetting strategy performance."""
        # Add some trades
        for i in range(10):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"trade_{i}")
        
        # Reset
        graduation.reset_strategy(SuggestionType.BREAKOUT, keep_mode=False)
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.total_trades == 0
        assert perf.total_pnl == 0.0
        assert perf.mode == StrategyMode.SHADOW
    
    def test_reset_strategy_keep_mode(self, graduation):
        """Test resetting strategy while keeping mode."""
        # Set to live
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        # Add trades
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=50.0)
        
        # Reset keeping mode
        graduation.reset_strategy(SuggestionType.BREAKOUT, keep_mode=True)
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.total_trades == 0
        assert perf.mode == StrategyMode.LIVE
    
    def test_database_integration(self, graduation_with_db):
        """Test database persistence of graduation events."""
        # Promote a strategy
        for i in range(100):
            graduation_with_db.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"trade_{i}")
        
        event = graduation_with_db.promote_to_live(SuggestionType.BREAKOUT)
        
        # Should be persisted in database
        history = graduation_with_db.get_graduation_history(limit=10)
        assert len(history) >= 1
        assert history[0].event_id == event.event_id
    
    def test_graduation_count_tracking(self, graduation):
        """Test that graduation count is tracked."""
        # Add trades
        for i in range(100):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0, trade_id=f"trade_{i}")
        
        # Promote
        graduation.promote_to_live(SuggestionType.BREAKOUT)
        
        # Demote
        for j in range(50):
            graduation.record_trade(SuggestionType.BREAKOUT, pnl=-5.0, trade_id=f"trade_{100+j}")
        graduation.demote_to_shadow(SuggestionType.BREAKOUT)
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.graduation_count == 2


class TestGraduationLogicEdgeCases:
    """Edge case tests for graduation logic."""
    
    @pytest.fixture
    def graduation(self):
        """Create graduation logic for edge case tests."""
        thresholds = GraduationThresholds(
            min_trades_promotion=2,  # Lower for testing
            min_win_rate_promotion=0.50,
            min_profit_promotion=0.0,
            min_trades_demotion=2,
            max_win_rate_demotion=0.40,
            max_loss_demotion=-10.0,
        )
        grad = GraduationLogic(thresholds=thresholds)
        grad.initialize()
        return grad
    
    def test_exact_threshold_promotion(self, graduation):
        """Test promotion at exact threshold."""
        # Exactly 2 trades (min_trades_promotion), 50% win rate, profit = 0
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0)
        
        result = graduation.evaluate_promotion(SuggestionType.BREAKOUT)
        
        # Should promote since we're at or above thresholds
        assert result['should_promote'] is True
    
    def test_exact_threshold_demotion(self, graduation):
        """Test demotion at exact threshold."""
        # Set live mode
        graduation._performance_cache[SuggestionType.BREAKOUT.value].mode = StrategyMode.LIVE
        
        # Exactly -$10 loss
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=0.0)
        
        result = graduation.evaluate_demotion(SuggestionType.BREAKOUT)
        
        # Should demote since loss meets threshold
        assert result['should_demote'] is True
    
    def test_promotion_then_demotion_cycle(self, graduation):
        """Test promote-then-demote cycle."""
        # Promote
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=20.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=10.0)
        graduation.promote_to_live(SuggestionType.BREAKOUT)
        
        assert graduation.is_live(SuggestionType.BREAKOUT) is True
        
        # Demote
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-20.0)
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=-10.0)
        graduation.demote_to_shadow(SuggestionType.BREAKOUT)
        
        assert graduation.is_live(SuggestionType.BREAKOUT) is False
    
    def test_zero_pnl_trades(self, graduation):
        """Test trades with exactly zero PnL."""
        graduation.record_trade(SuggestionType.BREAKOUT, pnl=0.0)
        
        perf = graduation._performance_cache[SuggestionType.BREAKOUT.value]
        assert perf.total_trades == 1
        assert perf.total_pnl == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
