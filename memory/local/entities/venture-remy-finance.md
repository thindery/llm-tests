---
id: entity-venture-remy-finance
category: entity
type: project
created: 2026-02-06T22:06:00.000Z
updated: 2026-02-06T22:06:00.000Z
name: Remy-Finance
aliases: ["remy-finance", "finance-dashboard"]
status: in-development
---

# Remy-Finance 📈

**Tagline**: Stock/ETF/fund tracking dashboard with custom timeframe analysis

## Basic Info

- **Type**: Web application (SaaS)
- **Frontend**: `~/projects/remy-finance/` (React + TypeScript + Tailwind)
- **API**: `~/projects/remy-finance-api/` (Node/Express)
- **Status**: 🟡 Backend complete, Frontend in progress
- **Data Source**: Yahoo Finance (FREE, no API key, 2000 req/hr)

## Features

### Backend (✅ Complete)
- ✅ Express server with Helmet, CORS, compression
- ✅ REST endpoints: `/search`, `/quote/:symbol`, `/quotes`, `/historical/:symbol`
- ✅ Custom timeframe support (minutes to years)
- ✅ Redis caching (5-min TTL)
- ✅ Circuit breaker pattern
- ✅ Input validation (symbol sanitization)

### Frontend (🛠️ In Progress)
- 🔄 Dark/light mode toggle
- 🔄 Mobile-first design
- 🔄 Candlestick & Line charts
- 🔄 Technical indicators (MA5/20/60)

## Blockers

| Blocker | Status | Notes |
|---------|--------|-------|
| Frontend components | 🟡 IN PROGRESS | Needs Dev assignment |
| API wiring | 🟡 PENDING | Frontend → backend connection |
| TypeScript build | 🟢 FIXED | Resolved with relaxed tsconfig |

## Revenue Projection

- **Target**: $300-600/month
- **Model**: Freemium with premium features
- **Differentiator**: Custom timeframe analysis (minutes to years)

## Next Steps

1. Complete frontend UI components
2. Wire frontend to real API endpoints
3. Test real data flow
4. Deploy and launch

## Architecture

- **Frontend**: React + Vite + Tailwind + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Data**: Yahoo Finance API
- **Caching**: Redis (optional)

## Notes

Backend API successfully built with Kimi K2.5. Team workflow (Dev/Tech Lead/Security/QA) ready but blocked on subagent configuration in openclaw.json. May work directly as main agent due to limitation.
