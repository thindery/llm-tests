"""ML-enhanced Trading Integration.

Integrates the ML pipeline with the existing momentum strategy,
providing seamless ML-enhanced trade suggestions with graceful degradation.
"""

from __future__ import annotations

import logging
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable, Tuple

from .ml_pipeline import MLPipeline, MLPrediction, create_pipeline
from .config import MLConfig, MLFeatureLevel, load_config
from .confidence_scorer import SuggestionType
from .feature_engineering import FeatureEngineer, PriceHistory
from .safety_controls import SafetyControls, SafetyStatus

logger = logging.getLogger(__name__)


@dataclass
class TradeSuggestion:
    """ML-enhanced trade suggestion."""
    suggestion_type: SuggestionType
    should_trade: bool
    confidence: float
    bayesian_confidence: float
    ml_confidence: float
    combined_confidence: float
    
    # Metadata
    model_version: Optional[str] = None
    ml_enabled: bool = True
    safety_check_passed: bool = True
    graduation_status: Dict[str, Any] = field(default_factory=dict)
    
    # Fallback info
    used_fallback: bool = False
    fallback_reason: Optional[str] = None
    
    # Feature data
    features: Dict[str, float] = field(default_factory=dict)
    
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'suggestion_type': self.suggestion_type.value,
            'should_trade': self.should_trade,
            'confidence': self.confidence,
            'bayesian_confidence': self.bayesian_confidence,
            'ml_confidence': self.ml_confidence,
            'combined_confidence': self.combined_confidence,
            'model_version': self.model_version,
            'ml_enabled': self.ml_enabled,
            'safety_check_passed': self.safety_check_passed,
            'graduation_status': self.graduation_status,
            'used_fallback': self.used_fallback,
            'fallback_reason': self.fallback_reason,
            'features': self.features,
            'timestamp': self.timestamp.isoformat(),
        }


@dataclass
class MLEnhancedTrade:
    """ML-enhanced trade execution info."""
    trade_id: str
    suggestion_type: SuggestionType
    entry_price: float
    position_size: float
    confidence: float
    
    # ML info
    ml_confidence: float
    ml_enabled: bool
    model_version: Optional[str]
    
    # Safety
    safety_metrics: Dict[str, Any] = field(default_factory=dict)
    
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'trade_id': self.trade_id,
            'suggestion_type': self.suggestion_type.value,
            'entry_price': self.entry_price,
            'position_size': self.position_size,
            'confidence': self.confidence,
            'ml_confidence': self.ml_confidence,
            'ml_enabled': self.ml_enabled,
            'model_version': self.model_version,
            'safety_metrics': self.safety_metrics,
            'timestamp': self.timestamp.isoformat(),
        }


class MLEnhancedTrader:
    """ML-enhanced trader that integrates with momentum strategy.
    
    This class provides:
    - Seamless ML integration with fallbacks
    - Momentum-only mode when ML is disabled
    - Combined ML + momentum scoring
    - Graceful degradation on ML failures
    
    Parameters
    ----------
    config : MLConfig | None
        ML configuration
    pipeline : MLPipeline | None  
        Pre-configured ML pipeline
    feature_engineer : FeatureEngineer | None
        Feature engineer instance
    
    Example
    -------
    >>> from kalshi_trader.ml import MLEnhancedTrader
    >>> trader = MLEnhancedTrader()
    >>> trader.initialize(balance=1000.0)
    ...
    >>> # Get ML-enhanced suggestion
    >>> suggestion = trader.get_suggestion(price_history, SuggestionType.BREAKOUT)
    >>> if suggestion.should_trade:
    ...     size = trader.calculate_position_size(suggestion)
    ...     trader.execute_trade(trade_id, suggestion, size)
    """
    
    def __init__(
        self,
        config: Optional[MLConfig] = None,
        pipeline: Optional[MLPipeline] = None,
        feature_engineer: Optional[FeatureEngineer] = None,
    ):
        self.config = config or load_config()
        self.pipeline = pipeline
        self.feature_engineer = feature_engineer or FeatureEngineer()
        
        self._initialized = False
        self._ml_available = False
        self._fallback_count = 0
        self._total_requests = 0
        
        # Metrics storage
        self._recent_suggestions: List[TradeSuggestion] = []
        self._max_recent = 100
        
        # Callbacks
        self._on_circuit_breaker: Optional[Callable] = None
        self._on_ml_failure: Optional[Callable] = None
    
    def initialize(self, balance: float = 1000.0) -> None:
        """Initialize the ML-enhanced trader.
        
        Parameters
        ----------
        balance : float
            Starting account balance
        """
        logger.info(f"Initializing ML-enhanced trader (level: {self.config.integration.ml_feature_level.value})")
        
        # Initialize ML pipeline if needed and enabled
        if self.config.integration.ml_feature_level != MLFeatureLevel.DISABLED:
            try:
                if self.pipeline is None:
                    self.pipeline = create_pipeline(
                        db_path=self.config.db_path,
                        registry_path=self.config.model_registry_path,
                        balance=balance,
                    )
                
                self.pipeline.initialize(balance=balance)
                self._ml_available = True
                logger.info("ML pipeline initialized successfully")
                
            except Exception as e:
                self._ml_available = False
                logger.error(f"ML pipeline initialization failed: {e}")
                
                if self.config.integration.ml_feature_level == MLFeatureLevel.FULL:
                    raise RuntimeError(f"ML required but initialization failed: {e}")
        
        self._initialized = True
        logger.info("ML-enhanced trader initialization complete")
    
    def get_suggestion(
        self,
        price_history: PriceHistory,
        suggestion_type: SuggestionType,
        momentum_confidence: Optional[float] = None,
        momentum_signal_strength: Optional[float] = None,
    ) -> TradeSuggestion:
        """Get ML-enhanced trade suggestion.
        
        Combines momentum strategy signal with ML prediction
        based on configured ML feature level.
        
        Parameters
        ----------
        price_history : PriceHistory
            Historical price data
        suggestion_type : SuggestionType
            Type of suggestion
        momentum_confidence : float | None
            Confidence from momentum strategy (0.0-1.0)
        momentum_signal_strength : float | None
            Raw momentum signal strength
            
        Returns
        -------
        TradeSuggestion
            Enhanced trade suggestion with confidence scores
        """
        self._total_requests += 1
        
        if not self._initialized:
            raise RuntimeError("MLEnhancedTrader not initialized. Call initialize() first.")
        
        # Determine ML usage based on feature level
        use_ml = self._should_use_ml()
        
        if use_ml and self._ml_available:
            try:
                ml_suggestion = self._get_ml_suggestion(
                    price_history,
                    suggestion_type,
                    momentum_confidence,
                )
                self._recent_suggestions.append(ml_suggestion)
                self._trim_recent_suggestions()
                return ml_suggestion
                
            except Exception as e:
                self._fallback_count += 1
                logger.warning(f"ML prediction failed: {e}")
                
                if self._on_ml_failure:
                    self._on_ml_failure(e)
                
                if not self.config.integration.fallback_to_momentum:
                    raise
                
                return self._get_fallback_suggestion(
                    suggestion_type,
                    momentum_confidence,
                    f"ML failure: {str(e)}"
                )
        
        # Momentum-only mode
        return self._get_momentum_only_suggestion(
            suggestion_type,
            momentum_confidence,
        )
    
    def _should_use_ml(self) -> bool:
        """Check if ML should be used based on feature level."""
        level = self.config.integration.ml_feature_level
        
        if level == MLFeatureLevel.DISABLED:
            return False
        elif level == MLFeatureLevel.FULL:
            return True
        else:
            # SHADOW or ENHANCED
            return self._ml_available
    
    def _get_ml_suggestion(
        self,
        price_history: PriceHistory,
        suggestion_type: SuggestionType,
        momentum_confidence: Optional[float],
    ) -> TradeSuggestion:
        """Get ML-based suggestion."""
        # Get ML prediction
        ml_prediction = self.pipeline.predict(
            price_history=price_history,
            suggestion_type=suggestion_type,
            use_ml=True,
            confidence_threshold=self.config.integration.momentum_confidence_threshold,
            check_safety=self.config.integration.enable_safety_controls,
        )
        
        # Blend with momentum confidence if provided
        if momentum_confidence is not None:
            blended_confidence = self._blend_confidences(
                momentum_confidence,
                ml_prediction.combined_confidence,
            )
        else:
            blended_confidence = ml_prediction.combined_confidence
        
        return TradeSuggestion(
            suggestion_type=suggestion_type,
            should_trade=ml_prediction.should_trade,
            confidence=blended_confidence,
            bayesian_confidence=ml_prediction.confidence,
            ml_confidence=ml_prediction.ml_confidence,
            combined_confidence=blended_confidence,
            model_version=ml_prediction.model_version,
            ml_enabled=True,
            safety_check_passed=ml_prediction.safety_check_passed,
            graduation_status=ml_prediction.graduation_status,
            used_fallback=False,
            fallback_reason=None,
            features=ml_prediction.features_used,
        )
    
    def _get_momentum_only_suggestion(
        self,
        suggestion_type: SuggestionType,
        momentum_confidence: Optional[float],
    ) -> TradeSuggestion:
        """Get momentum-only suggestion."""
        confidence = momentum_confidence or 0.5
        
        return TradeSuggestion(
            suggestion_type=suggestion_type,
            should_trade=confidence >= self.config.integration.momentum_confidence_threshold,
            confidence=confidence,
            bayesian_confidence=confidence,
            ml_confidence=0.0,
            combined_confidence=confidence,
            model_version=None,
            ml_enabled=False,
            safety_check_passed=True,
            graduation_status={'mode': 'momentum_only'},
            used_fallback=False,
            fallback_reason=None,
        )
    
    def _get_fallback_suggestion(
        self,
        suggestion_type: SuggestionType,
        momentum_confidence: Optional[float],
        reason: str,
    ) -> TradeSuggestion:
        """Get fallback suggestion when ML fails."""
        confidence = momentum_confidence or 0.5
        
        return TradeSuggestion(
            suggestion_type=suggestion_type,
            should_trade=confidence >= self.config.integration.momentum_confidence_threshold,
            confidence=confidence,
            bayesian_confidence=confidence,
            ml_confidence=0.0,
            combined_confidence=confidence,
            model_version=None,
            ml_enabled=False,
            safety_check_passed=True,
            graduation_status={'mode': 'fallback'},
            used_fallback=True,
            fallback_reason=reason,
        )
    
    def _blend_confidences(
        self,
        momentum_confidence: float,
        ml_confidence: float,
    ) -> float:
        """Blend momentum and ML confidences."""
        # Weight based on configured weights
        bayesian_weight = self.config.integration.bayesian_weight
        ml_weight = self.config.integration.ml_weight
        
        blended = (bayesian_weight * momentum_confidence) + (ml_weight * ml_confidence)
        
        # Override if ML is very confident
        if ml_confidence >= self.config.integration.ml_override_threshold:
            blended = max(blended, ml_confidence)
        
        return min(max(blended, 0.0), 1.0)
    
    def calculate_position_size(
        self,
        suggestion: TradeSuggestion,
    ) -> float:
        """Calculate position size for a trade suggestion.
        
        Parameters
        ----------
        suggestion : TradeSuggestion
            Trade suggestion from get_suggestion()
            
        Returns
        -------
        float
            Position size in dollars
        """
        if not self.config.integration.enable_auto_position_sizing:
            return 0.0
        
        if self._ml_available and self.pipeline:
            return self.pipeline.calculate_position_size(
                confidence=suggestion.combined_confidence,
                suggestion_type=suggestion.suggestion_type,
            )
        
        # Fallback: simple fixed percentage
        # Would typically call into existing momentum strategy
        return 100.0  # Default $100 position
    
    def execute_trade(
        self,
        trade_id: str,
        suggestion: TradeSuggestion,
        entry_price: float,
    ) -> MLEnhancedTrade:
        """Record trade execution in ML pipeline.
        
        Parameters
        ----------
        trade_id : str
            Unique trade identifier
        suggestion : TradeSuggestion
            Trade suggestion
        entry_price : float
            Entry price
            
        Returns
        -------
        MLEnhancedTrade
            Trade execution info
        """
        position_size = self.calculate_position_size(suggestion)
        
        if self._ml_available and self.pipeline and self.config.integration.enable_safety_controls:
            self.pipeline.record_position_opened(position_size)
            safety_metrics = self.pipeline.get_safety_status()
        else:
            safety_metrics = {}
        
        return MLEnhancedTrade(
            trade_id=trade_id,
            suggestion_type=suggestion.suggestion_type,
            entry_price=entry_price,
            position_size=position_size,
            confidence=suggestion.confidence,
            ml_confidence=suggestion.ml_confidence,
            ml_enabled=suggestion.ml_enabled,
            model_version=suggestion.model_version,
            safety_metrics=safety_metrics,
        )
    
    def close_trade(
        self,
        trade: MLEnhancedTrade,
        exit_price: float,
        pnl: float,
        price_history: Optional[PriceHistory] = None,
    ) -> Dict[str, Any]:
        """Close a trade and update ML pipeline.
        
        Parameters
        ----------
        trade : MLEnhancedTrade
            Trade to close
        exit_price : float
            Exit price
        pnl : float
            Profit/loss
        price_history : PriceHistory | None
            Price history at trade time
            
        Returns
        -------
        dict
            Trade outcome record
        """
        if not self._ml_available or not self.pipeline:
            return {'trade_id': trade.trade_id, 'pnl': pnl}
        
        try:
            if price_history is None:
                # Create minimal price history if not provided
                price_history = PriceHistory(
                    prices=[],
                    market_id="unknown",
                    interval_seconds=60,
                )
            
            outcome = self.pipeline.record_trade_outcome(
                trade_id=trade.trade_id,
                suggestion_type=trade.suggestion_type,
                price_history=price_history,
                entry_price=trade.entry_price,
                exit_price=exit_price,
                pnl=pnl,
                position_size=trade.position_size,
            )
            
            # Check if circuit breaker triggered
            safety = self.pipeline.get_safety_status()
            if safety.get('state', {}).get('status') == SafetyStatus.CIRCUIT_BREAKER.value:
                if self._on_circuit_breaker:
                    self._on_circuit_breaker(safety)
            
            return outcome
            
        except Exception as e:
            logger.error(f"Failed to record trade outcome: {e}")
            return {'trade_id': trade.trade_id, 'pnl': pnl, 'error': str(e)}
    
    def get_safety_status(self) -> Optional[Dict[str, Any]]:
        """Get current safety status."""
        if not self._ml_available or not self.pipeline:
            return None
        return self.pipeline.get_safety_status()
    
    def can_trade(self) -> bool:
        """Check if trading is currently allowed."""
        if not self._ml_available or not self.pipeline:
            return True  # Assume OK if no ML
        
        if self.config.integration.enable_safety_controls:
            safety = self.get_safety_status()
            return safety.get('state', {}).get('is_trading_allowed', True)
        
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """Get trader statistics."""
        return {
            'initialized': self._initialized,
            'ml_available': self._ml_available,
            'ml_feature_level': self.config.integration.ml_feature_level.value,
            'total_requests': self._total_requests,
            'fallback_count': self._fallback_count,
            'fallback_rate': self._fallback_count / max(self._total_requests, 1),
            'recent_suggestions_count': len(self._recent_suggestions),
        }
    
    def _trim_recent_suggestions(self) -> None:
        """Trim recent suggestions cache."""
        if len(self._recent_suggestions) > self._max_recent:
            self._recent_suggestions = self._recent_suggestions[-self._max_recent:]
    
    def set_callbacks(
        self,
        on_circuit_breaker: Optional[Callable] = None,
        on_ml_failure: Optional[Callable] = None,
    ) -> None:
        """Set callback functions.
        
        Parameters
        ----------
        on_circuit_breaker : callable | None
            Called when circuit breaker triggers
        on_ml_failure : callable | None
            Called when ML prediction fails
        """
        self._on_circuit_breaker = on_circuit_breaker
        self._on_ml_failure = on_ml_failure
    
    def reset_daily_stats(self) -> None:
        """Reset daily statistics (call at market open)."""
        if self._ml_available and self.pipeline:
            self.pipeline.reset_daily_stats()
        logger.info("Daily stats reset")


class MLTradingLoop:
    """Main trading loop with ML integration.
    
    Wraps the existing momentum strategy with ML enhancements.
    
    Parameters
    ----------
    momentum_strategy : object
        Existing momentum strategy instance
    config : MLConfig | None
        ML configuration
    """
    
    def __init__(
        self,
        momentum_strategy: Any,
        config: Optional[MLConfig] = None,
    ):
        self.momentum_strategy = momentum_strategy
        self.config = config or load_config()
        self.ml_trader = MLEnhancedTrader(config=self.config)
        
        self._running = False
        self._trade_count = 0
    
    def initialize(self, balance: float = 1000.0) -> None:
        """Initialize the trading loop."""
        self.ml_trader.initialize(balance=balance)
        
        # Set up callbacks
        self.ml_trader.set_callbacks(
            on_circuit_breaker=self._on_circuit_breaker,
            on_ml_failure=self._on_ml_failure,
        )
        
        logger.info("ML trading loop initialized")
    
    def evaluate_signal(
        self,
        price_history: PriceHistory,
        suggestion_type: SuggestionType,
    ) -> TradeSuggestion:
        """Evaluate trading signal with ML enhancement.
        
        This method wraps the existing momentum strategy's
        signal evaluation with ML enhancement.
        
        Parameters
        ----------
        price_history : PriceHistory
            Historical price data
        suggestion_type : SuggestionType
            Type of trading signal
            
        Returns
        -------
        TradeSuggestion
            ML-enhanced trade suggestion
        """
        # Get momentum strategy signal
        momentum_confidence = 0.5
        momentum_signal = None
        
        try:
            # Call into momentum strategy if available
            if hasattr(self.momentum_strategy, 'evaluate_signal'):
                momentum_signal = self.momentum_strategy.evaluate_signal(
                    price_history,
                    suggestion_type.value,
                )
                if momentum_signal:
                    momentum_confidence = momentum_signal.get('confidence', 0.5)
            elif hasattr(self.momentum_strategy, 'get_confidence'):
                momentum_confidence = self.momentum_strategy.get_confidence(
                    suggestion_type.value,
                )
        except Exception as e:
            logger.warning(f"Momentum strategy signal failed: {e}")
        
        # Get ML-enhanced suggestion
        return self.ml_trader.get_suggestion(
            price_history=price_history,
            suggestion_type=suggestion_type,
            momentum_confidence=momentum_confidence,
            momentum_signal_strength=momentum_signal.get('strength') if momentum_signal else None,
        )
    
    def _on_circuit_breaker(self, safety_status: Dict[str, Any]) -> None:
        """Handle circuit breaker trigger."""
        logger.warning(f"Circuit breaker triggered: {safety_status}")
        # Could emit alert here
    
    def _on_ml_failure(self, error: Exception) -> None:
        """Handle ML failure."""
        logger.warning(f"ML failure: {error}")
    
    def start(self) -> None:
        """Start the trading loop."""
        self._running = True
        logger.info("ML trading loop started")
    
    def stop(self) -> None:
        """Stop the trading loop."""
        self._running = False
        logger.info("ML trading loop stopped")
    
    @property
    def is_running(self) -> bool:
        """Check if trading loop is running."""
        return self._running
    
    def get_status(self) -> Dict[str, Any]:
        """Get trading loop status."""
        return {
            'running': self._running,
            'trade_count': self._trade_count,
            'ml_stats': self.ml_trader.get_stats(),
            'safety_status': self.ml_trader.get_safety_status(),
        }


def create_ml_trader(
    config_path: Optional[str] = None,
    balance: float = 1000.0,
) -> MLEnhancedTrader:
    """Create and initialize an ML-enhanced trader.
    
    Parameters
    ----------
    config_path : str | None
        Path to configuration file
    balance : float
        Starting balance
        
    Returns
    -------
    MLEnhancedTrader
        Initialized ML trader
    """
    config = load_config(config_path)
    trader = MLEnhancedTrader(config=config)
    trader.initialize(balance=balance)
    return trader
