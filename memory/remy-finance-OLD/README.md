# Remy-Finance 📈

**A personal stock, ETF, and fund tracking dashboard.**

---

## Vision

Track stocks discovered from news, friends, social media, etc. — log them at discovery time and monitor performance over custom timeframes.

**Key Question:** Do these stocks pop immediately, or sit for weeks before moving?

---

## Core Features

### 1. Dashboard Table
| Column | Description |
|--------|-------------|
| **Symbol** | Stock/ETF/Fund ticker (AAPL, SPY, VOO, etc.) |
| **Date Added** | When you discovered/logged it |
| **Entry Price** | Price at discovery time |
| **Daily %** | Today's performance |
| **1 Week** | Performance since added (1 week after) |
| **2 Weeks** | Performance since added (2 weeks after) |
| **1 Month** | Performance since added (1 month after) |
| **Custom** | User-defined timeframes |

### 2. Input Methods
- Manual entry (symbol, date, optional notes)
- Import from clipboard
- "Add from news" quick capture

### 3. Filtering & Sorting
- By date added range
- By performance (best/worst performers)
- By symbol/type (stock vs ETF vs fund)
- By custom tags (#news, #friend-tip, #reddit, etc.)

### 4. Visualization
- Performance charts per stock
- Portfolio overview (if tracking multiple)
- Comparison view (stocks side-by-side)

### 5. Design Requirements
- ✅ Dark mode & Light mode
- ✅ Mobile-first, fully responsive
- ✅ Tailwind CSS
- ✅ Modern, "sick" aesthetic
- ✅ Smooth animations/micro-interactions
- ✅ Easy-to-use, intuitive UX

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| State | Zustand or React Context |
| Backend API | Express.js (Node) |
| Database | SQLite (local) or PostgreSQL |
| Market Data | Yahoo Finance API (via yahoo-data-fetcher, stock-market-pro skills) |
| Charts | Recharts or Chart.js |

---

## Data Model

```typescript
interface TrackedStock {
  id: string;
  symbol: string;
  name?: string;
  type: 'stock' | 'etf' | 'fund' | 'crypto';
  dateAdded: Date;
  entryPrice: number;
  notes?: string;
  tags: string[]; // #news, #friend, #twitter, etc.
  
  // Performance snapshots (calculated)
  dailyChange?: number;
  weeklyChange?: number; // 1 week from dateAdded
  twoWeekChange?: number; // 2 weeks from dateAdded
  monthlyChange?: number; // 1 month from dateAdded
  
  // Real-time (fetched from API)
  currentPrice?: number;
  lastUpdated?: Date;
}
```

---

## Market Data Strategy

**Primary:** Yahoo Finance via `stock-market-pro` skill
- No API key required
- Real-time quotes
- Historical data
- Charts with technical indicators

**Backup:** `yahoo-data-fetcher` skill
- Simple JSON quotes
- Multiple symbols at once

---

## Project Structure

```
~/projects/remy-finance/
├── frontend/          # React + Tailwind app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   └── lib/
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   ├── package.json
│   └── database/
├── README.md
└── .gitignore
```

---

## Team Roles

| Role | Responsibility |
|------|---------------|
| **PM (Remy)** | Coordinate, delegate, track progress |
| **Financial Consultant** | Market data architecture, calculations, Yahoo Finance integration |
| **API Architect** | Backend API design, database schema, endpoints |
| **Frontend Architect** | React architecture, state management, performance |
| **UI/UX Designer (Web)** | Design system, Tailwind components, dark/light mode, mobile UX |
| **Dev** | Implementation |
| **Tech Lead** | Code review, merge approval |

---

## MVP Phases

### Phase 1: Core Tracking
- [ ] Add stock form (symbol, date, notes)
- [ ] Dashboard table with basic data
- [ ] Daily % from Yahoo Finance
- [ ] Simple light/dark mode

### Phase 2: Performance Tracking
- [ ] Calculate 1w, 2w, 1m performance
- [ ] Historical data fetching
- [ ] Basic charts

### Phase 3: Polish
- [ ] Advanced filtering
- [ ] Comparison view
- [ ] Mobile optimization
- [ ] Tags and categorization

---

## Success Metrics

- Can add a stock in < 10 seconds
- Dashboard loads in < 2 seconds
- Mobile experience is smooth
- Performance calculations are accurate
- Dark mode looks "sick"

---

**Started:** 2026-02-04  
**PM:** Remy 🦞  
**Status:** Design phase starting
