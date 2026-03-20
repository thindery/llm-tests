# ML Pipeline Phase 2: Confidence Scoring & A/B Testing

**Ticket:** REMY-190  
**Status:** ✅ Complete  
**Date:** 2026-03-19

---

## Overview

Phase 2 of the Kalshi Trader ML Pipeline implements:

1. **Confidence Scorer** - Bayesian confidence calculation per suggestion type (reversion, breakout, volatility)
2. **A/B Testing Framework** - 50/50 group assignment with metrics tracking
3. **Real-time Dashboard** - Streamlit visualization of confidence trends and A/B results

---

## Installation

### Requirements

```bash
pip install streamlit plotly pandas numpy scipy
```

### Project Structure

```
src/kalshi_trader/
├── __init__.py           # Package exports
├── dashboard.py          # Streamlit dashboard
├── ml/
│   ├── __init__.py       # ML module exports
│   ├── confidence_scorer.py  # Bayesian confidence logic
│   ├── ab_testing.py     # A/B framework
│   └── database.py       # SQLite data layer
└── research/
    └── client.py         # Kalshi API client
```

---

## Quick Start

### 1. Initialize the System

```python
from kalshi_trader.ml import ConfidenceScorer, ABTesting

# Initialize components
scorer = ConfidenceScorer()
scorer.initialize()

ab = ABTesting()
ab.initialize()
```

### 2. Check Confidence Before Trading

```python
from kalshi_trader.ml import SuggestionType

# Get confidence for a suggestion type
confidence = scorer.get_confidence(SuggestionType.BREAKOUT)
print(f"Breakout confidence: {confidence:.1%}")

# Detailed confidence info
result = scorer.get_confidence_detailed(SuggestionType.BREAKOUT)
print(f"95% CI: [{result.credible_interval[0]:.1%}, {result.credible_interval[1]:.1%}]")
print(f"Samples: {result.sample_size}")
```

### 3. Execute A/B Test

```python
# Assign user to A/B group
group = ab.assign_group("user_123", "2026-03-19")
print(f"Assigned to: {group}")  # 'control' or 'treatment'

# Record a trade
trade_id = "trade_001"
ab.record_trade_outcome(
    trade_id=trade_id,
    user_id="user_123",
    group_assignment=group,
    suggestion_type="breakout",
    confidence=0.75,
    entry_price=0.45
)

# Complete the trade
ab.complete_trade(
    trade_id=trade_id,
    exit_price=0.52,
    pnl=7.0
)

# Update confidence
scorer.update_after_trade(SuggestionType.BREAKOUT, outcome=True, pnl=7.0)
```

### 4. Compare Results

```python
result = ab.compare_groups()

print(f"Control win rate: {result.control_metrics.win_rate:.1f}%")
print(f"Treatment win rate: {result.treatment_metrics.win_rate:.1f}%")
print(f"P-value: {result.p_value:.3f}")
print(result.recommendation)
```

---

## Launching the Dashboard

### Option 1: Direct

```bash
cd src
streamlit run kalshi_trader/dashboard.py
```

### Option 2: From Project Root

```bash
streamlit run src/kalshi_trader/dashboard.py
```

The dashboard will be available at: http://localhost:8501

### Dashboard Features

- **Confidence Scoring Tab:**
  - Real-time confidence score cards (Reversion, Breakout, Volatility)
  - Confidence trend charts over time
  - Strategy performance breakdown

- **A/B Testing Tab:**
  - Side-by-side group comparison
  - Statistical significance testing (Welch's t-test)
  - Win rate and P&L visualization
  - Automated recommendations

- **Data Tab:**
  - Recent trades table
  - Database statistics
  - Confidence parameter details

---

## Architecture

### Confidence Scoring

Uses Beta distribution for Bayesian updating:

```python
confidence = α / (α + β)

# After successful trade:
α_new = α_old + (1.0 + |pnl| / 10)

# After failed trade:
β_new = β_old + (1.0 + |pnl| / 10)
```

### A/B Group Assignment

Deterministic hashing ensures consistency:

```python
def assign_group(user_id, date):
    hash_val = int(hashlib.md5(f"{user_id}:{date}".encode()).hexdigest(), 16)
    return "treatment" if hash_val % 2 == 0 else "control"
```

### Statistical Comparison

Welch's t-test for unequal variances:

```python
t_stat, p_value = stats.ttest_ind(
    treatment_pnls,
    control_pnls,
    equal_var=False  # Welch's t-test
)
```

---

## Database Schema

### Tables

**confidence_scores**: Current parameters per suggestion type
- suggestion_type (PK)
- alpha, beta
- updated_at

**ab_assignments**: Group assignments
- user_id, date (PK)
- group_assignment

**trade_outcomes**: Completed trades
- trade_id (PK)
- user_id, group_assignment, suggestion_type
- confidence, entry_price, exit_price
- pnl, outcome, timestamps

**confidence_history**: Time-series tracking
- suggestion_type, confidence
- alpha, beta, recorded_at

---

## API Reference

### ConfidenceScorer

```python
class ConfidenceScorer:
    def get_confidence(suggestion_type) -> float
    def get_confidence_detailed(suggestion_type) -> ConfidenceResult
    def update_after_trade(suggestion_type, outcome, pnl) -> None
    def should_trade(suggestion_type, threshold=0.6) -> bool
    def get_position_weight(suggestion_type, base_size) -> float
    def explain_confidence(suggestion_type) -> str
```

### ABTesting

```python
class ABTesting:
    def assign_group(user_id, date) -> str
    def record_trade_outcome(trade_id, user_id, ...) -> None
    def complete_trade(trade_id, exit_price, pnl) -> None
    def get_metrics(group) -> ABMetrics
    def compare_groups() -> ABTestResult
    def get_balance_check() -> dict
```

---

## Testing

```python
import pytest

from kalshi_trader.ml import ConfidenceScorer, ABTesting

def test_confidence_update():
    scorer = ConfidenceScorer()
    scorer.initialize()
    
    initial = scorer.get_confidence("breakout")
    scorer.update_after_trade("breakout", outcome=True, pnl=5.0)
    updated = scorer.get_confidence("breakout")
    
    assert updated > initial

def test_ab_assignment_balance():
    ab = ABTesting()
    ab.initialize()
    
    groups = [ab.assign_group(f"user_{i}", "2026-03-19") for i in range(100)]
    control_count = groups.count("control")
    treatment_count = groups.count("treatment")
    
    # Should be roughly 50/50
    assert abs(control_count - treatment_count) < 20
```

---

## Acceptance Criteria ✅

| Criteria | Status | Notes |
|----------|--------|-------|
| Confidence scores update after each trade | ✅ | `update_after_trade()` updates α/β and persists to DB |
| A/B groups automatically balanced | ✅ | Hash-based 50/50 assignment |
| Metrics calculated (win rate, P&L) | ✅ | `get_metrics()` and `compare_groups()` |
| Real-time dashboard | ✅ | Streamlit with auto-refresh, charts, tables |
| Follows existing code style | ✅ | Type hints, docstrings, dataclasses |
| SQLite/JSON storage | ✅ | SQLite with full schema |

---

## Next Steps (Phase 3)

1. **Integration:** Hook confidence scores into actual trading decisions
2. **Threshold Filtering:** Only trade if confidence > 0.6
3. **Position Sizing:** Scale positions by confidence
4. **Online Learning:** Continuous updates as strategies adapt

---

## Troubleshooting

### Database not found
The database is created automatically at `~/.kalshi-trader/ml.db`

### Dashboard won't start
```bash
# Check Streamlit installation
pip install streamlit plotly

# Run with debug mode
streamlit run kalshi_trader/dashboard.py --logger.level=debug
```

### Import errors
Make sure to run from the `src/` directory or add it to PYTHONPATH

---

## Changelog

### 0.2.0 (2026-03-19)
- Added ML Pipeline Phase 2
- Implemented Bayesian confidence scoring
- Added A/B testing framework
- Created Streamlit dashboard
- Added database persistence

### 0.1.0 (2026-03-17)
- Initial Kalshi Trader toolkit
- Research client for historical data
