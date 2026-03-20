# Kalshi NCAA Basketball Trading Guide

**Research Date:** 2026-03-19  
**Target Game:** Texas vs BYU - Men's College Basketball  
**Target URL:** https://kalshi.com/markets/kxncaambgame/mens-college-basketball-mens-game/kxncaambgame-26mar19texbyu

---

## Overview

This guide documents the complete process for programmatically finding and trading on NCAA basketball games on Kalshi, using the Texas vs BYU game as a concrete example.

---

## Part 1: Understanding Kalshi Market Structure

### URL → Ticker Extraction

The Kalshi URL structure follows this pattern:
```
https://kalshi.com/markets/{series_ticker}/{category}/{event_ticker}
```

**For the Texas vs BYU game:**
- **Full URL:** `https://kalshi.com/markets/kxncaambgame/mens-college-basketball-mens-game/kxncaambgame-26mar19texbyu`
- **Series Ticker:** `KXNCAAMBGAME` (from URL path: `kxncaambgame` → uppercase)
- **Event Ticker:** `KXNCAAMBGAME-26MAR19TEXBYU` (from URL slug: `kxncaambgame-26mar19texbyu` → uppercase)
- **Market Tickers:** 
  - Texas: `KXNCAAMBGAME-26MAR19TEXBYU-TEX`
  - BYU: `KXNCAAMBGAME-26MAR19TEXBYU-BYU`

### Ticker Naming Convention

| Component | Format | Example |
|-----------|--------|---------|
| Series | `KXNCAAMBGAME` | NCAA Men's Basketball Game |
| Event | `{Series}-{Date}{Teams}` | `KXNCAAMBGAME-26MAR19TEXBYU` |
| Market | `{Event}-{Team}` | `KXNCAAMBGAME-26MAR19TEXBYU-TEX` |

**Date format in tickers:** `DDMMMYY` (e.g., `26MAR19` = March 19, 2026)

---

## Part 2: API Endpoints

### Base URLs

```python
PRODUCTION_BASE_URL = "https://api.kalshi.com/trade-api/v2"
DEMO_BASE_URL = "https://demo-api.kalshi.com/trade-api/v2"
```

### Key Endpoints for Basketball Trading

#### 1. Get Events (Discover Games)

**Endpoint:** `GET /events`

**Purpose:** Find basketball games by series ticker

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `series_ticker` | string | Filter by series (e.g., `KXNCAAMBGAME`) |
| `status` | string | `unopened`, `open`, `closed`, `settled` |
| `with_nested_markets` | boolean | Include markets in response |
| `limit` | integer | Max 200 per request |
| `cursor` | string | Pagination cursor |

**Example Request:**
```bash
curl --request GET \
  --url 'https://api.kalshi.com/trade-api/v2/events?series_ticker=KXNCAAMBGAME&status=open&with_nested_markets=true&limit=200' \
  --header 'KALSHI-ACCESS-KEY: <your-api-key>' \
  --header 'KALSHI-ACCESS-SIGNATURE: <signature>' \
  --header 'KALSHI-ACCESS-TIMESTAMP: <timestamp>'
```

**Example Response (simplified):**
```json
{
  "events": [
    {
      "event_ticker": "KXNCAAMBGAME-26MAR19TEXBYU",
      "series_ticker": "KXNCAAMBGAME",
      "title": "Texas vs BYU",
      "status": "open",
      "markets": [
        {
          "ticker": "KXNCAAMBGAME-26MAR19TEXBYU-TEX",
          "event_ticker": "KXNCAAMBGAME-26MAR19TEXBYU",
          "title": "Texas to win vs BYU",
          "status": "open",
          "yes_bid_dollars": "0.6700",
          "yes_ask_dollars": "0.6800",
          "no_bid_dollars": "0.3200",
          "no_ask_dollars": "0.3300",
          "last_price_dollars": "0.6700",
          "volume_fp": "15000.00",
          "open_interest_fp": "8500.00"
        },
        {
          "ticker": "KXNCAAMBGAME-26MAR19TEXBYU-BYU",
          "event_ticker": "KXNCAAMBGAME-26MAR19TEXBYU",
          "title": "BYU to win vs Texas",
          "yes_bid_dollars": "0.3400",
          "yes_ask_dollars": "0.3500",
          "no_bid_dollars": "0.6500",
          "no_ask_dollars": "0.6600",
          "last_price_dollars": "0.3400"
        }
      ]
    }
  ],
  "cursor": ""
}
```

#### 2. Get Specific Event

**Endpoint:** `GET /events/{event_ticker}`

**Purpose:** Get details for a specific game when you know the event ticker

**Example:**
```bash
GET /events/KXNCAAMBGAME-26MAR19TEXBYU
```

#### 3. Get Markets (Alternative Discovery)

**Endpoint:** `GET /markets`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `event_ticker` | string | Filter by specific event |
| `series_ticker` | string | Filter by series |
| `tickers` | string | Comma-separated list of market tickers |
| `status` | string | `unopened`, `open`, `paused`, `closed`, `settled` |

**Example:**
```bash
GET /markets?event_ticker=KXNCAAMBGAME-26MAR19TEXBYU
```

#### 4. Get Market Orderbook

**Endpoint:** `GET /markets/{ticker}/orderbook`

**Purpose:** Get current bid/ask depth for a specific market

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `depth` | integer | 0 (all) or 1-100 for specific depth |

**Example Request:**
```bash
curl --request GET \
  --url 'https://api.kalshi.com/trade-api/v2/markets/KXNCAAMBGAME-26MAR19TEXBYU-TEX/orderbook?depth=5' \
  --header 'KALSHI-ACCESS-KEY: <your-api-key>' \
  --header 'KALSHI-ACCESS-SIGNATURE: <signature>' \
  --header 'KALSHI-ACCESS-TIMESTAMP: <timestamp>'
```

**Example Response:**
```json
{
  "orderbook_fp": {
    "yes_dollars": [
      ["0.6700", "100.00"],  // [price, size]
      ["0.6600", "250.00"],
      ["0.6500", "500.00"]
    ],
    "no_dollars": [
      ["0.3300", "150.00"],  // Note: These are NO bids (equivalent to YES asks)
      ["0.3200", "300.00"],
      ["0.3100", "450.00"]
    ]
  }
}
```

**Important:** In binary markets, a NO bid at price X is equivalent to a YES ask at price (100-X). For example, a NO bid at 33¢ means you can sell YES at 67¢.

#### 5. Get Specific Market

**Endpoint:** `GET /markets/{ticker}`

**Purpose:** Get full market details including current pricing

**Example:**
```bash
GET /markets/KXNCAAMBGAME-26MAR19TEXBYU-TEX
```

---

## Part 3: Placing Trades

### Create Order Endpoint

**Endpoint:** `POST /orders`

**Purpose:** Place a buy or sell order on a market

### Request Body Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ticker` | string | Yes | Market ticker (e.g., `KXNCAAMBGAME-26MAR19TEXBYU-TEX`) |
| `side` | string | Yes | `yes` or `no` |
| `action` | string | Yes | `buy` or `sell` |
| `count` | integer | Yes | Number of contracts (1-100,000) |
| `price` | integer | Yes | Price in cents (1-99) |
| `client_order_id` | string | No | Your internal order ID |
| `expiration_time` | string | No | ISO 8601 timestamp for order expiry |
| `sell_position_floor` | integer | No | Minimum position after sell |
| `buy_max_cost` | integer | No | Maximum cost in cents for buy |

### Order Examples

#### Buy Texas to Win (YES)
```json
{
  "ticker": "KXNCAAMBGAME-26MAR19TEXBYU-TEX",
  "side": "yes",
  "action": "buy",
  "count": 100,
  "price": 67,
  "client_order_id": "texas-buy-001"
}
```

#### Buy BYU to Win (YES)
```json
{
  "ticker": "KXNCAAMBGAME-26MAR19TEXBYU-BYU",
  "side": "yes",
  "action": "buy",
  "count": 100,
  "price": 34,
  "client_order_id": "byu-buy-001"
}
```

#### Sell Texas (NO side = betting against Texas)
```json
{
  "ticker": "KXNCAAMBGAME-26MAR19TEXBYU-TEX",
  "side": "no",
  "action": "buy",
  "count": 100,
  "price": 33,
  "client_order_id": "texas-sell-001"
}
```

### Python Implementation

```python
import hashlib
import hmac
import time
import requests

class KalshiTrader:
    def __init__(self, access_key: str, private_key: str, demo: bool = False):
        self.base_url = (
            "https://demo-api.kalshi.com/trade-api/v2" 
            if demo else 
            "https://api.kalshi.com/trade-api/v2"
        )
        self.access_key = access_key
        self.private_key = private_key
        self.session = requests.Session()
    
    def _sign_request(self, method: str, path: str, timestamp: str) -> str:
        """Generate HMAC-SHA256 signature."""
        message = f"{timestamp}{method}{path}"
        return hmac.new(
            self.private_key.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
    
    def _auth_headers(self, method: str, path: str) -> dict:
        """Build authentication headers."""
        timestamp = str(int(time.time() * 1000))
        signature = self._sign_request(method, path, timestamp)
        return {
            "KALSHI-ACCESS-KEY": self.access_key,
            "KALSHI-ACCESS-SIGNATURE": signature,
            "KALSHI-ACCESS-TIMESTAMP": timestamp,
            "Content-Type": "application/json",
        }
    
    def get_events(self, series_ticker: str, status: str = "open") -> dict:
        """Get events for a series."""
        path = "/events"
        params = {
            "series_ticker": series_ticker,
            "status": status,
            "with_nested_markets": "true",
            "limit": 200,
        }
        url = f"{self.base_url}{path}"
        headers = self._auth_headers("GET", path)
        resp = self.session.get(url, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()
    
    def get_market_orderbook(self, ticker: str, depth: int = 5) -> dict:
        """Get orderbook for a market."""
        path = f"/markets/{ticker}/orderbook"
        params = {"depth": depth}
        url = f"{self.base_url}{path}"
        headers = self._auth_headers("GET", path)
        resp = self.session.get(url, params=params, headers=headers)
        resp.raise_for_status()
        return resp.json()
    
    def place_order(
        self,
        ticker: str,
        side: str,  # "yes" or "no"
        action: str,  # "buy" or "sell"
        count: int,
        price: int,  # in cents
        client_order_id: str = None,
    ) -> dict:
        """Place an order on Kalshi."""
        path = "/orders"
        url = f"{self.base_url}{path}"
        
        payload = {
            "ticker": ticker,
            "side": side,
            "action": action,
            "count": count,
            "price": price,
        }
        
        if client_order_id:
            payload["client_order_id"] = client_order_id
        
        headers = self._auth_headers("POST", path)
        resp = self.session.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()


# Example usage for Texas vs BYU game
def trade_texas_byu_game():
    """Example: Find and trade on the Texas vs BYU game."""
    
    # Initialize trader (use demo=True for paper trading)
    trader = KalshiTrader(
        access_key="your-access-key",
        private_key="your-private-key",
        demo=True,  # Set to False for real trading
    )
    
    # Step 1: Find the game by series
    events = trader.get_events(series_ticker="KXNCAAMBGAME", status="open")
    
    # Step 2: Locate the Texas vs BYU event
    target_event = None
    for event in events.get("events", []):
        if "TEXBYU" in event["event_ticker"]:
            target_event = event
            break
    
    if not target_event:
        print("Game not found!")
        return
    
    print(f"Found event: {target_event['title']}")
    print(f"Event Ticker: {target_event['event_ticker']}")
    
    # Step 3: Get market tickers
    texas_market = None
    byu_market = None
    
    for market in target_event.get("markets", []):
        if "TEX" in market["ticker"] and "BYU" not in market["ticker"]:
            texas_market = market
        elif "BYU" in market["ticker"]:
            byu_market = market
    
    # Step 4: Get orderbook for Texas market
    if texas_market:
        orderbook = trader.get_market_orderbook(texas_market["ticker"])
        print(f"\nTexas Orderbook: {orderbook}")
        
        # Step 5: Place a buy order (example - don't actually run this!)
        # order = trader.place_order(
        #     ticker=texas_market["ticker"],
        #     side="yes",
        #     action="buy",
        #     count=10,
        #     price=67,  # 67 cents
        #     client_order_id="my-texas-order-001",
        # )
        # print(f"Order placed: {order}")


if __name__ == "__main__":
    trade_texas_byu_game()
```

---

## Part 4: Complete Workflow

### From URL to Trade

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Extract Ticker from URL                                 │
│  URL: kalshi.com/markets/kxncaambgame/.../kxncaambgame-26mar... │
│  ↓                                                               │
│  Event Ticker: KXNCAAMBGAME-26MAR19TEXBYU                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Query Event Details                                   │
│  GET /events/KXNCAAMBGAME-26MAR19TEXBYU                        │
│  ↓                                                               │
│  Get market tickers:                                             │
│    - KXNCAAMBGAME-26MAR19TEXBYU-TEX (Texas)                     │
│    - KXNCAAMBGAME-26MAR19TEXBYU-BYU (BYU)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Get Market Data                                       │
│  GET /markets/{ticker}/orderbook                               │
│  ↓                                                               │
│  Current prices:                                                 │
│    - Texas YES: 67¢ bid / 68¢ ask                               │
│    - BYU YES: 34¢ bid / 35¢ ask                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Place Order                                           │
│  POST /orders                                                    │
│  ↓                                                               │
│  {                                                               │
│    "ticker": "KXNCAAMBGAME-26MAR19TEXBYU-TEX",                  │
│    "side": "yes",                                               │
│    "action": "buy",                                             │
│    "count": 100,                                                │
│    "price": 67                                                  │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 5: Pitfalls and Gotchas

### 1. **Authentication Required for Trading**
- All trading endpoints require authentication
- You need both `access_key` and `private_key` from Kalshi
- Signatures use HMAC-SHA256 with timestamp

### 2. **Price Format**
- API uses **cents** (integer), not dollars
- `price: 67` means 67¢ ($0.67), not $67
- Valid range: 1-99 cents

### 3. **Orderbook Interpretation**
- `yes_dollars` = YES bids (people buying YES)
- `no_dollars` = NO bids (people buying NO)
- A NO bid at 33¢ = YES ask at 67¢ (100-33)
- The orderbook only shows bids, not asks

### 4. **Market Status**
- Markets must be `open` to trade
- Check `status` field before placing orders
- Games close before tip-off typically

### 5. **Contract Counts**
- `count` is number of contracts, not dollar amount
- Each contract pays $1 if correct, $0 if wrong
- Cost = count × price (in dollars)
- Example: 100 contracts at 67¢ = $67 cost

### 6. **Ticker Case Sensitivity**
- Tickers in URLs are lowercase
- Tickers in API are UPPERCASE
- Always convert to uppercase for API calls

### 7. **Rate Limits**
- Kalshi has API rate limits
- Check response headers for remaining quota
- Use pagination (`cursor`) for large result sets

### 8. **Demo vs Production**
- Use `demo-api.kalshi.com` for testing
- Use `api.kalshi.com` for real trading
- Keys are separate for each environment

### 9. **Event vs Market Tickers**
- **Event ticker:** The game itself (e.g., `KXNCAAMBGAME-26MAR19TEXBYU`)
- **Market tickers:** Individual outcomes (e.g., `KXNCAAMBGAME-26MAR19TEXBYU-TEX`)
- You trade on **market tickers**, not event tickers

### 10. **Date Parsing in URLs**
- URL dates are lowercase: `26mar19`
- Ticker dates are uppercase: `26MAR19`
- Format is always `DDMMMYY`

---

## Part 6: Quick Reference

### Ticker Extraction Function

```python
import re

def extract_tickers_from_url(url: str) -> dict:
    """Extract series and event tickers from a Kalshi market URL."""
    # Pattern: /markets/{series}/{category}/{event}
    pattern = r'/markets/([^/]+)/[^/]+/([^/]+)$'
    match = re.search(pattern, url)
    
    if not match:
        raise ValueError(f"Invalid Kalshi URL format: {url}")
    
    series_slug = match.group(1)
    event_slug = match.group(2)
    
    # Convert to ticker format (uppercase, hyphens)
    series_ticker = series_slug.upper().replace('-', '')
    event_ticker = event_slug.upper()
    
    return {
        "series_ticker": series_ticker,
        "event_ticker": event_ticker,
        "texas_ticker": f"{event_ticker}-TEX",
        "byu_ticker": f"{event_ticker}-BYU",
    }

# Example
url = "https://kalshi.com/markets/kxncaambgame/mens-college-basketball-mens-game/kxncaambgame-26mar19texbyu"
tickers = extract_tickers_from_url(url)
print(tickers)
# {
#   "series_ticker": "KXNCAAMBGAME",
#   "event_ticker": "KXNCAAMBGAME-26MAR19TEXBYU",
#   "texas_ticker": "KXNCAAMBGAME-26MAR19TEXBYU-TEX",
#   "byu_ticker": "KXNCAAMBGAME-26MAR19TEXBYU-BYU"
# }
```

### API Endpoint Summary

| Operation | Endpoint | Auth Required |
|-----------|----------|---------------|
| List Events | `GET /events` | Yes |
| Get Event | `GET /events/{ticker}` | Yes |
| List Markets | `GET /markets` | Yes |
| Get Market | `GET /markets/{ticker}` | Yes |
| Get Orderbook | `GET /markets/{ticker}/orderbook` | Yes |
| Create Order | `POST /orders` | Yes |
| Get Orders | `GET /orders` | Yes |
| Cancel Order | `DELETE /orders/{id}` | Yes |

---

## Resources

- **Kalshi API Docs:** https://docs.kalshi.com
- **Trade API v2:** https://docs.kalshi.com/trade-api/v2/
- **Create Order:** https://docs.kalshi.com/api-reference/orders/create-order
- **Get Events:** https://docs.kalshi.com/api-reference/events/get-events
- **Get Orderbook:** https://docs.kalshi.com/api-reference/market/get-market-orderbook

---

*Document created for research purposes. Do not use for actual trading without thorough testing.*
