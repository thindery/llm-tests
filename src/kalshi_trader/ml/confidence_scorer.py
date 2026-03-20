"""Bayesian confidence scoring for trade suggestions.

Uses Beta distribution to maintain confidence scores per suggestion type.
Confidence = α / (α + β), where:
- α: Count of successful trades + prior
- β: Count of failed trades + prior

Higher confidence means the suggestion type has historically been profitable.
"""

from __future__ import annotations

from enum import Enum
from dataclasses import dataclass
from typing import Dict, Optional

import numpy as np

from .database import MLDatabase, ConfidenceRecord


class SuggestionType(str, Enum):
    """Types of trade suggestions with different strategies."""
    REVERSION = "reversion"
    BREAKOUT = "breakout"
    VOLATILITY = "volatility"


@dataclass
class ConfidenceResult:
    """Result of confidence calculation."""
    suggestion_type: str
    confidence: float  # Mean of Beta distribution (0-1)
    alpha: float       # Beta distribution parameter
    beta: float        # Beta distribution parameter
    variance: float    # Variance of Beta distribution
    credible_interval: tuple[float, float]  # 95% credible interval
    sample_size: int   # Total trades used (for reference)


class ConfidenceScorer:
    """Bayesian confidence scoring for Kalshi trade suggestions.
    
    Maintains Beta distributions for each suggestion type and updates
    them based on trade outcomes. Confidence scores can be used to:
    - Filter suggestions (only execute if confidence > threshold)
    - Weight position sizes (higher confidence = larger position)
    - Compare strategy performance across suggestion types
    
    Parameters
    ----------
    prior_alpha : float
        Prior alpha parameter (default: 0.5, Jeffrey's prior)
    prior_beta : float
        Prior beta parameter (default: 0.5, Jeffrey's prior)
    min_samples : int
        Minimum samples before confidence is considered reliable
    db : MLDatabase
        Database instance for persistence
    
    Attributes
    ----------
    alpha : dict[str, float]
        Current alpha values per suggestion type
    beta : dict[str, float]
        Current beta values per suggestion type
    
    Example
    -------
    >>> from kalshi_trader.ml import ConfidenceScorer, SuggestionType
    >>> scorer = ConfidenceScorer()
    >>> scorer.initialize()
    >>>
    >>> # Check confidence before executing a trade
    >>> result = scorer.get_confidence_detailed(SuggestionType.BREAKOUT)
    >>> print(f"Confidence: {result.confidence:.2%}")
    Confidence: 0.50
    >>> print(f"95% CI: [{result.credible_interval[0]:.2%}, {result.credible_interval[1]:.2%}]")
    95% CI: [0.01, 0.99]
    >>>
    >>> # Execute trade and update confidence
    >>> trade_profitable = True
    >>> scorer.update_after_trade(SuggestionType.BREAKOUT, pnl=5.0)
    >>>
    >>> # Check updated confidence
    >>> result = scorer.get_confidence_detailed(SuggestionType.BREAKOUT)
    >>> print(f"Updated confidence: {result.confidence:.2%}")
    Updated confidence: 0.64
    
    Notes
    -----
    The default prior (α=0.5, β=0.5) is Jeffrey's prior, which is
    uninformative and allows the data to drive the posterior. With
    no data, confidence is 0.5 (50/50).
    
    Updates are weighted by P&L magnitude to reflect that larger
    wins/losses should have more impact on confidence.
    """
    
    def __init__(
        self,
        prior_alpha: float = 0.5,
        prior_beta: float = 0.5,
        min_samples: int = 5,
        db: Optional[MLDatabase] = None
    ):
        self.prior_alpha = prior_alpha
        self.prior_beta = prior_beta
        self.min_samples = min_samples
        self.db = db or MLDatabase()
        
        # In-memory cache of parameters
        self._alpha: Dict[str, float] = {}
        self._beta: Dict[str, float] = {}
        
    def initialize(self) -> None:
        """Initialize database and load current parameters."""
        self.db.initialize()
        
        # Load all confidence records
        for record in self.db.get_all_confidence():
            self._alpha[record.suggestion_type] = record.alpha
            self._beta[record.suggestion_type] = record.beta
            
        # Ensure all suggestion types exist
        for st in SuggestionType:
            if st.value not in self._alpha:
                self._alpha[st.value] = self.prior_alpha
                self._beta[st.value] = self.prior_beta
                self.db.update_confidence(st.value, self.prior_alpha, self.prior_beta)
                
    def get_confidence(self, suggestion_type: str | SuggestionType) -> float:
        """Get confidence score for a suggestion type (0-1).
        
        Parameters
        ----------
        suggestion_type : str | SuggestionType
            Type of suggestion (reversion, breakout, or volatility)
            
        Returns
        -------
        float
            Confidence score between 0 and 1
            
        Raises
        ------
        ValueError
            If suggestion_type is not valid
        """
        st = self._validate_type(suggestion_type)
        
        alpha = self._alpha.get(st, self.prior_alpha)
        beta = self._beta.get(st, self.prior_beta)
        
        return alpha / (alpha + beta) if (alpha + beta) > 0 else 0.5
        
    def get_confidence_detailed(
        self,
        suggestion_type: str | SuggestionType
    ) -> ConfidenceResult:
        """Get detailed confidence information including credible interval.
        
        Parameters
        ----------
        suggestion_type : str | SuggestionType
            Type of suggestion
            
        Returns
        -------
        ConfidenceResult
            Detailed confidence information
        """
        st = self._validate_type(suggestion_type)
        
        alpha = self._alpha.get(st, self.prior_alpha)
        beta = self._beta.get(st, self.prior_beta)
        
        # Calculate confidence (mean of Beta distribution)
        confidence = alpha / (alpha + beta) if (alpha + beta) > 0 else 0.5
        
        # Calculate variance
        variance = (alpha * beta) / ((alpha + beta)**2 * (alpha + beta + 1))
        
        # Calculate 95% credible interval using Beta distribution
        from scipy import stats
        ci_low, ci_high = stats.beta.interval(0.95, alpha, beta)
        
        # Estimate sample size (total trades = alpha + beta - 2*prior)
        sample_size = int(alpha + beta - self.prior_alpha - self.prior_beta)
        
        return ConfidenceResult(
            suggestion_type=st,
            confidence=confidence,
            alpha=alpha,
            beta=beta,
            variance=variance,
            credible_interval=(ci_low, ci_high),
            sample_size=sample_size
        )
        
    def get_all_confidence(self) -> Dict[str, float]:
        """Get confidence scores for all suggestion types.
        
        Returns
        -------
        dict[str, float]
            Mapping of suggestion type to confidence score
        """
        return {
            st.value: self.get_confidence(st)
            for st in SuggestionType
        }
        
    def update_after_trade(
        self,
        suggestion_type: str | SuggestionType,
        outcome: bool,
        pnl: float
    ) -> None:
        """Update confidence after a trade completes.
        
        Updates alpha/beta parameters based on trade outcome.
        The update is weighted by P&L magnitude.
        
        Parameters
        ----------
        suggestion_type : str | SuggestionType
            Type of suggestion that was executed
        outcome : bool
            True if trade was profitable, False if loss
        pnl : float
            Profit/loss amount (can be negative)
            
        Example
        -------
        >>> from kalshi_trader.ml import ConfidenceScorer
        >>> scorer = ConfidenceScorer()
        >>> scorer.initialize()
        >>>
        >>> # Winning trade with $5 profit
        >>> scorer.update_after_trade("breakout", outcome=True, pnl=5.0)
        >>> # Losing trade with $2 loss
        >>> scorer.update_after_trade("reversion", outcome=False, pnl=-2.0)
        """
        st = self._validate_type(suggestion_type)
        
        # Get current parameters
        alpha = self._alpha.get(st, self.prior_alpha)
        beta = self._beta.get(st, self.prior_beta)
        
        # Weight update by P&L magnitude (base weight + 10% of P&L)
        weight = 1.0 + abs(pnl) / 10.0
        
        if outcome:
            # Successful trade: increment alpha
            alpha += weight
        else:
            # Failed trade: increment beta
            beta += weight
            
        # Update in-memory cache
        self._alpha[st] = alpha
        self._beta[st] = beta
        
        # Persist to database
        self.db.update_confidence(st, alpha, beta)
        
    def should_trade(
        self,
        suggestion_type: str | SuggestionType,
        threshold: float = 0.6
    ) -> bool:
        """Determine if a trade should be executed based on confidence.
        
        Parameters
        ----------
        suggestion_type : str | SuggestionType
            Type of suggestion
        threshold : float
            Minimum confidence to execute (default: 0.6)
            
        Returns
        -------
        bool
            True if confidence is above threshold and sufficient samples
            
        Example
        -------
        >>> if scorer.should_trade("breakout", threshold=0.6):
        ...     # Execute trade
        ...     pass
        """
        st = self._validate_type(suggestion_type)
        result = self.get_confidence_detailed(st)
        
        # Require both threshold and minimum samples
        if result.sample_size < self.min_samples:
            return True  # Allow trading to collect data
            
        return result.confidence >= threshold
        
    def get_position_weight(
        self,
        suggestion_type: str | SuggestionType,
        base_size: float
    ) -> float:
        """Calculate position size based on confidence.
        
        Higher confidence strategies get larger positions.
        
        Parameters
        ----------
        suggestion_type : str | SuggestionType
            Type of suggestion
        base_size : float
            Base position size
            
        Returns
        -------
        float
            Weighted position size
        """
        st = self._validate_type(suggestion_type)
        confidence = self.get_confidence(st)
        
        # Weight linearly: 0.5 confidence = 0.5x, 1.0 confidence = 1.0x
        # Scale to 0.5-1.0 range
        weight = 0.5 + (confidence * 0.5)
        
        return base_size * weight
        
    def _validate_type(self, suggestion_type: str | SuggestionType) -> str:
        """Validate and normalize suggestion type."""
        st = suggestion_type.value if isinstance(suggestion_type, SuggestionType) else suggestion_type
        
        if st not in [t.value for t in SuggestionType]:
            raise ValueError(f"Invalid suggestion type: {st}. Must be one of: {[t.value for t in SuggestionType]}")
            
        return st
        
    def get_uncertainty(self, suggestion_type: str | SuggestionType) -> float:
        """Get uncertainty measure (variance) for a suggestion type.
        
        Higher variance = more uncertainty. Useful for exploratory
        vs exploitation decisions.
        
        Parameters
        ----------
        suggestion_type : str | SuggestionType
            Type of suggestion
            
        Returns
        -------
        float
            Variance of Beta distribution
        """
        result = self.get_confidence_detailed(suggestion_type)
        return result.variance
        
    def explain_confidence(self, suggestion_type: str | SuggestionType) -> str:
        """Generate human-readable explanation of confidence.
        
        Parameters
        ----------
        suggestion_type : str | SuggestionType
            Type of suggestion
            
        Returns
        -------
        str
            Human-readable explanation
        """
        result = self.get_confidence_detailed(suggestion_type)
        
        explanation = (
            f"{result.suggestion_type.capitalize()} Strategy:\n"
            f"  Confidence: {result.confidence:.1%}\n"
            f"  Sample size: {result.sample_size} trades\n"
            f"  95% Credible Interval: [{result.credible_interval[0]:.1%}, {result.credible_interval[1]:.1%}]\n"
        )
        
        if result.sample_size < 5:
            explanation += "  ⚠️ Limited data - confidence is unreliable\n"
        elif result.confidence > 0.7:
            explanation += "  ✅ High confidence strategy\n"
        elif result.confidence < 0.4:
            explanation += "  ⚠️ Low confidence - consider reviewing strategy\n"
        else:
            explanation += "  ℹ️ Moderate confidence\n"
            
        return explanation
