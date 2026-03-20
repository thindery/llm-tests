"""Graduation Logic for ML Pipeline.

Manages promotion/demotion of strategies between shadow and live trading.
Tracks performance metrics and automatically transitions strategies based
on defined thresholds.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Dict, List, Optional, Any, Callable

from .database import MLDatabase
from .confidence_scorer import SuggestionType

logger = logging.getLogger(__name__)


class StrategyMode(Enum):
    """Trading mode for a strategy."""
    SHADOW = "shadow"    # Paper trading / simulation
    LIVE = "live"        # Real money trading
    PAUSED = "paused"    # Temporarily paused
    ARCHIVED = "archived"  # No longer active


class GraduationDirection(Enum):
    """Direction of graduation transition."""
    PROMOTION = "promotion"    # Shadow -> Live
    DEMOTION = "demotion"      # Live -> Shadow
    MAINTAIN = "maintain"      # No change


@dataclass
class GraduationThresholds:
    """Thresholds for strategy graduation decisions.
    
    Parameters
    ----------
    min_trades_promotion : int
        Minimum trades required for promotion consideration
    min_win_rate_promotion : float
        Minimum win rate for promotion (0.0-1.0)
    min_profit_promotion : float
        Minimum cumulative profit for promotion
    min_trades_demotion : int
        Minimum trades before demotion can occur
    max_win_rate_demotion : float
        Win rate below which demotion occurs
    max_loss_demotion : float
        Cumulative loss threshold for demotion (negative)
    """
    min_trades_promotion: int = 100
    min_win_rate_promotion: float = 0.55
    min_profit_promotion: float = 10.0
    
    min_trades_demotion: int = 50
    max_win_rate_demotion: float = 0.45
    max_loss_demotion: float = -100.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GraduationThresholds":
        """Create from dictionary."""
        return cls(**data)


@dataclass
class StrategyPerformance:
    """Performance metrics for a strategy."""
    suggestion_type: str
    mode: StrategyMode
    total_trades: int = 0
    wins: int = 0
    losses: int = 0
    total_pnl: float = 0.0
    avg_pnl: float = 0.0
    win_rate: float = 0.0
    avg_win_amount: float = 0.0
    avg_loss_amount: float = 0.0
    max_drawdown: float = 0.0
    profit_factor: float = 0.0
    sharpe_ratio: float = 0.0
    first_trade_at: Optional[datetime] = None
    last_trade_at: Optional[datetime] = None
    mode_since: datetime = field(default_factory=datetime.now)
    graduation_count: int = 0  # Number of times promoted/demoted
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'suggestion_type': self.suggestion_type,
            'mode': self.mode.value,
            'total_trades': self.total_trades,
            'wins': self.wins,
            'losses': self.losses,
            'total_pnl': self.total_pnl,
            'avg_pnl': self.avg_pnl,
            'win_rate': self.win_rate,
            'avg_win_amount': self.avg_win_amount,
            'avg_loss_amount': self.avg_loss_amount,
            'max_drawdown': self.max_drawdown,
            'profit_factor': self.profit_factor,
            'sharpe_ratio': self.sharpe_ratio,
            'first_trade_at': self.first_trade_at.isoformat() if self.first_trade_at else None,
            'last_trade_at': self.last_trade_at.isoformat() if self.last_trade_at else None,
            'mode_since': self.mode_since.isoformat(),
            'graduation_count': self.graduation_count,
        }


@dataclass
class GraduationEvent:
    """Record of a graduation event."""
    event_id: str
    suggestion_type: str
    direction: GraduationDirection
    from_mode: StrategyMode
    to_mode: StrategyMode
    triggered_at: datetime
    reason: str
    performance_at_transition: Dict[str, Any] = field(default_factory=dict)
    threshold_triggered: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'event_id': self.event_id,
            'suggestion_type': self.suggestion_type,
            'direction': self.direction.value,
            'from_mode': self.from_mode.value,
            'to_mode': self.to_mode.value,
            'triggered_at': self.triggered_at.isoformat(),
            'reason': self.reason,
            'performance_at_transition': self.performance_at_transition,
            'threshold_triggered': self.threshold_triggered,
        }


class GraduationLogic:
    """Manages strategy graduation between shadow and live trading.
    
    Tracks strategy performance and automatically promotes strategies
    from shadow to live when they meet quality thresholds, or demotes
    them if performance degrades.
    
    Parameters
    ----------
    db : MLDatabase | None
        Database for persisting graduation events
    thresholds : GraduationThresholds | None
        Thresholds for promotion/demotion
    
    Example
    -------
    >>> from kalshi_trader.ml import GraduationLogic, SuggestionType
    >>> grad = GraduationLogic()
    >>> grad.initialize()
    >>>
    >>> # Record trade outcomes
    >>> grad.record_trade(SuggestionType.BREAKOUT, pnl=15.0)
    >>>
    >>> # Check if strategy should be promoted
    >>> result = grad.evaluate_promotion(SuggestionType.BREAKOUT)
    >>> if result.should_promote:
    ...     grad.promote_to_live(SuggestionType.BREAKOUT)
    >>>
    >>> # Get all strategy statuses
    >>> statuses = grad.get_all_strategy_statuses()
    """
    
    def __init__(
        self,
        db: Optional[MLDatabase] = None,
        thresholds: Optional[GraduationThresholds] = None,
    ):
        self.db = db
        self.thresholds = thresholds or GraduationThresholds()
        self._performance_cache: Dict[str, StrategyPerformance] = {}
        self._initialized = False
    
    def initialize(self) -> None:
        """Initialize graduation logic and load current states."""
        if self.db:
            self.db.initialize()
            self._load_strategy_states()
        
        self._initialized = True
        logger.info("Graduation logic initialized")
    
    def _load_strategy_states(self) -> None:
        """Load current strategy states from database."""
        if not self.db:
            return
        
        for stype in SuggestionType:
            performance = self.db.get_strategy_performance(stype.value)
            if performance:
                self._performance_cache[stype.value] = performance
            else:
                # Initialize new strategy in SHADOW mode
                self._performance_cache[stype.value] = StrategyPerformance(
                    suggestion_type=stype.value,
                    mode=StrategyMode.SHADOW,
                )
                self._save_strategy_state(stype.value)
    
    def _save_strategy_state(self, suggestion_type: str) -> None:
        """Save strategy state to database."""
        if not self.db or suggestion_type not in self._performance_cache:
            return
        
        self.db.save_strategy_performance(self._performance_cache[suggestion_type])
    
    def get_strategy_mode(self, suggestion_type: SuggestionType) -> StrategyMode:
        """Get current mode for a strategy.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy type
            
        Returns
        -------
        StrategyMode
            Current trading mode
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if stype_str not in self._performance_cache:
            self._performance_cache[stype_str] = StrategyPerformance(
                suggestion_type=stype_str,
                mode=StrategyMode.SHADOW,
            )
        
        return self._performance_cache[stype_str].mode
    
    def is_live(self, suggestion_type: SuggestionType) -> bool:
        """Check if strategy is currently in live mode.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy type
            
        Returns
        -------
        bool
            True if in live mode
        """
        return self.get_strategy_mode(suggestion_type) == StrategyMode.LIVE
    
    def record_trade(
        self,
        suggestion_type: SuggestionType,
        pnl: float,
        trade_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record a trade outcome for a strategy.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy type
        pnl : float
            Profit/loss from trade
        trade_id : str | None
            Trade identifier
            
        Returns
        -------
        dict
            Updated performance metrics
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        # Get or create performance record
        if stype_str not in self._performance_cache:
            self._performance_cache[stype_str] = StrategyPerformance(
                suggestion_type=stype_str,
                mode=StrategyMode.SHADOW,
            )
        
        perf = self._performance_cache[stype_str]
        
        # Update trade count
        perf.total_trades += 1
        
        # Update win/loss
        if pnl > 0:
            perf.wins += 1
            perf.avg_win_amount = ((perf.avg_win_amount * (perf.wins - 1)) + pnl) / perf.wins if perf.wins > 1 else pnl
        else:
            perf.losses += 1
            perf.avg_loss_amount = ((perf.avg_loss_amount * (perf.losses - 1)) + abs(pnl)) / perf.losses if perf.losses > 1 else abs(pnl)
        
        # Update P&L
        perf.total_pnl += pnl
        perf.avg_pnl = perf.total_pnl / perf.total_trades
        
        # Update win rate
        perf.win_rate = perf.wins / perf.total_trades if perf.total_trades > 0 else 0.0
        
        # Update profit factor
        total_wins = perf.wins * perf.avg_win_amount if perf.wins > 0 else 0
        total_losses = perf.losses * perf.avg_loss_amount if perf.losses > 0 else 0
        perf.profit_factor = total_wins / total_losses if total_losses > 0 else float('inf')
        
        # Update timestamps
        now = datetime.now()
        if perf.first_trade_at is None:
            perf.first_trade_at = now
        perf.last_trade_at = now
        
        # Update max drawdown (simplified)
        if pnl < 0:
            perf.max_drawdown = min(perf.max_drawdown, pnl)
        
        # Save to database
        self._save_strategy_state(stype_str)
        
        # Log
        logger.info(
            f"Trade recorded for {stype_str}: PnL=${pnl:.2f}, "
            f"Win rate: {perf.win_rate:.1%}, Total PnL: ${perf.total_pnl:.2f}"
        )
        
        return perf.to_dict()
    
    def evaluate_promotion(self, suggestion_type: SuggestionType) -> Dict[str, Any]:
        """Evaluate if strategy should be promoted to live trading.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to evaluate
            
        Returns
        -------
        dict
            Evaluation result with recommendation
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if stype_str not in self._performance_cache:
            return {
                'should_promote': False,
                'reason': 'No performance data available',
                'metrics': {},
            }
        
        perf = self._performance_cache[stype_str]
        
        # Already in live mode
        if perf.mode == StrategyMode.LIVE:
            return {
                'should_promote': False,
                'reason': 'Strategy already in live mode',
                'metrics': perf.to_dict(),
            }
        
        # Check promotion criteria
        checks = {
            'min_trades': perf.total_trades >= self.thresholds.min_trades_promotion,
            'min_win_rate': perf.win_rate >= self.thresholds.min_win_rate_promotion,
            'min_profit': perf.total_pnl >= self.thresholds.min_profit_promotion,
        }
        
        all_passed = all(checks.values())
        
        result = {
            'should_promote': all_passed,
            'reason': 'All promotion criteria met' if all_passed else 'Criteria not met',
            'metrics': perf.to_dict(),
            'checks': {
                k: {
                    'passed': v,
                    'required': getattr(self.thresholds, f'min_{k}' if k != 'min_trades' else 'min_trades_promotion'),
                    'actual': getattr(perf, k if k == 'total_trades' else 'win_rate' if k == 'min_win_rate' else 'total_pnl'),
                }
                for k, v in checks.items()
            },
        }
        
        return result
    
    def evaluate_demotion(self, suggestion_type: SuggestionType) -> Dict[str, Any]:
        """Evaluate if strategy should be demoted to shadow trading.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to evaluate
            
        Returns
        -------
        dict
            Evaluation result with recommendation
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if stype_str not in self._performance_cache:
            return {
                'should_demote': False,
                'reason': 'No performance data available',
                'metrics': {},
            }
        
        perf = self._performance_cache[stype_str]
        
        # Already in shadow mode
        if perf.mode != StrategyMode.LIVE:
            return {
                'should_demote': False,
                'reason': f'Strategy not in live mode (currently: {perf.mode.value})',
                'metrics': perf.to_dict(),
            }
        
        # Check demotion criteria
        checks = {
            'min_trades_met': perf.total_trades >= self.thresholds.min_trades_demotion,
            'low_win_rate': perf.win_rate < self.thresholds.max_win_rate_demotion,
            'high_loss': perf.total_pnl <= self.thresholds.max_loss_demotion,
        }
        
        # Demotion requires min trades AND (low win rate OR high loss)
        should_demote = checks['min_trades_met'] and (checks['low_win_rate'] or checks['high_loss'])
        
        result = {
            'should_demote': should_demote,
            'reason': 'Demotion criteria met' if should_demote else 'Criteria not met',
            'metrics': perf.to_dict(),
            'checks': {
                k: {
                    'triggered': v,
                    'threshold': getattr(self.thresholds, f'max_{k.replace("low_", "").replace("high_", "").replace("_met", "")}' if k != 'min_trades_met' else 'min_trades_demotion'),
                    'actual': perf.win_rate if 'win_rate' in k else perf.total_pnl if 'loss' in k else perf.total_trades,
                }
                for k, v in checks.items()
            },
        }
        
        return result
    
    def promote_to_live(
        self,
        suggestion_type: SuggestionType,
        reason: Optional[str] = None,
    ) -> Optional[GraduationEvent]:
        """Promote strategy from shadow to live trading.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to promote
        reason : str | None
            Reason for promotion
            
        Returns
        -------
        GraduationEvent | None
            Event record if promotion occurred, None otherwise
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if stype_str not in self._performance_cache:
            logger.warning(f"Cannot promote {stype_str}: no performance data")
            return None
        
        perf = self._performance_cache[stype_str]
        
        if perf.mode == StrategyMode.LIVE:
            logger.info(f"Strategy {stype_str} already in live mode")
            return None
        
        old_mode = perf.mode
        perf.mode = StrategyMode.LIVE
        perf.mode_since = datetime.now()
        perf.graduation_count += 1
        
        event = GraduationEvent(
            event_id=f"grad_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{stype_str}",
            suggestion_type=stype_str,
            direction=GraduationDirection.PROMOTION,
            from_mode=old_mode,
            to_mode=StrategyMode.LIVE,
            triggered_at=datetime.now(),
            reason=reason or "Automatic promotion based on performance thresholds",
            performance_at_transition=perf.to_dict(),
            threshold_triggered="promotion",
        )
        
        # Save to database
        if self.db:
            self.db.record_graduation_event(event)
        
        self._save_strategy_state(stype_str)
        
        logger.info(
            f"Strategy {stype_str} PROMOTED to LIVE trading. "
            f"Win rate: {perf.win_rate:.1%}, Total PnL: ${perf.total_pnl:.2f}"
        )
        
        return event
    
    def demote_to_shadow(
        self,
        suggestion_type: SuggestionType,
        reason: Optional[str] = None,
    ) -> Optional[GraduationEvent]:
        """Demote strategy from live to shadow trading.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to demote
        reason : str | None
            Reason for demotion
            
        Returns
        -------
        GraduationEvent | None
            Event record if demotion occurred, None otherwise
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if stype_str not in self._performance_cache:
            logger.warning(f"Cannot demote {stype_str}: no performance data")
            return None
        
        perf = self._performance_cache[stype_str]
        
        if perf.mode != StrategyMode.LIVE:
            logger.info(f"Strategy {stype_str} not in live mode (currently: {perf.mode.value})")
            return None
        
        old_mode = perf.mode
        perf.mode = StrategyMode.SHADOW
        perf.mode_since = datetime.now()
        perf.graduation_count += 1
        
        event = GraduationEvent(
            event_id=f"grad_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{stype_str}",
            suggestion_type=stype_str,
            direction=GraduationDirection.DEMOTION,
            from_mode=old_mode,
            to_mode=StrategyMode.SHADOW,
            triggered_at=datetime.now(),
            reason=reason or "Automatic demotion due to poor performance",
            performance_at_transition=perf.to_dict(),
            threshold_triggered="demotion",
        )
        
        # Save to database
        if self.db:
            self.db.record_graduation_event(event)
        
        self._save_strategy_state(stype_str)
        
        logger.warning(
            f"Strategy {stype_str} DEMOTED to SHADOW trading. "
            f"Win rate: {perf.win_rate:.1%}, Total PnL: ${perf.total_pnl:.2f}"
        )
        
        return event
    
    def auto_graduate(self, suggestion_type: SuggestionType) -> Optional[GraduationEvent]:
        """Automatically evaluate and apply graduation logic.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to evaluate
            
        Returns
        -------
        GraduationEvent | None
            Event if graduation occurred, None otherwise
        """
        current_mode = self.get_strategy_mode(suggestion_type)
        
        if current_mode == StrategyMode.SHADOW:
            eval_result = self.evaluate_promotion(suggestion_type)
            if eval_result['should_promote']:
                return self.promote_to_live(suggestion_type, eval_result.get('reason'))
        
        elif current_mode == StrategyMode.LIVE:
            eval_result = self.evaluate_demotion(suggestion_type)
            if eval_result['should_demote']:
                return self.demote_to_shadow(suggestion_type, eval_result.get('reason'))
        
        return None
    
    def get_strategy_status(self, suggestion_type: SuggestionType) -> Dict[str, Any]:
        """Get full status for a strategy.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to query
            
        Returns
        -------
        dict
            Strategy status and metrics
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if stype_str not in self._performance_cache:
            return {
                'suggestion_type': stype_str,
                'mode': StrategyMode.SHADOW.value,
                'performance': None,
                'ready_for_promotion': False,
            }
        
        perf = self._performance_cache[stype_str]
        promo_eval = self.evaluate_promotion(suggestion_type) if perf.mode == StrategyMode.SHADOW else None
        
        return {
            'suggestion_type': stype_str,
            'mode': perf.mode.value,
            'performance': perf.to_dict(),
            'ready_for_promotion': promo_eval['should_promote'] if promo_eval else False,
            'promotion_progress': promo_eval['checks'] if promo_eval else None,
        }
    
    def get_all_strategy_statuses(self) -> List[Dict[str, Any]]:
        """Get status for all strategies.
        
        Returns
        -------
        list[dict]
            Status for each strategy
        """
        return [self.get_strategy_status(st) for st in SuggestionType]
    
    def get_graduation_history(
        self,
        suggestion_type: Optional[SuggestionType] = None,
        limit: int = 50,
    ) -> List[GraduationEvent]:
        """Get graduation event history.
        
        Parameters
        ----------
        suggestion_type : SuggestionType | None
            Filter by type
        limit : int
            Max events to return
            
        Returns
        -------
        list[GraduationEvent]
            Graduation events
        """
        if not self.db:
            return []
        
        stype_str = suggestion_type.value if suggestion_type else None
        return self.db.get_graduation_events(stype_str, limit)
    
    def reset_strategy(
        self,
        suggestion_type: SuggestionType,
        keep_mode: bool = False,
    ) -> None:
        """Reset a strategy's performance metrics.
        
        Parameters
        ----------
        suggestion_type : SuggestionType
            Strategy to reset
        keep_mode : bool
            If True, preserve current mode
        """
        stype_str = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if stype_str not in self._performance_cache:
            return
        
        old_mode = self._performance_cache[stype_str].mode
        
        self._performance_cache[stype_str] = StrategyPerformance(
            suggestion_type=stype_str,
            mode=old_mode if keep_mode else StrategyMode.SHADOW,
        )
        
        self._save_strategy_state(stype_str)
        logger.info(f"Strategy {stype_str} performance reset")


def create_graduation_logic(
    db_path: Optional[str] = None,
    **threshold_kwargs
) -> GraduationLogic:
    """Create and initialize graduation logic.
    
    Parameters
    ----------
    db_path : str | None
        Path to database
    **threshold_kwargs
        Threshold configuration
        
    Returns
    -------
    GraduationLogic
        Initialized graduation logic
    """
    db = MLDatabase(db_path) if db_path else MLDatabase()
    thresholds = GraduationThresholds(**threshold_kwargs)
    
    grad = GraduationLogic(db=db, thresholds=thresholds)
    grad.initialize()
    
    return grad
