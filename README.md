# Remy Finance API

Remy Finance is a modern stock/ETF portfolio tracking dashboard. This API handles market data integration (Yahoo Finance), portfolio management, and performance calculations.

## 🚀 Features

- **Real-time Market Data:** Integration with Yahoo Finance for stocks, ETFs, and crypto.
- **Portfolio Management:** Full CRUD for portfolios and holdings.
- **High-Precision Performance:** Calculated returns (Total, Daily, Weekly, etc.).
- **3-Tier Caching:** Redis (L2) + PostgreSQL (L3) + In-memory (L1) for resilience and speed.
- **Custom Timeframes:** Flexible analysis windows (90m, 4h, 45d, etc.).
- **Automatic Snapshots:** Daily portfolio performance tracking.

## 🛠️ Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express
- **Database:** PostgreSQL
- **Caching:** Redis
- **Validation:** Zod
- **Data Source:** Yahoo Finance (via yahoo-finance2)

## 📁 Project Structure

```text
remy-finance-api/
├── migrations/          # Database schema and migrations
├── src/
│   ├── config/          # App configuration (env, db, redis)
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Type definitions and schemas
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic & 3rd party integrations
│   ├── utils/           # Helper functions
│   └── server.ts        # Application entry point
└── tests/               # Unit and integration tests
```

## 🚥 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- Redis

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd remy-finance-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.template .env
   # Edit .env with your database and redis credentials
   ```

4. Run migrations:
   ```bash
   npm run migrate:up
   ```

### Running the App

- **Development:**
  ```bash
  npm run dev
  ```

- **Production:**
  ```bash
  npm run build
  npm start
  ```

## 📡 API Endpoints

### Stocks
- `POST /api/stocks/search` - Search for symbols.
- `GET /api/stocks/:symbol/price` - Get latest quote.
- `GET /api/stocks/:symbol/history` - Get historical OHLCV data.
- `GET /api/stocks/:symbol/performance?timeframe=4h` - High-precision interval analysis.

### Portfolios
- `GET /api/portfolios` - List all user portfolios.
- `POST /api/portfolios` - Create a new portfolio.
- `GET /api/portfolios/:id/performance` - Get portfolio summary and returns.
- `POST /api/portfolios/:id/holdings` - Add a stock position.
- `DELETE /api/portfolios/:id/holdings/:holdingId` - Remove a position.

## 🏗️ Architecture Notes

### Caching Strategy
1. **L1 (In-memory):** Quotes are held in application state for 60s during market hours.
2. **L2 (Redis):** Distributed cache for quotes (5m) and history (24h).
3. **L3 (Database):** Persistent store for historical market data and user portfolios.

### Resilience
- **Circuit Breaker:** Protects against Yahoo Finance API failures.
- **Rate Limiting:** Exponential backoff for external API calls.
- **Validation:** Strict typing with Zod and TypeScript.
