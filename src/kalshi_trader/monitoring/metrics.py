"""Performance Metrics Collection.

Provides real-time metrics tracking for the ML pipeline including
P&L, accuracy, and model performance.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from collections import deque

logger = logging.getLogger(__name__)


@dataclass
class TradeMetrics:
    """Metrics for a single trade."""
    trade_id: str
    suggestion_type: str
    entry_price: float
    exit_price: float
    pnl: float
    position_size: float
    confidence: float
    timestamp: datetime
    outcome: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'trade_id': self.trade_id,
            'suggestion_type': self.suggestion_type,
            'entry_price': self.entry_price,
            'exit_price': self.exit_price,
            'pnl': self.pnl,
            'position_size': self.position_size,
            'confidence': self.confidence,
            'timestamp': self.timestamp.isoformat(),
            'outcome': self.outcome,
        }


@dataclass
class StrategyMetrics:
    """Metrics for a trading strategy."""
    suggestion_type: str
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    total_pnl: float = 0.0
    max_drawdown: float = 0.0
    peak_pnl: float = 0.0
    avg_win: float = 0.0
    avg_loss: float = 0.0
    
    @property
    def win_rate(self) -> float:
        return self.winning_trades / self.total_trades if self.total_trades > 0 else 0.0
    
    @property
    def profit_factor(self) -> float:
        total_wins = self.winning_trades * self.avg_win
        total_losses = self.losing_trades * abs(self.avg_loss)
        if total_losses == 0:
            return total_wins if total_wins > 0 else 0.0
        return total_wins / total_losses
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'suggestion_type': self.suggestion_type,
            'total_trades': self.total_trades,
            'winning_trades': self.winning_trades,
            'losing_trades': self.losing_trades,
            'win_rate': self.win_rate,
            'total_pnl': self.total_pnl,
            'max_drawdown': self.max_drawdown,
            'peak_pnl': self.peak_pnl,
            'avg_win': self.avg_win,
            'avg_loss': self.avg_loss,
            'profit_factor': self.profit_factor,
        }


@dataclass
class PerformanceMetrics:
    """Overall performance metrics."""
    timestamp: datetime = field(default_factory=datetime.now)
    
    # Overall stats
    total_trades: int = 0
    total_pnl: float = 0.0
    daily_pnl: float = 0.0
    
    # Strategy metrics
    strategies: Dict[str, StrategyMetrics] = field(default_factory=dict)
    
    # Model metrics
    model_accuracy: float = 0.0
    ml_predictions_made: int = 0
    fallback_to_momentum: int = 0
    
    # System metrics
    circuit_breakers_triggered: int = 0
    avg_latency_ms: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'total_trades': self.total_trades,
            'total_pnl': self.total_pnl,
            'daily_pnl': self.daily_pnl,
            'strategies': {k: v.to_dict() for k, v in self.strategies.items()},
            'model_accuracy': self.model_accuracy,
            'ml_predictions_made': self.ml_predictions_made,
            'fallback_to_momentum': self.fallback_to_momentum,
            'circuit_breakers_triggered': self.circuit_breakers_triggered,
            'avg_latency_ms': self.avg_latency_ms,
        }


class MetricsCollector:
    """Collects and manages performance metrics.
    
    Provides real-time metric tracking with persistence and
    historical analysis capabilities.
    
    Parameters
    ----------
    retention_window : int
        How many metrics to retain in memory
    persistence_path : str | None
        Path to save metrics
    
    Example
    -------
    >>> from kalshi_trader.monitoring import MetricsCollector
    >>> 
    >>> collector = MetricsCollector(retention_window=1000)
    >>> # ... trade executed ...
    >>> collector.record_trade(trade_id, suggestion_type, pnl, confidence)
    >>> # Get current metrics
    >>> metrics = collector.get_current_metrics()
    """
    
    def __init__(
        self,
        retention_window: int = 10000,
        persistence_path: Optional[str] = None,
    ):
        self.retention_window = retention_window
        self.persistence_path = Path(persistence_path) if persistence_path else None
        
        self._trades: deque = deque(maxlen=retention_window)
        self._current_metrics = PerformanceMetrics()
        self._strategy_metrics: Dict[str, StrategyMetrics] = {}
        
        self._trades_today = 0
        self._today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        self._circuit_breaker_count = 0
        self._fallback_count = 0
        self._ml_prediction_count = 0
        
        if self.persistence_path:
            self._load_persisted_metrics()
    
    def record_trade(
        self,
        trade_id: str,
        suggestion_type: str,
        pnl: float,
        confidence: float,
        position_size: float,
        entry_price: float,
        exit_price: float,
        ml_enabled: bool = True,
    ) -> None:
        """Record a completed trade.
        
        Parameters
        ----------
        trade_id : str
            Trade identifier
        suggestion_type : str
            Strategy type
        pnl : float
            Profit/loss
        confidence : float
            Trade confidence
        position_size : float
            Position size
        entry_price : float
            Entry price
        exit_price : float
            Exit price
        ml_enabled : bool
            Whether ML was enabled for this trade
        """
        self._check_day_rollover()
        
        trade = TradeMetrics(
            trade_id=trade_id,
            suggestion_type=suggestion_type,
            entry_price=entry_price,
            exit_price=exit_price,
            pnl=pnl,
            position_size=position_size,
            confidence=confidence,
            timestamp=datetime.now(),
            outcome=pnl > 0,
        )
        
        self._trades.append(trade)
        self._trades_today += 1
        
        # Update strategy metrics
        if suggestion_type not in self._strategy_metrics:
            self._strategy_metrics[suggestion_type] = StrategyMetrics(suggestion_type=suggestion_type)
        
        strategy = self._strategy_metrics[suggestion_type]
        strategy.total_trades += 1
        strategy.total_pnl += pnl
        
        if pnl > 0:
            strategy.winning_trades += 1
            strategy.avg_win = (strategy.avg_win * (strategy.winning_trades - 1) + pnl) / strategy.winning_trades
        else:
            strategy.losing_trades += 1
            strategy.avg_loss = (strategy.avg_loss * (strategy.losing_trades - 1) + pnl) / strategy.losing_trades
        
        # Update peak/drawdown
        if strategy.total_pnl > strategy.peak_pnl:
            strategy.peak_pnl = strategy.total_pnl
        drawdown = strategy.peak_pnl - strategy.total_pnl
        if drawdown > strategy.max_drawdown:
            strategy.max_drawdown = drawdown
        
        # Update ML metrics
        if ml_enabled:
            self._ml_prediction_count += 1
        else:
            self._fallback_count += 1
        
        # Persist if configured
        if self.persistence_path and len(self._trades) % 100 == 0:
            self._persist_metrics()
        
        logger.debug(f"Trade recorded: {trade_id}, P&L: ${pnl:+.2f}")
    
    def record_circuit_breaker(self) -> None:
        """Record a circuit breaker trigger."""
        self._circuit_breaker_count += 1
        logger.warning(f"Circuit breaker recorded (total: {self._circuit_breaker_count})")
    
    def record_ml_fallback(self, reason: str) -> None:
        """Record ML fallback to momentum."""
        self._fallback_count += 1
        logger.warning(f"ML fallback recorded: {reason} (total: {self._fallback_count})")
    
    def record_ml_prediction(self, latency_ms: float) -> None:
        """Record an ML prediction."""
        self._ml_prediction_count += 1
        # Exponential moving average for latency
        alpha = 0.1
        self._current_metrics.avg_latency_ms = (
            alpha * latency_ms + (1 - alpha) * self._current_metrics.avg_latency_ms
        )
    
    def get_current_metrics(self) -> PerformanceMetrics:
        """Get current aggregated metrics."""
        self._check_day_rollover()
        
        metrics = PerformanceMetrics(
            total_trades=len(self._trades),
            total_pnl=sum(t.pnl for t in self._trades),
            daily_pnl=sum(t.pnl for t in self._trades if t.timestamp >= self._today_start),
            strategies=self._strategy_metrics,
            model_accuracy=self._calculate_accuracy(),
            ml_predictions_made=self._ml_prediction_count,
            fallback_to_momentum=self._fallback_count,
            circuit_breakers_triggered=self._circuit_breaker_count,
        )
        
        return metrics
    
    def get_strategy_metrics(self, suggestion_type: str) -> Optional[StrategyMetrics]:
        """Get metrics for a specific strategy."""
        return self._strategy_metrics.get(suggestion_type)
    
    def get_recent_trades(self, n: int = 100) -> List[TradeMetrics]:
        """Get recent trades."""
        return list(self._trades)[-n:]
    
    def get_daily_trades(self, date: Optional[datetime] = None) -> List[TradeMetrics]:
        """Get trades for a specific date."""
        if date is None:
            date = datetime.now()
        
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        
        return [t for t in self._trades if start <= t.timestamp < end]
    
    def get_win_rate(self, window: Optional[int] = None) -> float:
        """Calculate win rate over recent trades."""
        trades = list(self._trades)
        if window:
            trades = trades[-window:]
        
        if not trades:
            return 0.0
        
        wins = sum(1 for t in trades if t.outcome)
        return wins / len(trades)
    
    def get_sharpe_ratio(self, risk_free_rate: float = 0.0) -> float:
        """Calculate Sharpe ratio from recent trades."""
        if len(self._trades) < 2:
            return 0.0
        
        trades = list(self._trades)
        returns = [t.pnl for t in trades]
        
        avg_return = sum(returns) / len(returns)
        variance = sum((r - avg_return) ** 2 for r in returns) / len(returns)
        std_dev = variance ** 0.5
        
        if std_dev == 0:
            return 0.0
        
        return (avg_return - risk_free_rate) / std_dev
    
    def _calculate_accuracy(self) -> float:
        """Calculate model accuracy."""
        if not self._ml_prediction_count:
            return 0.0
        
        # Simple accuracy based on win rate for ML-enabled trades
        return self.get_win_rate(window=min(self._ml_prediction_count, len(self._trades)))
    
    def _check_day_rollover(self) -> None:
        """Check if day has rolled over and reset daily stats."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if today > self._today_start:
            self._today_start = today
            self._trades_today = 0
            logger.info("Day rolled over, daily stats reset")
    
    def _persist_metrics(self) -> None:
        """Persist metrics to disk."""
        if not self.persistence_path:
            return
        
        try:
            data = {
                'strategy_metrics': {k: v.to_dict() for k, v in self._strategy_metrics.items()},
                'circuit_breaker_count': self._circuit_breaker_count,
                'fallback_count': self._fallback_count,
                'ml_prediction_count': self._ml_prediction_count,
                'timestamp': datetime.now().isoformat(),
            }
            
            self.persistence_path.write_text(json.dumps(data, indent=2))
            
        except Exception as e:
            logger.error(f"Failed to persist metrics: {e}")
    
    def _load_persisted_metrics(self) -> None:
        """Load persisted metrics from disk."""
        if not self.persistence_path or not self.persistence_path.exists():
            return
        
        try:
            data = json.loads(self.persistence_path.read_text())
            
            self._circuit_breaker_count = data.get('circuit_breaker_count', 0)
            self._fallback_count = data.get('fallback_count', 0)
            self._ml_prediction_count = data.get('ml_prediction_count', 0)
            
            for stype, metrics_data in data.get('strategy_metrics', {}).items():
                strategy = StrategyMetrics(suggestion_type=stype)
                for attr, value in metrics_data.items():
                    if hasattr(strategy, attr) and attr != 'win_rate' and attr != 'profit_factor':
                        setattr(strategy, attr, value)
                self._strategy_metrics[stype] = strategy
            
        except Exception as e:
            logger.error(f"Failed to load persisted metrics: {e}")
    
    def export_metrics(self, path: str) -> None:
        """Export metrics to file."""
        metrics_dict = self.get_current_metrics().to_dict()
        
        try:
            Path(path).write_text(json.dumps(metrics_dict, indent=2))
            logger.info(f"Metrics exported to {path}")
        except Exception as e:
            logger.error(f"Failed to export metrics: {e}")
    
    def clear_history(self) -> None:
        """Clear all metrics history."""
        self._trades.clear()
        self._strategy_metrics.clear()
        self._circuit_breaker_count = 0
        self._fallback_count = 0
        self._ml_prediction_count = 0
        logger.info("Metrics history cleared")
