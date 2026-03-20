# ML Pipeline Phase 2: Confidence Scoring & A/B Testing Framework

**Ticket:** REMY-190  
**Research Date:** 2026-03-19  
**Author:** ML Implementation Agent  

---

## Overview

This document outlines the architecture and implementation approach for Phase 2 of the Kalshi Trader ML Pipeline. Phase 2 introduces Bayesian confidence scoring for trade suggestions and an A/B testing framework to validate strategy performance.

## Confidence Scoring Architecture

### Bayesian Approach

Each suggestion type (reversion, breakout, volatility) maintains its own Beta distribution parameters:
- **Alpha (α):** Count of successful trades + prior
- **Beta (β):** Count of failed trades + prior

The confidence score is calculated as the mean of the posterior distribution:
```
confidence = α / (α + β)
```

### Suggestion Types

1. **Reversion:** Mean-reversion trades (price returns to average)
2. **Breakout:** Momentum breakout trades (price breaks resistance/support)
3. **Volatility:** Volatility expansion/contraction trades

### Prior Configuration

Using an uninformative prior (Jeffrey's prior):
- Initial α = 0.5
- Initial β = 0.5

This allows the system to learn from data while avoiding extreme values early on.

### Confidence Update Process

```python
def update_confidence(suggestion_type: str, outcome: bool, pnl: float):
    """
    Update Bayesian parameters after trade completion.
    
    Args:
        suggestion_type: 'reversion', 'breakout', or 'volatility'
        outcome: True for profitable trade, False for loss
        pnl: Profit/loss amount (used for weighted updates)
    """
    if outcome:
        # Weight by P&L magnitude - bigger wins = more confidence
        alpha_increment = 1.0 + abs(pnl) / 10.0
        self.alpha[suggestion_type] += alpha_increment
    else:
        # Weight by loss magnitude - bigger losses = bigger penalty
        beta_increment = 1.0 + abs(pnl) / 10.0
        self.beta[suggestion_type] += beta_increment
```

## A/B Testing Framework

### Group Assignment

- **Control Group:** Receives suggestions using baseline confidence
- **Treatment Group:** Receives suggestions using updated (learned) confidence

Assignment uses a hash-based deterministic approach:
```python
def assign_ab_group(user_id: str, date: str) -> str:
    """Deterministic 50/50 assignment using hash."""
    hash_input = f"{user_id}:{date}"
    hash_val = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
    return "treatment" if hash_val % 2 == 0 else "control"
```

### Metrics Tracking

For each A/B group, track:

**Win Rate Metrics:**
- Total trades executed
- Win count and loss count
- Win rate percentage

**P&L Metrics:**
- Total P&L
- Average P&L per trade
- Max drawdown
- Sharpe ratio (if enough samples)

**Confidence Metrics:**
- Average confidence score
- Confidence distribution

### Statistical Comparison

Use Welch's t-test for comparing P&L between groups:
```python
from scipy import stats

def compare_groups(control_pnl: list, treatment_pnl: list) -> dict:
    """Statistical comparison of A/B groups."""
    t_stat, p_value = stats.ttest_ind(control_pnl, treatment_pnl, equal_var=False)
    
    return {
        "p_value": p_value,
        "is_significant": p_value < 0.05,
        "control_mean": np.mean(control_pnl),
        "treatment_mean": np.mean(treatment_pnl),
        "lift": (np.mean(treatment_pnl) - np.mean(control_pnl)) / abs(np.mean(control_pnl)) * 100
    }
```

## Database Schema

### SQLite Schema

```sql
-- Confidence scores per suggestion type
CREATE TABLE confidence_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_type TEXT NOT NULL,  -- 'reversion', 'breakout', 'volatility'
    alpha REAL NOT NULL DEFAULT 0.5,
    beta REAL NOT NULL DEFAULT 0.5,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(suggestion_type)
);

-- A/B group assignments
CREATE TABLE ab_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    group_assignment TEXT NOT NULL,  -- 'control' or 'treatment'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Trade outcomes for A/B analysis
CREATE TABLE trade_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    group_assignment TEXT NOT NULL,
    suggestion_type TEXT NOT NULL,
    confidence REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL NOT NULL,
    pnl REAL NOT NULL,
    outcome BOOLEAN NOT NULL,  -- True = profit, False = loss
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Confidence history for trending
CREATE TABLE confidence_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_type TEXT NOT NULL,
    confidence REAL NOT NULL,
    alpha REAL NOT NULL,
    beta REAL NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Dashboard Integration

### Streamlit Components

1. **Confidence Trends:** Line chart showing confidence evolution over time
2. **A/B Comparison:** Side-by-side metrics comparison
3. **Suggestion Type Performance:** Bar chart of win rate by type
4. **Real-time Updates:** Auto-refresh every 30 seconds

### Visual Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Kalshi Trader ML Pipeline - Phase 2 Dashboard              │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────────┐   │
│  │ Confidence Scores   │  │ A/B Test Results         │   │
│  │ ┌───┐ ┌───┐ ┌───┐  │  │ Control: 55% win rate    │   │
│  │ │Rev│ │Brk│ │Vol│  │  │ Treatment: 58% win rate    │   │
│  │ │0.7│ │0.5│ │0.6│  │  │ P-value: 0.03 *          │   │
│  │ └───┘ └───┘ └───┘  │  │                          │   │
│  └─────────────────────┘  └──────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Confidence Trends Over Time                          │ │
│  │  Line chart: x=time, y=confidence, color=suggestion    │ │
│  └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────────────┐  │
│  │ Recent Trades      │  │ Performance by Type        │  │
│  │ Table: 10 rows     │  │ Bar chart: win rate        │  │
│  └────────────────────┘  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Files

1. `kalshi_trader/ml/confidence_scorer.py` - Core confidence logic
2. `kalshi_trader/ml/ab_testing.py` - A/B framework and metrics
3. `kalshi_trader/ml/database.py` - SQLite data layer
4. `kalshi_trader/dashboard.py` - Streamlit dashboard
5. `kalshi_trader/ml/__init__.py` - Module exports

## Acceptance Criteria Verification

- [x] Confidence scores update after each completed trade
  - Implemented in `ConfidenceScorer.update_after_trade()`
  
- [x] A/B groups automatically balanced via hash-based assignment
  - Implemented in `ABTesting.assign_group()`
  
- [x] Metrics calculated (win rate, P&L comparison)
  - Implemented in `ABTesting.get_metrics()` and `compare_groups()`
  
- [x] Real-time dashboard shows confidence trends and A/B comparison
  - Implemented in Streamlit dashboard with auto-refresh

## Next Steps (Phase 3)

- Integrate confidence scores into actual trading decisions
- Implement threshold-based filtering (only trade if confidence > 0.6)
- Add confidence-weighted position sizing
- Export A/B test results for offline analysis

---

*Document Version: 1.0*  
*Last Updated: 2026-03-19*
