# TICKET-003: Kalshi Trader - Research & Strategy Implementation from Polymarket Bot Analysis

**Type:** Research  
**Priority:** High  
**Status:** To Research  
**Created:** 2026-03-18  
**Source:** https://x.com/i/status/2025933391003066796

---

## Overview

Research findings from X article on automated prediction market trading strategies. Adapt proven Polymarket bot strategies for Kalshi Trader implementation.

**Note:** These are Polymarket-specific strategies that need Kalshi-specific adaptation. Cannot directly install Polymarket skills - must build Kalshi equivalents.

---

## Source Article

- **Title:** "How to Build Your Own Polymarket Clawdbot — $1,000 Per Day Strategy"
- **Author:** @kirillk_web3
- **Views:** 507K
- **URL:** https://x.com/i/status/2025933391003066796

---

## Proven Strategies to Adapt for Kalshi

### 1. Weather Trading (Beginner-Friendly)

**Concept:** Trade weather markets using NOAA forecast data. Target mispriced temperature brackets where implied probability lags behind actual forecast updates.

**Target Parameters:**
- Entry threshold: 15% (buy below this)
- Exit threshold: 45% (sell above this)
- Max position: $2.00
- Locations: NYC, Chicago, Seattle, Atlanta, Dallas, Miami
- Max trades per run: 5
- Scan frequency: Every 2 minutes

**Why it works:** Retail doesn't understand weather probabilities, brackets are thinly traded, data updates lag.

---

### 2. Fast Loop (Aggressive - BTC/Financial Markets)

**Concept:** Automate 5/15-minute markets using momentum/price signals. Harvest probability corrections when implied odds lag behind real price movements.

**Target Parameters:**
- Markets: BTC 5-min
- Strategy: Price deviation arbitrage
- Entry: Real price moves 0.5%+
- Position size: $5
- Max positions: 3
- Stop loss: -$3 per trade
- Daily limit: -$50
- Scan frequency: Every 5 seconds
- Exit: 15 seconds before close

**Core insight:** Bot detects spot price impulse + momentum shift while probability hasn't adjusted yet. Enter at lag, exit after repricing.

---

### 3. Signal Sniper

**Concept:** Trade breaking news from RSS feeds with built-in risk controls.

---

### 4. Copy Trading

**Concept:** Mirror positions from top traders. Aggregate whale signals with size-weighted logic.

---

### 5. AI Divergence

**Concept:** Find markets where AI consensus diverges from market prices.

---

## Risk Framework (Apply to All Strategies)

- Max daily drawdown: 3-5%
- Stop after 3 consecutive losses
- No size increases after red days
- Scale only after consistent green performance
- Edge without discipline = account reset

---

## Technical Requirements for Implementation

1. Real-time market data feeds
2. Probability calculation engine
3. Momentum/technical indicators (RSI, MACD, VWAP)
4. Price deviation arbitrage detection
5. Order flow / delta metrics
6. Risk management circuit breakers
7. Fast execution (sub-5-second scan capability)

---

## Architecture Notes from Article

- Structure > Prediction - bots follow rules, remove emotion
- Execution speed is the edge
- Small statistical advantages compounded over time
- Human + machine hybrid (decision support) vs full automation options

---

## Kalshi-Specific Considerations

- Kalshi API integration (already have)
- Available markets (financial, weather, sports, politics)
- Market resolution times differ from Polymarket
- Different liquidity profiles
- Fee structures and position limits

---

## Deliverables

1. **Strategy Adaptation Report** - How each Polymarket strategy maps to Kalshi markets
2. **Technical Implementation Plan** - Architecture for Kalshi-specific bot modules
3. **Risk Management Integration** - How to implement the risk framework
4. **Market Research** - Which Kalshi markets are suitable for each strategy
5. **Go/No-Go Decision** - Recommendation on which strategies to implement first

---

## Acceptance Criteria

- [ ] Document all 5 strategies with Kalshi-specific adaptations
- [ ] Identify which Kalshi markets support each strategy
- [ ] Define technical implementation approach
- [ ] Create risk management integration plan
- [ ] Provide prioritized implementation roadmap
