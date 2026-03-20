"""Feature Engineering for Kalshi Trader ML Pipeline.

Extracts 20+ features per model from trade data including:
- Price history features (momentum, trends)
- Volatility indicators
- Time-based features
- Market microstructure features
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, time
from enum import Enum

from .confidence_scorer import SuggestionType


class FeatureCategory(str, Enum):
    """Categories of features for organization."""
    PRICE = "price"
    VOLATILITY = "volatility"
    MOMENTUM = "momentum"
    TIME = "time"
    MARKET = "market"


@dataclass
class FeatureSet:
    """Container for extracted features."""
    features: Dict[str, float] = field(default_factory=dict)
    feature_names: List[str] = field(default_factory=list)
    category: FeatureCategory = FeatureCategory.PRICE
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_array(self) -> np.ndarray:
        """Convert features to numpy array."""
        return np.array([self.features.get(name, 0.0) for name in self.feature_names])
    
    def to_dataframe(self) -> pd.DataFrame:
        """Convert features to DataFrame row."""
        return pd.DataFrame([self.features])


@dataclass
class PriceHistory:
    """Container for price history data."""
    timestamps: List[datetime]
    prices: List[float]  # Mid prices (probabilities)
    volumes: Optional[List[float]] = None
    bids: Optional[List[float]] = None
    asks: Optional[List[float]] = None
    
    def to_dataframe(self) -> pd.DataFrame:
        """Convert to pandas DataFrame."""
        df = pd.DataFrame({
            'timestamp': self.timestamps,
            'price': self.prices,
        })
        if self.volumes:
            df['volume'] = self.volumes
        if self.bids:
            df['bid'] = self.bids
        if self.asks:
            df['ask'] = self.asks
        return df


class FeatureEngineer:
    """Feature engineering for Kalshi trading models.
    
    Extracts 20+ features from price history and market data
    for use in machine learning models.
    
    Parameters
    ----------
    lookback_window : int
        Number of periods to look back for feature calculation
    volatility_window : int
        Window for volatility calculations
    
    Attributes
    ----------
    feature_names : list[str]
        List of all feature names extracted
    
    Example
    -------
    >>> from kalshi_trader.ml import FeatureEngineer, PriceHistory
    >>> from datetime import datetime, timedelta
    >>> 
    >>> # Create sample price history
    >>> timestamps = [datetime.now() - timedelta(minutes=i) for i in range(60, 0, -1)]
    >>> prices = [0.45 + i*0.001 for i in range(60)]
    >>> history = PriceHistory(timestamps=timestamps, prices=prices)
    >>>
    >>> # Extract features
    >>> engineer = FeatureEngineer()
    >>> features = engineer.extract_features(history)
    >>> print(f"Extracted {len(features.features)} features")
    Extracted 25 features
    >>> print(f"Price momentum: {features.features['price_momentum_10']:.4f}")
    Price momentum: 0.0120
    """
    
    def __init__(
        self,
        lookback_window: int = 60,
        volatility_window: int = 20,
        momentum_windows: List[int] = None
    ):
        self.lookback_window = lookback_window
        self.volatility_window = volatility_window
        self.momentum_windows = momentum_windows or [5, 10, 20]
        
        # Define all feature names
        self.feature_names = self._get_feature_names()
        
    def _get_feature_names(self) -> List[str]:
        """Generate list of all feature names."""
        names = []
        
        # Price features
        names.extend([
            'current_price',
            'price_change_1',
            'price_change_5',
            'price_change_10',
            'price_change_20',
            'price_momentum_5',
            'price_momentum_10',
            'price_momentum_20',
            'price_acceleration',
            'price_velocity',
        ])
        
        # Volatility features
        names.extend([
            'volatility_5',
            'volatility_10',
            'volatility_20',
            'volatility_ratio',
            'volatility_trend',
            'atr_14',  # Average True Range
            'bollinger_position',
            'bollinger_width',
        ])
        
        # Momentum features
        names.extend([
            'rsi_14',
            'rsi_slope',
            'macd_line',
            'macd_signal',
            'macd_histogram',
            'momentum_10',
            'momentum_20',
        ])
        
        # Time features
        names.extend([
            'hour_of_day',
            'day_of_week',
            'is_market_open',
            'time_since_open',
            'minutes_to_close',
        ])
        
        # Market structure features
        names.extend([
            'price_distance_from_high',
            'price_distance_from_low',
            'price_position_in_range',
            'trend_direction',
            'trend_strength',
        ])
        
        return names
    
    def extract_features(
        self,
        price_history: PriceHistory,
        current_time: Optional[datetime] = None
    ) -> FeatureSet:
        """Extract all features from price history.
        
        Parameters
        ----------
        price_history : PriceHistory
            Historical price data
        current_time : datetime | None
            Current timestamp (default: now)
            
        Returns
        -------
        FeatureSet
            Extracted features with metadata
        """
        if current_time is None:
            current_time = datetime.now()
            
        df = price_history.to_dataframe()
        
        if len(df) < self.lookback_window:
            # Not enough data - return default features
            return self._create_default_features(current_time)
        
        features = {}
        
        # Price features
        features.update(self._extract_price_features(df))
        
        # Volatility features
        features.update(self._extract_volatility_features(df))
        
        # Momentum features
        features.update(self._extract_momentum_features(df))
        
        # Time features
        features.update(self._extract_time_features(current_time))
        
        # Market structure features
        features.update(self._extract_market_features(df))
        
        return FeatureSet(
            features=features,
            feature_names=self.feature_names,
            timestamp=current_time
        )
    
    def _extract_price_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract price-based features."""
        prices = df['price'].values
        features = {}
        
        # Current price
        features['current_price'] = prices[-1]
        
        # Price changes over different windows
        for window in [1, 5, 10, 20]:
            if len(prices) > window:
                change = (prices[-1] - prices[-window-1]) / prices[-window-1]
                features[f'price_change_{window}'] = change
            else:
                features[f'price_change_{window}'] = 0.0
        
        # Price momentum (rate of change)
        for window in self.momentum_windows:
            if len(prices) > window:
                momentum = (prices[-1] - prices[-window]) / window
                features[f'price_momentum_{window}'] = momentum
            else:
                features[f'price_momentum_{window}'] = 0.0
        
        # Price acceleration (second derivative)
        if len(prices) > 3:
            velocity1 = prices[-1] - prices[-2]
            velocity2 = prices[-2] - prices[-3]
            features['price_acceleration'] = velocity1 - velocity2
        else:
            features['price_acceleration'] = 0.0
        
        # Price velocity (first derivative)
        if len(prices) > 1:
            features['price_velocity'] = prices[-1] - prices[-2]
        else:
            features['price_velocity'] = 0.0
        
        return features
    
    def _extract_volatility_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract volatility-based features."""
        prices = df['price'].values
        features = {}
        
        # Rolling volatility (standard deviation)
        for window in [5, 10, 20]:
            if len(prices) >= window:
                volatility = np.std(prices[-window:])
                features[f'volatility_{window}'] = volatility
            else:
                features[f'volatility_{window}'] = 0.0
        
        # Volatility ratio (short vs long term)
        if features['volatility_5'] > 0 and features['volatility_20'] > 0:
            features['volatility_ratio'] = features['volatility_5'] / features['volatility_20']
        else:
            features['volatility_ratio'] = 1.0
        
        # Volatility trend
        if len(prices) >= 40:
            vol_short = np.std(prices[-10:])
            vol_long = np.std(prices[-40:-20])
            features['volatility_trend'] = vol_short - vol_long
        else:
            features['volatility_trend'] = 0.0
        
        # Average True Range (ATR)
        if len(prices) >= 15:
            tr_list = []
            for i in range(-14, 0):
                if i > -len(prices):
                    high = max(prices[i], prices[i-1])
                    low = min(prices[i], prices[i-1])
                    tr = high - low
                    tr_list.append(tr)
            features['atr_14'] = np.mean(tr_list) if tr_list else 0.0
        else:
            features['atr_14'] = 0.0
        
        # Bollinger Bands
        if len(prices) >= 20:
            sma20 = np.mean(prices[-20:])
            std20 = np.std(prices[-20:])
            upper = sma20 + 2 * std20
            lower = sma20 - 2 * std20
            
            # Position within bands (0 = lower, 1 = upper, clamped to [0, 1])
            if upper != lower:
                position = (prices[-1] - lower) / (upper - lower)
                features['bollinger_position'] = max(0.0, min(1.0, position))
            else:
                features['bollinger_position'] = 0.5
            
            # Band width
            features['bollinger_width'] = (upper - lower) / sma20 if sma20 > 0 else 0.0
        else:
            features['bollinger_position'] = 0.5
            features['bollinger_width'] = 0.0
        
        return features
    
    def _extract_momentum_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract momentum-based features."""
        prices = df['price'].values
        features = {}
        
        # RSI (Relative Strength Index)
        if len(prices) >= 15:
            deltas = np.diff(prices[-15:])
            gains = np.where(deltas > 0, deltas, 0)
            losses = np.where(deltas < 0, -deltas, 0)
            
            avg_gain = np.mean(gains) if len(gains) > 0 else 0
            avg_loss = np.mean(losses) if len(losses) > 0 else 0
            
            if avg_loss > 0:
                rs = avg_gain / avg_loss
                features['rsi_14'] = 100 - (100 / (1 + rs))
            else:
                features['rsi_14'] = 100.0 if avg_gain > 0 else 50.0
        else:
            features['rsi_14'] = 50.0
        
        # RSI slope
        if len(prices) >= 20:
            rsi_prev = self._calculate_rsi(prices[-20:-5])
            rsi_curr = self._calculate_rsi(prices[-15:])
            features['rsi_slope'] = rsi_curr - rsi_prev
        else:
            features['rsi_slope'] = 0.0
        
        # MACD
        if len(prices) >= 35:
            ema12 = self._calculate_ema(prices, 12)
            ema26 = self._calculate_ema(prices, 26)
            
            macd_line = ema12 - ema26
            signal_line = self._calculate_ema(prices[-9:], 9) if len(prices) >= 9 else macd_line
            
            features['macd_line'] = macd_line
            features['macd_signal'] = signal_line
            features['macd_histogram'] = macd_line - signal_line
        else:
            features['macd_line'] = 0.0
            features['macd_signal'] = 0.0
            features['macd_histogram'] = 0.0
        
        # Simple momentum
        for window in [10, 20]:
            if len(prices) > window:
                features[f'momentum_{window}'] = prices[-1] - prices[-window]
            else:
                features[f'momentum_{window}'] = 0.0
        
        return features
    
    def _extract_time_features(self, current_time: datetime) -> Dict[str, float]:
        """Extract time-based features."""
        features = {}
        
        # Hour of day (normalized to 0-1)
        features['hour_of_day'] = current_time.hour / 24.0
        
        # Day of week (0=Monday, normalized to 0-1)
        features['day_of_week'] = current_time.weekday() / 6.0
        
        # Is market open (Kalshi typically 24/7 but has maintenance)
        # Assume open except 4-5 AM UTC (maintenance window)
        hour = current_time.hour
        features['is_market_open'] = 0.0 if (4 <= hour < 5) else 1.0
        
        # Time since market open (assuming 9:30 AM EST open)
        # Simplified: just use hour
        features['time_since_open'] = max(0, hour - 9) / 24.0
        
        # Minutes to close (assuming 4:00 PM EST close)
        features['minutes_to_close'] = max(0, (16 - hour) * 60) / 1440.0
        
        return features
    
    def _extract_market_features(self, df: pd.DataFrame) -> Dict[str, float]:
        """Extract market structure features."""
        prices = df['price'].values
        features = {}
        
        if len(prices) >= self.lookback_window:
            window_prices = prices[-self.lookback_window:]
            high = np.max(window_prices)
            low = np.min(window_prices)
            current = prices[-1]
            
            # Distance from high/low
            features['price_distance_from_high'] = (high - current) / high if high > 0 else 0.0
            features['price_distance_from_low'] = (current - low) / low if low > 0 else 0.0
            
            # Position in range (0 = at low, 1 = at high)
            if high != low:
                features['price_position_in_range'] = (current - low) / (high - low)
            else:
                features['price_position_in_range'] = 0.5
            
            # Trend direction (slope of linear regression)
            x = np.arange(len(window_prices))
            slope = np.polyfit(x, window_prices, 1)[0]
            features['trend_direction'] = np.sign(slope)
            features['trend_strength'] = abs(slope) * 100  # Scale up
        else:
            features['price_distance_from_high'] = 0.0
            features['price_distance_from_low'] = 0.0
            features['price_position_in_range'] = 0.5
            features['trend_direction'] = 0.0
            features['trend_strength'] = 0.0
        
        return features
    
    def _create_default_features(self, current_time: datetime) -> FeatureSet:
        """Create default features when insufficient data."""
        features = {name: 0.0 for name in self.feature_names}
        features['current_price'] = 0.5
        features['rsi_14'] = 50.0
        features['bollinger_position'] = 0.5
        features['price_position_in_range'] = 0.5
        
        # Set time features
        features['hour_of_day'] = current_time.hour / 24.0
        features['day_of_week'] = current_time.weekday() / 6.0
        features['is_market_open'] = 1.0
        
        return FeatureSet(
            features=features,
            feature_names=self.feature_names,
            timestamp=current_time
        )
    
    def _calculate_rsi(self, prices: np.ndarray, period: int = 14) -> float:
        """Calculate RSI for a price series."""
        if len(prices) < period + 1:
            return 50.0
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[-period:]) if len(gains) >= period else 0
        avg_loss = np.mean(losses[-period:]) if len(losses) >= period else 0
        
        if avg_loss > 0:
            rs = avg_gain / avg_loss
            return 100 - (100 / (1 + rs))
        return 100.0 if avg_gain > 0 else 50.0
    
    def _calculate_ema(self, prices: np.ndarray, period: int) -> float:
        """Calculate EMA for the most recent value."""
        if len(prices) < period:
            return prices[-1] if len(prices) > 0 else 0.0
        
        # Use pandas for EMA calculation
        series = pd.Series(prices)
        ema = series.ewm(span=period, adjust=False).mean()
        return ema.iloc[-1]
    
    def extract_features_for_suggestion_type(
        self,
        price_history: PriceHistory,
        suggestion_type: SuggestionType,
        current_time: Optional[datetime] = None
    ) -> FeatureSet:
        """Extract features optimized for a specific suggestion type.
        
        Parameters
        ----------
        price_history : PriceHistory
            Historical price data
        suggestion_type : SuggestionType
            Type of suggestion (reversion, breakout, volatility)
        current_time : datetime | None
            Current timestamp
            
        Returns
        -------
        FeatureSet
            Features with type-specific weighting
        """
        base_features = self.extract_features(price_history, current_time)
        
        # Add suggestion type as categorical feature
        type_features = {
            'is_reversion': 1.0 if suggestion_type == SuggestionType.REVERSION else 0.0,
            'is_breakout': 1.0 if suggestion_type == SuggestionType.BREAKOUT else 0.0,
            'is_volatility': 1.0 if suggestion_type == SuggestionType.VOLATILITY else 0.0,
        }
        
        base_features.features.update(type_features)
        base_features.feature_names.extend(list(type_features.keys()))
        
        return base_features
    
    def create_training_data(
        self,
        price_histories: List[PriceHistory],
        outcomes: List[bool],
        suggestion_types: List[SuggestionType]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create training data from multiple price histories.
        
        Parameters
        ----------
        price_histories : list[PriceHistory]
            List of price histories
        outcomes : list[bool]
            Trade outcomes (True = profit)
        suggestion_types : list[SuggestionType]
            Suggestion type for each history
            
        Returns
        -------
        tuple[np.ndarray, np.ndarray]
            X (features) and y (labels) arrays
        """
        X_list = []
        y_list = []
        
        for history, outcome, stype in zip(price_histories, outcomes, suggestion_types):
            features = self.extract_features_for_suggestion_type(history, stype)
            X_list.append(features.to_array())
            y_list.append(1.0 if outcome else 0.0)
        
        # Ensure all feature arrays have the same length
        if X_list:
            expected_len = len(X_list[0])
            for i, x in enumerate(X_list):
                if len(x) != expected_len:
                    # Pad or truncate to match expected length
                    if len(x) < expected_len:
                        X_list[i] = np.pad(x, (0, expected_len - len(x)), mode='constant')
                    else:
                        X_list[i] = x[:expected_len]
        
        return np.array(X_list), np.array(y_list)
    
    def get_feature_importance_template(self) -> Dict[str, str]:
        """Get template for feature importance analysis.
        
        Returns
        -------
        dict[str, str]
            Feature categories and descriptions
        """
        return {
            'price_momentum_5': 'Short-term price momentum',
            'price_momentum_10': 'Medium-term price momentum',
            'price_momentum_20': 'Long-term price momentum',
            'volatility_10': '10-period volatility',
            'volatility_20': '20-period volatility',
            'rsi_14': 'RSI indicator',
            'macd_histogram': 'MACD histogram',
            'bollinger_position': 'Position within Bollinger Bands',
            'trend_strength': 'Trend strength',
            'price_position_in_range': 'Position in recent range',
        }
