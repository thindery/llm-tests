"""Kalshi Trader - Prediction market trading toolkit."""

__version__ = "0.2.0"

# ML Pipeline imports
from kalshi_trader.ml import (
    ConfidenceScorer,
    SuggestionType,
    ABTesting,
    ABMetrics,
    ABAssignment,
    MLDatabase,
)

__all__ = [
    "ConfidenceScorer",
    "SuggestionType",
    "ABTesting",
    "ABMetrics",
    "ABAssignment",
    "MLDatabase",
]
