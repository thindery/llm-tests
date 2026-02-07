# Remy-Finance Data Sources & Team Recommendations

**Date:** Feb 6, 2026  
**Request:** Replace mock data with real market data sources  
**Research Team:** Financial Consultant Agent + Data Architect

---

## 🎯 Quick Recommendation

**Use Yahoo Finance** as primary data source — it's **free, no API key needed**, and we already have skills for it. Perfect for MVP.

---

## 📊 FREE Data Sources Available Now

### 1. ✅ YAHOO FINANCE (BEST for MVP)
| Feature | Value |
|---------|-------|
| **Cost** | FREE |
| **Rate Limit** | ~2,000 requests/hour |
| **API Key** | NOT REQUIRED |
| **Coverage** | Stocks, ETFs, Funds, Crypto, Forex |
| **Historical** | ✅ Yes (daily/weekly/monthly) |
| **Real-time** | ⚠️ 15-20 min delay (most exchanges) |

**What we can get:**
- Real-time quotes (delayed)
- Historical OHLCV (Open, High, Low, Close, Volume)
- Company fundamentals (PE, EPS, ROE)
- Market status (open/closed/pre/post)
- Currency, exchange info

**How to integrate:**

Option A: Use existing `yahoo-data-fetcher` skill (simple)
```bash
/stock quote AAPL
```

Option B: Use `stock-market-pro` skill (professional charts)
```bash
uv run --script scripts/yf price AAPL
uv run --script scripts/yf pro AAPL 1mo
```

Option C: Direct API call from Remy-Finance backend
```typescript
// Using yahoo-finance2 npm package
const quote = await yahooFinance.quote('AAPL');
```

**Installed Skills Ready:**
- `yahoo-data-fetcher` - Basic quotes
- `stock-market-pro` - Charts + fundamentals
- `yahoo-finance-who` - Full wrapper with historical

---

### 2. ✅ COINGECKO (Crypto Only - FREE)
| Feature | Value |
|---------|-------|
| **Cost** | FREE |
| **Rate Limit** | 10-50 calls/minute (free tier) |
| **API Key** | Optional (more limits without) |
| **Coverage** | 10,000+ crypto assets |
| **Data** | Price, market cap, 24h change |

**Use for:** BTC, ETH, SOL and other cryptocurrencies in Remy-Finance

---

### 3. ✅ ALPHAVANTAGE (Partially Free)
| Feature | Value |
|---------|-------|
| **Cost** | 25 API calls/day FREE |
| **API Key** | REQUIRED |
| **Coverage** | Stocks, Forex, Crypto |
| **Historical** | ✅ Yes |

**Good for:** Testing, small portfolios (25 calls/day is limiting)

---

## 📈 API Sources Requiring Keys (If You Want)

### 4. FINNHUB (Recommended if you want real-time)
| Feature | Value |
|---------|-------|
| **Cost** | 60 calls/minute FREE |
| **API Key** | REQUIRED (free signup) |
| **Real-time** | ✅ WebSocket + REST |
| **Coverage** | US stocks, forex, crypto |
| **Fundamentals** | ✅ Financial statements |

**Signup:** https://finnhub.io/

---

### 5. ALPACA MARKETS (Good for trading features)
| Feature | Value |
|---------|-------|
| **Cost** | FREE for data |
| **API Key** | REQUIRED |
| **Real-time** | ✅ SIP data available |
| **Paper Trading** | ✅ Test trades without real money |

**Signup:** https://alpaca.markets/

---

### 6. ❌ TRADINGVIEW (Not ideal)
| Feature | Value |
|---------|-------|
| **Cost** | Mostly PAID |
| **API Access** | Limited, requires partnership |
| **Best for** | Charts + Analysis (not data feeds) |

**Verdict:** TradingView is great for charts, not for API data feeds. Skip for now.

---

## 🏗️ Implementation Strategy

### Phase 1: MVP (Now)
**Use Yahoo Finance** — no keys, no setup, works immediately

```typescript
// Backend integration
import yahooFinance from 'yahoo-finance2';

// Dashboard: Get all current prices
async function getPortfolioPrices(symbols: string[]) {
  const quotes = await yahooFinance.quote(symbols);
  return quotes.map(q => ({
    symbol: q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange,
    changePercent: q.regularMarketChangePercent,
    currency: q.currency,
    marketState: q.marketState
  }));
}

// Charts: Get historical data
async function getStockHistory(symbol: string, period: string) {
  return await yahooFinance.historical(symbol, {
    period1: fromDate,
    period2: toDate,
    interval: '1d'
  });
}
```

### Phase 2: Real-time Upgrade (Later)
Add Finnhub or Alpaca if you need:
- Real-time prices (not delayed)
- WebSocket streaming
- Paper trading integration

---

## 🔧 Team Action Items

| Priority | Action | Owner |
|----------|--------|-------|
| 1 | Implement Yahoo Finance price fetching in Remy-Finance backend | Dev Agent |
| 2 | Add chart data endpoint using yahoo-finance2 | Dev Agent |
| 3 | Test rate limits (stay under 2000/hr) | QA Agent |
| 4 | Cache prices (5-min TTL) to avoid limits | API Architect |
| 5 | Optional: Sign up for Finnhub (real-time later) | thindery |

---

## 💰 API Key Decision Matrix

| Source | Free Tier | Key Needed | Real-time | Recommendation |
|--------|-----------|------------|-----------|----------------|
| **Yahoo Finance** | ✅ 2000/hr | ❌ NO | ❌ 15min delay | **USE NOW** |
| CoinGecko | ✅ 10/min | ❌ Optional | ❌ Delayed | Crypto only |
| **Finnhub** | ✅ 60/min | ✅ YES | ✅ YES | **GET KEY LATER** |
| Alpaca | ✅ | ✅ YES | ✅ YES | Optional |
| TradingView | ❌ | ✅ Partner | ❌ | Skip |

---

## 🎯 Final Recommendation

**Start with Yahoo Finance** — it's already wired up via our skills, no API keys to manage, and gives you 95% of what you need for launch.

**If you want real-time later:**
1. Sign up for Finnhub (free, 60 calls/min)
2. Add as secondary data source
3. Use Yahoo for historical, Finnhub for live

**Your TradingView account:**
- Keep it for chart analysis
- Not for API data feeds

---

**Ready to implement?**
I can spawn the Dev Agent now to wire up Yahoo Finance to your Remy-Finance frontend.

🦞 **Team Lead** — Financial Consultant Agent
