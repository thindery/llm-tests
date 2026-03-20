"""Safety Controls for ML Pipeline.

Implements circuit breakers, position sizing, exposure limits,
and cooldown periods to protect trading capital.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum, auto
from typing import Dict, List, Optional, Any, Callable

import numpy as np

from .database import MLDatabase

logger = logging.getLogger(__name__)


class SafetyStatus(Enum):
    """Status of the safety system."""
    NORMAL = "normal"
    CIRCUIT_BREAKER = "circuit_breaker"
    COOLDOWN = "cooldown"
    MAX_EXPOSURE = "max_exposure"


class CircuitBreakerReason(Enum):
    """Reason for circuit breaker trigger."""
    CONSECUTIVE_LOSSES = "consecutive_losses"
    DAILY_LOSS_LIMIT = "daily_loss_limit"
    MANUAL = "manual"


@dataclass
class SafetyConfig:
    """Configuration for safety controls.
    
    Parameters
    ----------
    max_consecutive_losses : int
        Maximum consecutive losses before circuit breaker
    max_daily_loss : float
        Maximum daily loss in dollars before circuit breaker
    position_size_method : str
        Position sizing method ('kelly' or 'fixed_fractional')
    fixed_fraction : float
        Fixed fraction of balance per trade (0.0-1.0)
    kelly_fraction : float
        Fraction of Kelly criterion to use (0.0-1.0)
    max_position_percent : float
        Maximum percent of balance in single trade
    max_open_positions : int
        Maximum number of open positions
    cooldown_minutes : int
        Cooldown period after circuit breaker in minutes
    """
    max_consecutive_losses: int = 3
    max_daily_loss: float = -50.0
    position_size_method: str = "fixed_fractional"  # or 'kelly'
    fixed_fraction: float = 0.05  # 5% per trade
    kelly_fraction: float = 0.5  # Half Kelly
    max_position_percent: float = 0.20  # Max 20% in single trade
    max_open_positions: int = 5
    cooldown_minutes: int = 30
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SafetyConfig":
        """Create from dictionary."""
        return cls(**data)


@dataclass
class CircuitBreakerRecord:
    """Record of a circuit breaker event."""
    breaker_id: str
    reason: CircuitBreakerReason
    reason_detail: str
    triggered_at: datetime
    reset_at: Optional[datetime] = None
    daily_pnl_at_trigger: float = 0.0
    consecutive_losses_at_trigger: int = 0
    current_balance: float = 0.0


@dataclass
class SafetyState:
    """Current safety system state."""
    status: SafetyStatus = SafetyStatus.NORMAL
    consecutive_losses: int = 0
    daily_pnl: float = 0.0
    open_positions: int = 0
    open_position_value: float = 0.0
    total_balance: float = 0.0
    last_trade_time: Optional[datetime] = None
    circuit_breaker_until: Optional[datetime] = None
    circuit_breaker_reason: Optional[CircuitBreakerReason] = None
    last_updated: datetime = field(default_factory=datetime.now)
    
    @property
    def is_trading_allowed(self) -> bool:
        """Check if trading is currently allowed."""
        if self.status == SafetyStatus.NORMAL:
            return True
        if self.status == SafetyStatus.COOLDOWN and self.circuit_breaker_until:
            return datetime.now() >= self.circuit_breaker_until
        return False
    
    @property
    def can_open_position(self) -> bool:
        """Check if new positions can be opened."""
        if not self.is_trading_allowed:
            return False
        if self.open_positions >= 5:  # max_open_positions default
            return False
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'status': self.status.value,
            'consecutive_losses': self.consecutive_losses,
            'daily_pnl': self.daily_pnl,
            'open_positions': self.open_positions,
            'open_position_value': self.open_position_value,
            'total_balance': self.total_balance,
            'last_trade_time': self.last_trade_time.isoformat() if self.last_trade_time else None,
            'circuit_breaker_until': self.circuit_breaker_until.isoformat() if self.circuit_breaker_until else None,
            'circuit_breaker_reason': self.circuit_breaker_reason.value if self.circuit_breaker_reason else None,
            'is_trading_allowed': self.is_trading_allowed,
            'can_open_position': self.can_open_position,
            'last_updated': self.last_updated.isoformat(),
        }


class SafetyControls:
    """Safety controls for trading system.
    
    Implements multiple layers of protection:
    1. Circuit breakers - Stop trading after losses
    2. Position sizing - Calculate optimal position sizes
    3. Exposure limits - Prevent over-concentration
    4. Cooldown periods - Pause after circuit breaker
    
    Parameters
    ----------
    db : MLDatabase
        Database for persisting safety events
    config : SafetyConfig | None
        Safety configuration
    
    Example
    -------
    >>> from kalshi_trader.ml import SafetyControls
    >>> safety = SafetyControls()
    >>> safety.initialize(balance=1000.0)
    >>>
    >>> # Check if can trade
    >>> if safety.can_trade():
    ...     size = safety.calculate_position_size(confidence=0.7)
    ...     print(f"Position size: ${size:.2f}")
    >>>
    >>> # Record trade outcome
    >>> safety.record_trade(pnl=10.0)
    >>>
    >>> # Check circuit breaker status
    >>> if safety.state.status == SafetyStatus.CIRCUIT_BREAKER:
    ...     print(f"Trading halted: {safety.state.circuit_breaker_reason}")
    """
    
    def __init__(
        self,
        db: Optional[MLDatabase] = None,
        config: Optional[SafetyConfig] = None,
    ):
        self.db = db
        self.config = config or SafetyConfig()
        self.state = SafetyState()
        self._trade_history: List[Dict[str, Any]] = []
        self._today: str = datetime.now().strftime("%Y-%m-%d")
        self._initialized = False
    
    def initialize(self, balance: float = 1000.0) -> None:
        """Initialize safety controls with starting balance."""
        self.state.total_balance = balance
        self._load_daily_state()
        self._initialized = True
        logger.info(f"Safety controls initialized with balance: ${balance:.2f}")
    
    def _load_daily_state(self) -> None:
        """Load today's trading state from database."""
        if not self.db:
            return
        
        today_pnl = self.db.get_daily_pnl(self._today)
        consecutive_losses = self.db.get_consecutive_losses()
        open_positions = self.db.get_open_position_count()
        
        self.state.daily_pnl = today_pnl
        self.state.consecutive_losses = consecutive_losses
        self.state.open_positions = open_positions
        
        # Check if there's an active circuit breaker
        active_breaker = self.db.get_active_circuit_breaker()
        if active_breaker:
            self.state.status = SafetyStatus.CIRCUIT_BREAKER
            self.state.circuit_breaker_until = active_breaker.reset_at
            self.state.circuit_breaker_reason = active_breaker.reason
    
    def can_trade(self) -> bool:
        """Check if trading is currently allowed.
        
        Returns
        -------
        bool
            True if trading is allowed
        """
        if not self._initialized:
            logger.warning("Safety controls not initialized")
            return False
        
        # Check if circuit breaker is still active
        if self.state.circuit_breaker_until:
            if datetime.now() < self.state.circuit_breaker_until:
                logger.warning(
                    f"Circuit breaker active until {self.state.circuit_breaker_until}"
                )
                return False
            else:
                # Reset circuit breaker
                self._reset_circuit_breaker()
        
        return self.state.is_trading_allowed
    
    def can_open_position(self, position_size: Optional[float] = None) -> tuple[bool, str]:
        """Check if a new position can be opened.
        
        Parameters
        ----------
        position_size : float | None
            Proposed position size
            
        Returns
        -------
        tuple[bool, str]
            (allowed, reason)
        """
        if not self.can_trade():
            return False, f"Trading not allowed: {self.state.status.value}"
        
        if self.state.open_positions >= self.config.max_open_positions:
            return False, f"Max open positions reached ({self.config.max_open_positions})"
        
        if position_size:
            max_position = self.state.total_balance * self.config.max_position_percent
            if position_size > max_position:
                return False, f"Position size ${position_size:.2f} exceeds max ${max_position:.2f}"
            
            total_exposure = self.state.open_position_value + position_size
            if total_exposure > self.state.total_balance:
                return False, "Position would exceed account balance"
        
        return True, "OK"
    
    def check_circuit_breakers(self) -> Optional[CircuitBreakerReason]:
        """Check if any circuit breaker conditions are met.
        
        Returns
        -------
        CircuitBreakerReason | None
            Reason if triggered, None otherwise
        """
        # Check consecutive losses
        if self.state.consecutive_losses >= self.config.max_consecutive_losses:
            return CircuitBreakerReason.CONSECUTIVE_LOSSES
        
        # Check daily loss limit
        if self.state.daily_pnl <= self.config.max_daily_loss:
            return CircuitBreakerReason.DAILY_LOSS_LIMIT
        
        return None
    
    def trigger_circuit_breaker(
        self,
        reason: CircuitBreakerReason,
        detail: str = ""
    ) -> None:
        """Manually trigger circuit breaker.
        
        Parameters
        ----------
        reason : CircuitBreakerReason
            Reason for triggering
        detail : str
            Additional details
        """
        breaker_id = f"cb_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        reset_time = datetime.now() + timedelta(minutes=self.config.cooldown_minutes)
        
        self.state.status = SafetyStatus.CIRCUIT_BREAKER
        self.state.circuit_breaker_until = reset_time
        self.state.circuit_breaker_reason = reason
        
        record = CircuitBreakerRecord(
            breaker_id=breaker_id,
            reason=reason,
            reason_detail=detail,
            triggered_at=datetime.now(),
            reset_at=reset_time,
            daily_pnl_at_trigger=self.state.daily_pnl,
            consecutive_losses_at_trigger=self.state.consecutive_losses,
            current_balance=self.state.total_balance,
        )
        
        if self.db:
            self.db.record_circuit_breaker(record)
        
        logger.warning(
            f"CIRCUIT BREAKER TRIGGERED: {reason.value}. "
            f"Trading paused until {reset_time}. Detail: {detail}"
        )
    
    def _reset_circuit_breaker(self) -> None:
        """Reset circuit breaker and resume trading."""
        if self.state.circuit_breaker_reason:
            logger.info(
                f"Circuit breaker reset. Reason was: {self.state.circuit_breaker_reason.value}"
            )
        
        self.state.status = SafetyStatus.NORMAL
        self.state.circuit_breaker_until = None
        self.state.circuit_breaker_reason = None
        self.state.consecutive_losses = 0  # Reset consecutive losses
        
        if self.db:
            self.db.reset_circuit_breaker()
    
    def calculate_position_size(
        self,
        confidence: float,
        win_rate: Optional[float] = None,
        avg_win: Optional[float] = None,
        avg_loss: Optional[float] = None,
    ) -> float:
        """Calculate optimal position size.
        
        Uses either Kelly Criterion or fixed fractional sizing
        based on configuration.
        
        Parameters
        ----------
        confidence : float
            Trade confidence (0.0-1.0)
        win_rate : float | None
            Historical win rate for Kelly calculation
        avg_win : float | None
            Average win amount
        avg_loss : float | None
            Average loss amount
            
        Returns
        -------
        float
            Position size in dollars
        """
        if self.config.position_size_method == "kelly":
            if None in (win_rate, avg_win, avg_loss):
                # Fall back to fixed fractional if Kelly not possible
                base_size = self.state.total_balance * self.config.fixed_fraction
            else:
                # Kelly Criterion: f* = (bp - q) / b
                # where b = avg_win/avg_loss, p = win_rate, q = 1-p
                b = avg_win / avg_loss if avg_loss > 0 else 1.0
                p = win_rate
                q = 1 - p
                
                kelly_fraction = (b * p - q) / b if b > 0 else 0
                kelly_fraction = max(0, min(kelly_fraction, 1.0))  # Clamp to [0, 1]
                
                # Apply Kelly fraction (e.g., Half Kelly)
                adjusted_fraction = kelly_fraction * self.config.kelly_fraction
                base_size = self.state.total_balance * adjusted_fraction
        else:
            # Fixed fractional sizing
            base_size = self.state.total_balance * self.config.fixed_fraction
        
        # Scale by confidence (higher confidence = larger position)
        # Using a sigmoid-like scaling to avoid extreme values
        confidence_scale = 0.5 + (confidence * 0.5)  # 0.5 to 1.0
        sized_position = base_size * confidence_scale
        
        # Apply max position limit
        max_position = self.state.total_balance * self.config.max_position_percent
        final_size = min(sized_position, max_position)
        
        # Ensure positive
        return max(0.0, final_size)
    
    def calculate_kelly_size(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
        confidence: float = 1.0,
    ) -> float:
        """Calculate position size using Kelly Criterion.
        
        Parameters
        ----------
        win_rate : float
            Probability of win (0.0-1.0)
        avg_win : float
            Average win amount
        avg_loss : float
            Average loss amount (positive value)
        confidence : float
            Confidence multiplier
            
        Returns
        -------
        float
            Kelly-optimal position size
        """
        if avg_loss <= 0 or win_rate <= 0 or win_rate >= 1:
            return 0.0
        
        # Kelly fraction: f* = (bp - q) / b
        b = avg_win / avg_loss  # win/loss ratio
        p = win_rate
        q = 1 - p
        
        kelly_f = (b * p - q) / b
        
        # Apply fractional Kelly and confidence
        kelly_f *= self.config.kelly_fraction * confidence
        
        # Clamp to reasonable bounds
        kelly_f = max(0.0, min(kelly_f, self.config.max_position_percent))
        
        return self.state.total_balance * kelly_f
    
    def record_trade(
        self,
        trade_id: str,
        pnl: float,
        position_size: float,
        suggestion_type: str,
    ) -> Dict[str, Any]:
        """Record a trade outcome and update safety state.
        
        Parameters
        ----------
        trade_id : str
            Trade identifier
        pnl : float
            Profit/loss from trade
        position_size : float
            Size of position
        suggestion_type : str
            Type of suggestion
            
        Returns
        -------
        dict
            Trade record with safety context
        """
        now = datetime.now()
        trade_day = now.strftime("%Y-%m-%d")
        
        # Reset daily P&L if new day
        if trade_day != self._today:
            self.state.daily_pnl = 0.0
            self.state.consecutive_losses = 0
            self._today = trade_day
        
        # Determine if this was a win or loss
        is_win = pnl > 0
        
        # Update consecutive losses
        if not is_win:
            self.state.consecutive_losses += 1
        else:
            self.state.consecutive_losses = 0
        
        # Update daily P&L
        self.state.daily_pnl += pnl
        
        # Update position tracking
        self.state.open_positions = max(0, self.state.open_positions - 1)
        self.state.open_position_value = max(0, self.state.open_position_value - position_size)
        
        # Update balance
        self.state.total_balance += pnl
        
        # Update last trade time
        self.state.last_trade_time = now
        
        # Create record
        record = {
            'trade_id': trade_id,
            'pnl': pnl,
            'position_size': position_size,
            'suggestion_type': suggestion_type,
            'is_win': is_win,
            'consecutive_losses': self.state.consecutive_losses,
            'daily_pnl': self.state.daily_pnl,
            'timestamp': now.isoformat(),
        }
        
        self._trade_history.append(record)
        
        # Persist to database
        if self.db:
            self.db.record_trade_with_safety(trade_id, pnl, self.state.to_dict())
        
        # Check if circuit breaker should trigger
        breaker_reason = self.check_circuit_breakers()
        if breaker_reason:
            detail = f"Daily PnL: ${self.state.daily_pnl:.2f}, Consecutive losses: {self.state.consecutive_losses}"
            self.trigger_circuit_breaker(breaker_reason, detail)
        
        logger.info(
            f"Trade recorded: {trade_id}, PnL: ${pnl:.2f}, "
            f"Daily PnL: ${self.state.daily_pnl:.2f}, "
            f"Consecutive losses: {self.state.consecutive_losses}"
        )
        
        return record
    
    def record_position_opened(self, position_size: float) -> None:
        """Record that a position was opened.
        
        Parameters
        ----------
        position_size : float
            Size of opened position
        """
        self.state.open_positions += 1
        self.state.open_position_value += position_size
        self.state.last_trade_time = datetime.now()
        
        logger.info(
            f"Position opened: ${position_size:.2f}, "
            f"Open positions: {self.state.open_positions}"
        )
    
    def get_status(self) -> Dict[str, Any]:
        """Get current safety status.
        
        Returns
        -------
        dict
            Safety status summary
        """
        return {
            'state': self.state.to_dict(),
            'config': self.config.to_dict(),
            'circuit_breakers_triggered_today': self._count_circuit_breakers_today(),
        }
    
    def _count_circuit_breakers_today(self) -> int:
        """Count circuit breakers triggered today."""
        if not self.db:
            return 0
        return self.db.get_circuit_breaker_count(self._today)
    
    def reset_daily_stats(self) -> None:
        """Reset daily statistics (call at market open)."""
        self.state.daily_pnl = 0.0
        self.state.consecutive_losses = 0
        self._today = datetime.now().strftime("%Y-%m-%d")
        
        logger.info("Daily safety stats reset")


def create_safety_controls(
    db_path: Optional[str] = None,
    **config_kwargs
) -> SafetyControls:
    """Create and initialize safety controls.
    
    Parameters
    ----------
    db_path : str | None
        Path to database
    **config_kwargs
        Safety configuration parameters
        
    Returns
    -------
    SafetyControls
        Initialized safety controls
    """
    db = MLDatabase(db_path) if db_path else MLDatabase()
    config = SafetyConfig(**config_kwargs)
    
    safety = SafetyControls(db=db, config=config)
    safety.initialize()
    
    return safety
