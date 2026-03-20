"""A/B Testing Framework for Kalshi Trader ML Pipeline.

Provides deterministic group assignment, metrics tracking, and
statistical comparison between control and treatment groups.
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional, List, Dict

import numpy as np
from scipy import stats

from .database import MLDatabase
from .confidence_scorer import ConfidenceScorer, SuggestionType


@dataclass
class ABAssignment:
    """A/B group assignment for a user."""
    user_id: str
    date: str
    group: str  # 'control' or 'treatment'
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ABMetrics:
    """Metrics for an A/B group."""
    group: str
    total_trades: int
    wins: int
    losses: int
    win_rate: float
    total_pnl: float
    avg_pnl: float
    max_pnl: float
    min_pnl: float
    std_pnl: float
    avg_confidence: float
    
    @property
    def sharpe_ratio(self) -> float:
        """Calculate simple Sharpe ratio (assuming risk-free rate = 0)."""
        if self.std_pnl == 0 or self.total_trades == 0:
            return 0.0
        return (self.avg_pnl / self.std_pnl) * np.sqrt(self.total_trades)
        
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "group": self.group,
            "total_trades": self.total_trades,
            "wins": self.wins,
            "losses": self.losses,
            "win_rate": self.win_rate,
            "total_pnl": self.total_pnl,
            "avg_pnl": self.avg_pnl,
            "max_pnl": self.max_pnl,
            "min_pnl": self.min_pnl,
            "std_pnl": self.std_pnl,
            "avg_confidence": self.avg_confidence,
            "sharpe_ratio": self.sharpe_ratio
        }


@dataclass
class ABTestResult:
    """Result of A/B statistical comparison."""
    control_metrics: ABMetrics
    treatment_metrics: ABMetrics
    p_value: float
    t_statistic: float
    is_significant: bool
    lift_pct: float
    recommendation: str
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "control": self.control_metrics.to_dict(),
            "treatment": self.treatment_metrics.to_dict(),
            "p_value": self.p_value,
            "t_statistic": self.t_statistic,
            "is_significant": self.is_significant,
            "lift_pct": self.lift_pct,
            "recommendation": self.recommendation
        }


class ABTesting:
    """A/B Testing Framework for validating strategy improvements.
    
    Provides:
    - Deterministic 50/50 group assignment
    - Metrics tracking per group
    - Statistical comparison (Welch's t-test)
    - Recommendation engine
    
    Groups:
    - **Control:** Uses baseline confidence (or traditional strategy)
    - **Treatment:** Uses updated/ML-enhanced strategy
    
    Parameters
    ----------
    db : MLDatabase
        Database for persistence
    
    Attributes
    ----------
    db : MLDatabase
        Database instance
    
    Example
    -------
    >>> from kalshi_trader.ml import ABTesting
    >>> ab = ABTesting()
    >>> ab.initialize()
    >>>
    >>> # Assign user to A/B group
    >>> group = ab.assign_group("user_123", "2026-03-19")
    >>> print(f"Assigned to: {group}")
    Assigned to: treatment
    >>>
    >>> # Record a trade for A/B analysis
    >>> ab.record_trade_outcome(
    ...     trade_id="trade_001",
    ...     user_id="user_123",
    ...     group_assignment=group,
    ...     suggestion_type="breakout",
    ...     confidence=0.75,
    ...     entry_price=0.45
    ... )
    >>>
    >>> # Complete the trade
    >>> ab.complete_trade(
    ...     trade_id="trade_001",
    ...     exit_price=0.52,
    ...     pnl=7.0
    ... )
    >>>
    >>> # Get metrics comparison
    >>> result = ab.compare_groups()
    >>> print(f"Lift: {result.lift_pct:.1f}%, p-value: {result.p_value:.3f}")
    Lift: 15.2%, p-value: 0.04
    >>> print(result.recommendation)
    Treatment shows significant improvement (p=0.04). Consider rolling out to all users.
    
    Notes
    -----
    Assignment is deterministic - the same user_id and date will always
    produce the same group assignment. This ensures consistency even
    if the user reloads the application.
    """
    
    def __init__(self, db: Optional[MLDatabase] = None):
        self.db = db or MLDatabase()
        
    def initialize(self) -> None:
        """Initialize database tables."""
        self.db.initialize()
        
    def assign_group(self, user_id: str, date_str: Optional[str] = None) -> str:
        """Assign user to A/B group using deterministic hashing.
        
        Parameters
        ----------
        user_id : str
            Unique user identifier
        date_str : str | None
            Date string for assignment (default: today)
            Format: "YYYY-MM-DD"
            
        Returns
        -------
        str
            'control' or 'treatment'
            
        Example
        -------
        >>> ab.assign_group("user_123", "2026-03-19")
        'treatment'
        >>> # Same user, same date - same result
        >>> ab.assign_group("user_123", "2026-03-19")
        'treatment'
        >>> # Same user, different date - potentially different result
        >>> ab.assign_group("user_123", "2026-03-20")
        'control'
        """
        if date_str is None:
            date_str = date.today().isoformat()
            
        # Check if already assigned
        existing = self.db.get_ab_assignment(user_id, date_str)
        if existing:
            return existing
            
        # Deterministic assignment using hash
        hash_input = f"{user_id}:{date_str}"
        hash_val = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        group = "treatment" if hash_val % 2 == 0 else "control"
        
        # Persist assignment
        self.db.set_ab_assignment(user_id, date_str, group)
        
        return group
        
    def get_group_assignment(self, user_id: str, date_str: Optional[str] = None) -> str:
        """Get A/B group assignment for a user.
        
        Creates new assignment if none exists.
        
        Parameters
        ----------
        user_id : str
            Unique user identifier
        date_str : str | None
            Date string (default: today)
            
        Returns
        -------
        str
            'control' or 'treatment'
        """
        return self.assign_group(user_id, date_str)
        
    def record_trade_outcome(
        self,
        trade_id: str,
        user_id: str,
        group_assignment: str,
        suggestion_type: str,
        confidence: float,
        entry_price: float
    ) -> None:
        """Record a new trade for A/B tracking.
        
        Parameters
        ----------
        trade_id : str
            Unique trade identifier
        user_id : str
            User who executed the trade
        group_assignment : str
            'control' or 'treatment'
        suggestion_type : str
            Type of suggestion (reversion, breakout, volatility)
        confidence : float
            Confidence score at time of trade
        entry_price : float
            Entry price (0-1 probability)
        """
        self.db.record_trade_outcome(
            trade_id=trade_id,
            user_id=user_id,
            group_assignment=group_assignment,
            suggestion_type=suggestion_type,
            confidence=confidence,
            entry_price=entry_price
        )
        
    def complete_trade(
        self,
        trade_id: str,
        exit_price: float,
        pnl: float
    ) -> None:
        """Complete a trade and update outcome.
        
        Parameters
        ----------
        trade_id : str
            Trade identifier
        exit_price : float
            Exit price (0-1 probability)
        pnl : float
            Profit/loss amount (can be negative)
        """
        # Get existing trade to determine group
        trades = self.db.get_trade_outcomes(limit=10000)
        trade = next((t for t in trades if t.trade_id == trade_id), None)
        
        if not trade:
            raise ValueError(f"Trade {trade_id} not found")
            
        # Determine outcome
        outcome = pnl > 0
        
        # Update with completion data
        self.db.record_trade_outcome(
            trade_id=trade_id,
            user_id=trade.user_id,
            group_assignment=trade.group_assignment,
            suggestion_type=trade.suggestion_type,
            confidence=trade.confidence,
            entry_price=trade.entry_price,
            exit_price=exit_price,
            pnl=pnl,
            outcome=outcome
        )
        
    def get_metrics(self, group: Optional[str] = None) -> ABMetrics:
        """Get metrics for a specific group or overall.
        
        Parameters
        ----------
        group : str | None
            'control' or 'treatment', or None for overall
            
        Returns
        -------
        ABMetrics
            Metrics object with detailed statistics
        """
        if group:
            trades = self.db.get_trade_outcomes(group_assignment=group)
        else:
            trades = self.db.get_trade_outcomes()
            
        # Filter to completed trades
        completed = [t for t in trades if t.outcome is not None and t.pnl is not None]
        
        if not completed:
            return ABMetrics(
                group=group or "overall",
                total_trades=0,
                wins=0,
                losses=0,
                win_rate=0.0,
                total_pnl=0.0,
                avg_pnl=0.0,
                max_pnl=0.0,
                min_pnl=0.0,
                std_pnl=0.0,
                avg_confidence=0.0
            )
            
        pnls = [t.pnl for t in completed]
        wins = sum(1 for t in completed if t.outcome)
        losses = len(completed) - wins
        
        return ABMetrics(
            group=group or "overall",
            total_trades=len(completed),
            wins=wins,
            losses=losses,
            win_rate=(wins / len(completed) * 100) if completed else 0.0,
            total_pnl=sum(pnls),
            avg_pnl=np.mean(pnls),
            max_pnl=max(pnls),
            min_pnl=min(pnls),
            std_pnl=np.std(pnls) if len(pnls) > 1 else 0.0,
            avg_confidence=np.mean([t.confidence for t in completed])
        )
        
    def compare_groups(self) -> ABTestResult:
        """Compare control and treatment groups statistically.
        
        Uses Welch's t-test for comparing P&L between groups.
        
        Returns
        -------
        ABTestResult
            Statistical comparison results with recommendation
            
        Example
        -------
        >>> result = ab.compare_groups()
        >>> print(f"Control win rate: {result.control_metrics.win_rate:.1f}%")
        >>> print(f"Treatment win rate: {result.treatment_metrics.win_rate:.1f}%")
        >>> print(f"P-value: {result.p_value:.3f}")
        >>> print(result.recommendation)
        """
        control_metrics = self.get_metrics("control")
        treatment_metrics = self.get_metrics("treatment")
        
        # Get raw P&L data for t-test
        control_trades = self.db.get_trade_outcomes(group_assignment="control")
        treatment_trades = self.db.get_trade_outcomes(group_assignment="treatment")
        
        control_pnls = [t.pnl for t in control_trades if t.pnl is not None]
        treatment_pnls = [t.pnl for t in treatment_trades if t.pnl is not None]
        
        if len(control_pnls) < 2 or len(treatment_pnls) < 2:
            # Not enough samples for statistical test
            return ABTestResult(
                control_metrics=control_metrics,
                treatment_metrics=treatment_metrics,
                p_value=1.0,
                t_statistic=0.0,
                is_significant=False,
                lift_pct=0.0,
                recommendation="Insufficient data. Need at least 2 trades per group."
            )
            
        # Welch's t-test (doesn't assume equal variance)
        t_stat, p_value = stats.ttest_ind(treatment_pnls, control_pnls, equal_var=False)
        
        # Calculate lift
        if control_metrics.avg_pnl != 0:
            lift_pct = ((treatment_metrics.avg_pnl - control_metrics.avg_pnl) / 
                       abs(control_metrics.avg_pnl) * 100)
        else:
            lift_pct = 0.0 if treatment_metrics.avg_pnl == 0 else float('inf')
            
        # Determine significance and recommendation
        is_significant = p_value < 0.05
        
        if is_significant and lift_pct > 0:
            recommendation = (
                f"Treatment shows significant improvement (p={p_value:.3f}, "
                f"lift={lift_pct:.1f}%). Consider rolling out to all users."
            )
        elif is_significant and lift_pct < 0:
            recommendation = (
                f"Control performs significantly better (p={p_value:.3f}, "
                f"lift={lift_pct:.1f}%). Do not roll out treatment."
            )
        elif not is_significant:
            recommendation = (
                f"No significant difference detected (p={p_value:.3f}). "
                f"Continue testing to collect more data."
            )
        else:
            recommendation = "Equal performance between groups."
            
        return ABTestResult(
            control_metrics=control_metrics,
            treatment_metrics=treatment_metrics,
            p_value=p_value,
            t_statistic=t_stat,
            is_significant=is_significant,
            lift_pct=lift_pct,
            recommendation=recommendation
        )
        
    def get_balance_check(self) -> Dict[str, any]:
        """Check if groups are balanced.
        
        Returns
        -------
        dict
            Balance statistics
        """
        control = self.db.get_trade_outcomes(group_assignment="control")
        treatment = self.db.get_trade_outcomes(group_assignment="treatment")
        
        control_count = len([t for t in control if t.outcome is not None])
        treatment_count = len([t for t in treatment if t.outcome is not None])
        total = control_count + treatment_count
        
        if total == 0:
            return {
                "is_balanced": True,
                "balance_ratio": 0.5,
                "control_pct": 50.0,
                "treatment_pct": 50.0,
                "recommendation": "No data yet"
            }
            
        control_pct = (control_count / total * 100) if total > 0 else 0
        treatment_pct = (treatment_count / total * 100) if total > 0 else 0
        
        # Check if within 10% of 50/50
        is_balanced = abs(control_pct - 50) < 10
        
        return {
            "is_balanced": is_balanced,
            "balance_ratio": control_count / total if total > 0 else 0.5,
            "control_pct": control_pct,
            "treatment_pct": treatment_pct,
            "control_count": control_count,
            "treatment_count": treatment_count,
            "recommendation": (
                "Groups are balanced" if is_balanced else 
                "Warning: Groups are unbalanced. Check assignment."
            )
        }
        
    def reset_test(self, confirm: bool = False) -> None:
        """Reset A/B test data (use with caution).
        
        Parameters
        ----------
        confirm : bool
            Must be True to actually reset
        """
        if not confirm:
            raise ValueError("Set confirm=True to actually reset the test")
            
        # Get connection and clear trade outcomes
        conn = self.db._get_connection()
        conn.execute("DELETE FROM trade_outcomes")
        conn.execute("DELETE FROM ab_assignments")
        conn.commit()
        
    def export_results(self, filepath: str) -> None:
        """Export A/B test results to JSON file.
        
        Parameters
        ----------
        filepath : str
            Path to output JSON file
        """
        import json
        
        result = self.compare_groups()
        balance = self.get_balance_check()
        
        export_data = {
            "comparison": result.to_dict(),
            "balance": balance,
            "export_timestamp": datetime.now().isoformat()
        }
        
        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2)
