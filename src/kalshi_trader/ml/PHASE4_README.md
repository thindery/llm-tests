# ML Pipeline Phase 4: Safety Controls & Graduation Logic

This document describes the safety and graduation features added to the Kalshi ML Pipeline.

## Overview

Phase 4 adds production-ready safety controls to protect trading capital and graduation logic to automatically manage strategy lifecycle.

## Safety Controls

### Circuit Breakers

Circuit breakers automatically halt trading when risk thresholds are exceeded:

- **Consecutive Losses**: Stop after 3 consecutive losing trades
- **Daily Loss Limit**: Stop after -$50 daily loss
- **Manual Trigger**: Can be triggered manually for emergencies
- **Cooldown Period**: 30-minute cooldown after trigger, then auto-resume

### Position Sizing

Two methods for calculating optimal position sizes:

1. **Fixed Fractional**: Fixed percentage of balance (default: 5%)
2. **Kelly Criterion**: Optimal sizing based on win rate and win/loss ratio
   - Configurable fraction of full Kelly (default: 0.5 = Half Kelly)
   - Scaled by confidence score

### Exposure Limits

- **Max Position**: 20% of total balance per trade
- **Max Open Positions**: 5 simultaneous positions
- **Balance Protection**: Cannot exceed total account balance

### Usage

```python
from kalshi_trader.ml import SafetyControls, SafetyConfig

# Configure safety
config = SafetyConfig(
    max_consecutive_losses=3,
    max_daily_loss=-50.0,
    position_size_method="kelly",
    kelly_fraction=0.5,
    max_position_percent=0.20,
)

safety = SafetyControls(config=config)
safety.initialize(balance=1000.0)

# Check if trading is allowed
if safety.can_trade():
    # Calculate position size
    size = safety.calculate_position_size(
        confidence=0.7,
        win_rate=0.6,
        avg_win=20.0,
        avg_loss=10.0,
    )
    print(f"Trade size: ${size:.2f}")

# Record trade outcome
safety.record_trade(
    trade_id="trade_001",
    pnl=25.0,
    position_size=50.0,
    suggestion_type="breakout",
)

# Check status
status = safety.get_status()
print(f"Status: {status['state']['status']}")
```

## Graduation Logic

### Strategy Modes

Strategies exist in one of three modes:

- **SHADOW**: Paper trading / simulation mode (default for new strategies)
- **LIVE**: Real money trading
- **PAUSED**: Temporarily paused
- **ARCHIVED**: No longer active

### Promotion Criteria (Shadow → Live)

Strategies must meet ALL criteria:

- **Minimum Trades**: 100+ trades
- **Minimum Win Rate**: 55%+ win rate
- **Minimum Profit**: Positive cumulative P&L

### Demotion Criteria (Live → Shadow)

Strategies are demoted if they meet ANY criteria:

- **Minimum Trades**: 50+ trades (required before demotion)
- **Low Win Rate**: Below 45% win rate
- **High Loss**: Cumulative loss of -$100 or more

### Automatic Graduation

The `auto_graduate` method evaluates strategies after each trade and promotes/demotes automatically.

### Usage

```python
from kalshi_trader.ml import GraduationLogic, GraduationThresholds, SuggestionType

# Configure thresholds
thresholds = GraduationThresholds(
    min_trades_promotion=100,
    min_win_rate_promotion=0.55,
    min_profit_promotion=0.0,
    min_trades_demotion=50,
    max_win_rate_demotion=0.45,
    max_loss_demotion=-100.0,
)

grad = GraduationLogic(thresholds=thresholds)
grad.initialize()

# Check current mode
print(f"Mode: {grad.get_strategy_mode(SuggestionType.BREAKOUT)}")

# Record trades
for i in range(100):
    pnl = 10.0 if i % 2 == 0 else -5.0  # ~60% win rate
    grad.record_trade(SuggestionType.BREAKOUT, pnl=pnl, trade_id=f"trade_{i}")

# Auto-graduate (will promote if criteria met)
event = grad.auto_graduate(SuggestionType.BREAKOUT)
if event:
    print(f"Promoted! Win rate: {event.performance_at_transition['win_rate']}")

# Manual control
if grad.is_live(SuggestionType.BREAKOUT):
    grad.demote_to_shadow(SuggestionType.BREAKOUT, reason="Market volatility")

# Check status
status = grad.get_strategy_status(SuggestionType.BREAKOUT)
print(f"Ready for promotion: {status['ready_for_promotion']}")
```

## Integration with MLPipeline

The `MLPipeline` class now includes safety and graduation as first-class citizens:

```python
from kalshi_trader.ml import MLPipeline, create_pipeline, SuggestionType

# Create configured pipeline
pipeline = create_pipeline(
    balance=1000.0,
    max_consecutive_losses=3,
    max_daily_loss=-50.0,
    min_trades_promotion=100,
    min_win_rate_promotion=0.55,
)

# Check safety before trading
status = pipeline.get_safety_status()
print(f"Can trade: {status['state']['is_trading_allowed']}")

# Only live strategies generate real trades
prediction = pipeline.predict(price_history, SuggestionType.BREAKOUT)
if prediction.should_trade:
    if prediction.graduation_status.get('mode') == 'live':
        size = pipeline.calculate_position_size(prediction.combined_confidence)
        print(f"Executing LIVE trade: ${size:.2f}")
    else:
        print(f"SHADOW trade - would have executed ${prediction.combined_confidence}")

# Record outcome (automatically handles safety + graduation)
result = pipeline.record_trade_outcome(
    trade_id="trade_001",
    suggestion_type=SuggestionType.BREAKOUT,
    price_history=price_history,
    entry_price=0.45,
    exit_price=0.52,
    pnl=0.07,
    position_size=50.0,
)

# Check for graduation event
if result['graduation_event']:
    print(f"Strategy graduated: {result['graduation_event']['direction']}")
```

## Database Schema

Phase 4 adds the following tables:

### Safety Tables
- `circuit_breakers`: Active and historical circuit breaker events
- `safety_events`: General safety events (cooldowns, etc.)
- `trade_safety_records`: Safety state snapshot at each trade

### Graduation Tables
- `strategy_performance`: Current performance metrics per strategy
- `graduation_events`: Historical promotion/demotion events

All tables are automatically created on `database.initialize()`.

## Dashboard Integration

The pipeline provides status for dashboard display:

```python
# Get comprehensive status
status = pipeline.get_status()

# Safety section
safety = status['safety']
print(f"Circuit breaker active: {safety['state']['circuit_breaker_reason']}")
print(f"Daily P&L: ${safety['state']['daily_pnl']:.2f}")
print(f"Consecutive losses: {safety['state']['consecutive_losses']}")

# Graduation section
for strat in status['graduation']['strategies']:
    print(f"{strat['suggestion_type']}: {strat['mode']}")
    print(f"  Trades: {strat['performance']['total_trades']}")
    print(f"  Win rate: {strat['performance']['win_rate']:.1%}")
    print(f"  Ready for promotion: {strat['ready_for_promotion']}")
```

## Configuration Summary

### Safety Config

| Parameter | Default | Description |
|-----------|---------|-------------|
| max_consecutive_losses | 3 | Consecutive losing trades before halt |
| max_daily_loss | -$50.00 | Daily loss limit before halt |
| position_size_method | "fixed_fractional" | Sizing method: "kelly" or "fixed_fractional" |
| fixed_fraction | 0.05 | Position size as % of balance |
| kelly_fraction | 0.5 | Fraction of full Kelly to use |
| max_position_percent | 0.20 | Max single position as % of balance |
| max_open_positions | 5 | Maximum simultaneous positions |
| cooldown_minutes | 30 | Cooldown period after circuit breaker |

### Graduation Thresholds

| Parameter | Default | Description |
|-----------|---------|-------------|
| min_trades_promotion | 100 | Min trades for promotion |
| min_win_rate_promotion | 0.55 | Min win rate for promotion |
| min_profit_promotion | $10.00 | Min profit for promotion |
| min_trades_demotion | 50 | Min trades before demotion possible |
| max_win_rate_demotion | 0.45 | Win rate below which demotion occurs |
| max_loss_demotion | -$100.00 | Loss threshold for demotion |

## Testing

Run tests:

```bash
# Safety controls tests
python -m pytest src/kalshi_trader/ml/tests/test_safety_controls.py -v

# Graduation logic tests
python -m pytest src/kalshi_trader/ml/tests/test_graduation_logic.py -v

# All tests
python -m pytest src/kalshi_trader/ml/tests/ -v
```

## Migration from Phase 3

Existing Phase 3 code continues to work unchanged. To enable Phase 4 features:

```python
# Old - Phase 3
pipeline = create_pipeline()
pipeline.initialize()

# New - Phase 4 (adds safety + graduation)
pipeline = create_pipeline(balance=1000.0)
pipeline.initialize()  # Auto-includes safety + graduation
```
