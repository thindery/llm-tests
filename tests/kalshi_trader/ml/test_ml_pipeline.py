"""Tests for Kalshi Trader ML Pipeline.

Run with: pytest tests/kalshi_trader/ml/ -v
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from kalshi_trader.ml import (
    ConfidenceScorer,
    ABTesting,
    MLDatabase,
    SuggestionType,
)


class TestConfidenceScorer:
    """Test confidence scoring functionality."""
    
    @pytest.fixture
    def temp_db(self):
        """Create a temporary database for testing."""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_ml.db"
        db = MLDatabase(db_path)
        db.initialize()
        yield db
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def scorer(self, temp_db):
        """Create a confidence scorer with temp database."""
        scorer = ConfidenceScorer(db=temp_db)
        scorer.initialize()
        return scorer
    
    def test_initial_confidence(self, scorer):
        """Test that initial confidence is 50% with prior."""
        confidence = scorer.get_confidence(SuggestionType.BREAKOUT)
        assert confidence == pytest.approx(0.5, abs=0.01)
    
    def test_confidence_increases_after_win(self, scorer):
        """Test that confidence increases after a winning trade."""
        initial = scorer.get_confidence(SuggestionType.BREAKOUT)
        scorer.update_after_trade(SuggestionType.BREAKOUT, outcome=True, pnl=5.0)
        updated = scorer.get_confidence(SuggestionType.BREAKOUT)
        assert updated > initial
    
    def test_confidence_decreases_after_loss(self, scorer):
        """Test that confidence decreases after a losing trade."""
        initial = scorer.get_confidence(SuggestionType.BREAKOUT)
        scorer.update_after_trade(SuggestionType.BREAKOUT, outcome=False, pnl=-5.0)
        updated = scorer.get_confidence(SuggestionType.BREAKOUT)
        assert updated < initial
    
    def test_detailed_confidence(self, scorer):
        """Test detailed confidence result."""
        result = scorer.get_confidence_detailed(SuggestionType.REVERSION)
        
        assert result.suggestion_type == "reversion"
        assert 0 <= result.confidence <= 1
        assert result.alpha > 0
        assert result.beta > 0
        assert len(result.credible_interval) == 2
        assert result.credible_interval[0] < result.credible_interval[1]
    
    def test_all_confidence(self, scorer):
        """Test getting all confidence scores."""
        all_conf = scorer.get_all_confidence()
        
        assert "reversion" in all_conf
        assert "breakout" in all_conf
        assert "volatility" in all_conf
        
        for conf in all_conf.values():
            assert 0 <= conf <= 1
    
    def test_trade_threshold(self, scorer):
        """Test trade threshold functionality."""
        # With no data, should allow trading
        assert scorer.should_trade(SuggestionType.BREAKOUT, threshold=0.6) is True
        
        # After many losses, confidence should drop
        for _ in range(10):
            scorer.update_after_trade(SuggestionType.BREAKOUT, outcome=False, pnl=-10.0)
        
        # Should still allow (min_samples not met)
        assert scorer.should_trade(SuggestionType.BREAKOUT, threshold=0.6) is False
    
    def test_position_weight(self, scorer):
        """Test position weighting by confidence."""
        weight = scorer.get_position_weight(SuggestionType.BREAKOUT, base_size=100.0)
        
        # With 50% confidence, weight should be around 75%
        assert 70 <= weight <= 80
    
    def test_confidence_str(self, scorer):
        """Test confidence explanation."""
        explanation = scorer.explain_confidence(SuggestionType.VOLATILITY)
        assert "Volatility" in explanation
        assert "Confidence:" in explanation


class TestABTesting:
    """Test A/B testing functionality."""
    
    @pytest.fixture
    def temp_db(self):
        """Create a temporary database for testing."""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_ab.db"
        db = MLDatabase(db_path)
        db.initialize()
        yield db
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def ab(self, temp_db):
        """Create A/B testing instance."""
        ab = ABTesting(db=temp_db)
        ab.initialize()
        return ab
    
    def test_group_assignment_deterministic(self, ab):
        """Test that group assignment is deterministic."""
        group1 = ab.assign_group("user_123", "2026-03-19")
        group2 = ab.assign_group("user_123", "2026-03-19")
        
        assert group1 == group2
        assert group1 in ["control", "treatment"]
    
    def test_roughly_fifty_fifty(self, ab):
        """Test that assignment is roughly 50/50."""
        groups = [ab.assign_group(f"user_{i}", "2026-03-19") for i in range(100)]
        
        control_count = groups.count("control")
        treatment_count = groups.count("treatment")
        
        # Should be roughly equal (within 20%)
        assert abs(control_count - treatment_count) < 20
        assert control_count > 30
        assert treatment_count > 30
    
    def test_same_user_different_dates(self, ab):
        """Test that same user gets different groups on different dates."""
        group1 = ab.assign_group("user_123", "2026-03-19")
        group2 = ab.assign_group("user_123", "2026-03-20")
        
        # Most likely different (but could be same by chance)
        # Just verify both are valid
        assert group1 in ["control", "treatment"]
        assert group2 in ["control", "treatment"]
    
    def test_trade_recording(self, ab):
        """Test trade recording."""
        ab.record_trade_outcome(
            trade_id="test_001",
            user_id="user_123",
            group_assignment="treatment",
            suggestion_type="breakout",
            confidence=0.75,
            entry_price=0.45
        )
        
        trades = ab.db.get_trade_outcomes()
        assert len(trades) == 1
        assert trades[0].trade_id == "test_001"
        assert trades[0].outcome is None  # Not yet completed
    
    def test_trade_completion(self, ab):
        """Test trade completion."""
        # Record initial trade
        ab.record_trade_outcome(
            trade_id="test_002",
            user_id="user_123",
            group_assignment="treatment",
            suggestion_type="breakout",
            confidence=0.75,
            entry_price=0.45
        )
        
        # Complete the trade
        ab.complete_trade("test_002", exit_price=0.52, pnl=7.0)
        
        # Verify outcome
        trades = ab.db.get_trade_outcomes()
        completed = [t for t in trades if t.outcome is not None]
        assert len(completed) == 1
        assert completed[0].pnl == 7.0
        assert completed[0].outcome is True
    
    def test_metrics_calculation(self, ab):
        """Test metrics calculation."""
        # Create some trades
        for i, outcome in enumerate([True, False, True, True]):
            ab.record_trade_outcome(
                trade_id=f"metric_test_{i}",
                user_id="user_123",
                group_assignment="treatment",
                suggestion_type="breakout",
                confidence=0.75,
                entry_price=0.45
            )
            pnl = 5.0 if outcome else -3.0
            ab.complete_trade(f"metric_test_{i}", exit_price=0.52, pnl=pnl)
        
        metrics = ab.get_metrics("treatment")
        
        assert metrics.total_trades == 4
        assert metrics.wins == 3
        assert metrics.losses == 1
        assert metrics.win_rate == pytest.approx(75.0, abs=0.1)
    
    def test_group_comparison(self, ab):
        """Test group comparison."""
        # Create trades for both groups
        for i in range(4):
            group = "control" if i < 2 else "treatment"
            pnl = -2.0 if i < 2 else 5.0
            
            ab.record_trade_outcome(
                trade_id=f"comp_{i}",
                user_id="user_123",
                group_assignment=group,
                suggestion_type="breakout",
                confidence=0.75,
                entry_price=0.45
            )
            ab.complete_trade(f"comp_{i}", exit_price=0.52, pnl=pnl)
        
        result = ab.compare_groups()
        
        assert result.control_metrics.total_trades == 2
        assert result.treatment_metrics.total_trades == 2
        assert result.lift_pct > 0
        assert result.recommendation != ""
    
    def test_balance_check(self, ab):
        """Test balance check functionality."""
        # Check empty
        balance = ab.get_balance_check()
        assert balance["is_balanced"] is True
        
        # Add trades
        for i in range(10):
            group = "control" if i < 5 else "treatment"
            ab.record_trade_outcome(
                trade_id=f"bal_{i}",
                user_id="user_123",
                group_assignment=group,
                suggestion_type="breakout",
                confidence=0.75,
                entry_price=0.45
            )
            ab.complete_trade(f"bal_{i}", exit_price=0.52, pnl=1.0)
        
        balance = ab.get_balance_check()
        assert balance["is_balanced"] is True
        assert balance["control_count"] == 5
        assert balance["treatment_count"] == 5


class TestDatabase:
    """Test database functionality."""
    
    @pytest.fixture
    def temp_db(self):
        """Create a temporary database for testing."""
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_db.db"
        db = MLDatabase(db_path)
        db.initialize()
        yield db
        shutil.rmtree(temp_dir)
    
    def test_confidence_crud(self, temp_db):
        """Test confidence CRUD operations."""
        # Create
        temp_db.update_confidence("reversion", 2.5, 1.5)
        
        # Read
        record = temp_db.get_confidence("reversion")
        assert record.alpha == pytest.approx(2.5)
        assert record.beta == pytest.approx(1.5)
        assert record.confidence == pytest.approx(2.5 / 4.0)
        
        # Update
        temp_db.update_confidence("reversion", 3.0, 2.0)
        record = temp_db.get_confidence("reversion")
        assert record.alpha == pytest.approx(3.0)
        
        # Read all
        all_records = temp_db.get_all_confidence()
        assert len(all_records) >= 1
    
    def test_ab_assignment_crud(self, temp_db):
        """Test A/B assignment CRUD."""
        temp_db.set_ab_assignment("user_123", "2026-03-19", "treatment")
        
        assignment = temp_db.get_ab_assignment("user_123", "2026-03-19")
        assert assignment == "treatment"
        
        # Should return None for unknown
        assignment = temp_db.get_ab_assignment("user_999", "2026-03-19")
        assert assignment is None
    
    def test_trade_outcomes_crud(self, temp_db):
        """Test trade outcome CRUD."""
        temp_db.record_trade_outcome(
            trade_id="trade_001",
            user_id="user_123",
            group_assignment="treatment",
            suggestion_type="breakout",
            confidence=0.75,
            entry_price=0.45
        )
        
        trades = temp_db.get_trade_outcomes()
        assert len(trades) == 1
        assert trades[0].trade_id == "trade_001"
    
    def test_filtering(self, temp_db):
        """Test filtering functionality."""
        # Add trades to different groups
        for group in ["control", "treatment"]:
            temp_db.record_trade_outcome(
                trade_id=f"filter_{group}",
                user_id="user_123",
                group_assignment=group,
                suggestion_type="breakout",
                confidence=0.75,
                entry_price=0.45
            )
            temp_db.complete_trade(f"filter_{group}", exit_price=0.5, pnl=1.0)
        
        control_trades = temp_db.get_trade_outcomes(group_assignment="control")
        assert len(control_trades) == 1
        assert control_trades[0].group_assignment == "control"
    
    def test_suggestion_type_metrics(self, temp_db):
        """Test metrics by suggestion type."""
        # Add trades for different types
        for stype in ["reversion", "breakout"]:
            temp_db.record_trade_outcome(
                trade_id=f"stype_{stype}",
                user_id="user_123",
                group_assignment="treatment",
                suggestion_type=stype,
                confidence=0.75,
                entry_price=0.45
            )
            temp_db.complete_trade(f"stype_{stype}", exit_price=0.5, pnl=1.0)
        
        metrics = temp_db.get_suggestion_type_metrics()
        assert "reversion" in metrics
        assert "breakout" in metrics
    
    def test_ab_metrics(self, temp_db):
        """Test A/B metrics aggregation."""
        # Add trades
        for i, group in enumerate(["control", "control", "treatment", "treatment"]):
            outcome = i % 2 == 0  # Win, Loss, Win, Loss
            pnl = 5.0 if outcome else -2.0
            
            temp_db.record_trade_outcome(
                trade_id=f"abm_{i}",
                user_id="user_123",
                group_assignment=group,
                suggestion_type="breakout",
                confidence=0.75,
                entry_price=0.45
            )
            temp_db.complete_trade(f"abm_{i}", exit_price=0.5, pnl=pnl)
        
        metrics = temp_db.get_ab_metrics()
        assert "control" in metrics
        assert "treatment" in metrics
        assert metrics["control"]["total_trades"] == 2
        assert metrics["treatment"]["total_trades"] == 2
    
    def test_confidence_history(self, temp_db):
        """Test confidence history tracking."""
        # Update confidence multiple times
        for i in range(3):
            temp_db.update_confidence("reversion", 1.0 + i, 1.0)
        
        history = temp_db.get_confidence_history(suggestion_type="reversion")
        assert len(history) >= 3
        
        for record in history:
            assert "confidence" in record
            assert "alpha" in record
            assert "beta" in record
            assert "recorded_at" in record


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
