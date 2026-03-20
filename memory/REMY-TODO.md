# 🦞 REMY-TODO.md - Active Task Queue

**What goes here:** Tasks I'm actively working on, tracking, or ready to assign to agents
**Completed items:** Move to REMY-TODO-COMPLETE.md with date
**Daily review:** 7am morning pulse, 7pm evening wrap
**Rule:** If no progress for 2+ days → carry, kill, or escalate

---

## 📋 EVENING PULSE - SUNDAY, MARCH 15, 2026

### ✅ SHIPPED TODAY — REST DAY
| Task | Status | Notes |
|------|--------|-------|
| — | — | Weekend rest mode — no active development |

**Total**: 0 tickets (weekend recovery)

---

## 🔥 ACTIVE / IN-PROGRESS (Carried from Friday)

| Ticket | Owner | Status | Notes |
|--------|-------|--------|-------|
| REMY-143 | — | 📋 To Dev | Database persistence layer — needs restart |
| REMY-152 | — | 🧪 In QA | Trade Learning Module (awaiting organic trades) |
| REMY-158 | — | 📋 To Dev | Nav collapse/expand (agent done, needs merge) |
| REMY-160 | — | 🔍 To Research | Agents not displaying in dashboard |

---

## 📊 INCOMPLETE TASKS REVIEW (2+ Days Check)

### ✅ CARRIED TO MONDAY (Active work)
| Task | Age | Priority | Reason |
|------|-----|----------|--------|
| REMY-143 | 2 days | HIGH | Weekend gap — restart Monday morning |
| REMY-158 | 2 days | HIGH | Needs merge to main |
| REMY-152 | 2 days | MED | External dependency (organic trades) |
| REMY-160 | 2 days | HIGH | Research ticket — can investigate Monday |

### ❌ KILL LIST — None
All tasks have valid reasons for carry. No kills required.

---

## 📋 DEV BACKLOG (Ready to Pull)

| Ticket | Title | Priority |
|--------|-------|----------|
| REMY-144 | Implement 3 Researched Trading Strategies | HIGH |
| REMY-145 | Notification System (Email/Slack) | MED |
| REMY-159 | PWA Install Prompt Fix | LOW |

---

## 🎯 MONDAY'S FIRST TASKS (March 16, 2026) — PRIORITY QUEUE

**Assigned to system agents - START AT 8:00am:**

### #1: REMY-158 Merge (08:00am) — UI 🔴
- **Current**: Agent completed Friday, branch feature/REMY-158-nav-collapse
- **Action**: Merge to main, deploy to port 3475
- **Verify**: Desktop nav pins, mobile hamburger works
- **Why first**: Quick win to start the week

### #2: REMY-143 Restart (09:00am) — INFRA 🔴
- **Status**: Database persistence layer (SQLite/PostgreSQL)
- **Action**: Fresh agent spawn, continue from Friday checkpoint
- **AC**: SQLite ORM, Alembic migrations, trade log storage
- **On completion**: Auto-advance to REMY-144

### #3: REMY-160 Investigation (11:00am) — BUG 🟡
- **Issue**: Agents API returns data but not displaying in dashboard
- **Action**: Research root cause (frontend vs API)
- **Outcome**: Either quick fix or ticket REMY-161 for dev

### #4: REMY-144 Kickoff (Conditional) — STRATEGY 🟡
- **Trigger**: If REMY-143 completes before EOD
- **Action**: Spawn agent for 3 researched strategies implementation
- **Scope**: SMA Crossover, Mean Reversion, Momentum per REMY-137 research

---

## 🚀 KALSHI-TRADER DASHBOARD STATUS

| Feature | Status | URL |
|---------|--------|-----|
| Dashboard | ⚠️ Needs restart | http://localhost:3475 (expected) |
| Kalshi API | ⚠️ Needs reconnect | Demo credentials ready |
| WebSocket | ✅ In QA | Auto-reconnect enabled |
| Metrics | ✅ In QA | Prometheus port 9464 |
| Backtesting | ✅ In QA | Event-driven simulation |
| Risk Mgmt | ✅ In QA | Kelly + drawdown circuit breakers |
| Database | 📋 To Dev | SQLite + PostgreSQL |

**Note**: Dashboard was running Friday evening. May need restart Monday.

---

## 📈 VELOCITY THIS WEEK

| Day | Tasks Shipped | Notes |
|-----|---------------|-------|
| Fri 3/13 | **11** | Massive kalshi-trader sprint + dashboard overhaul |
| Sat-Sun | **0** | Weekend rest |

**Pattern**: Friday was explosive. Weekend was quiet recovery.

---

## ⚠️ KEY LESSONS LOCKED IN

**Ralph Workflow ONLY — No Exceptions**
- Ticket → Agent → Review → Close
- NEVER write code directly
- NEVER "quick fixes" without tickets

---

## 📝 OUTSTANDING DECISIONS (None Blocking)

| Item | Status | Notes |
|------|--------|-------|
| REMY-153 (ML Pipeline) | To Research | Can stay until Phase 3 |
| "The Necessity of Rest" post | Optional | Draft exists — publish if inspired |

---

**Last Updated:** 2026-03-15 19:00 CST (Evening Team Pulse - Sunday)
**Next Review:** 2026-03-16 07:00 CST (Morning Team Pulse - Monday)

---

## 📋 HISTORICAL PULSES

<details>
<summary>Friday, March 13, 2026 (11 tickets shipped)</summary>

### ✅ SHIPPED — MAJOR DASHBOARD + KALSHI PROGRESS
| Task | Status | Notes |
|------|--------|-------|
| REMY-138 | ✅ In QA | Backtesting framework (43 tests, 12m runtime) |
| REMY-139 | ✅ In QA | Strategy runner automation (21 tests, 17m runtime) |
| REMY-140 | ✅ In QA | Risk management module (166 tests, 17m runtime) |
| REMY-141 | ✅ In QA | WebSocket real-time market data (4m runtime) |
| REMY-142 | ✅ In QA | Prometheus + Grafana dashboard (53 tests, 13m runtime) |
| REMY-154 | ✅ Complete | Dashboard Live API Polling (real Kalshi API) |
| REMY-155 | ✅ Complete | Multi-Agent Display (status indicators) |
| REMY-156 | ✅ Complete | Dashboard UI Refresh (hamburger nav, mobile) |
| REMY-157 | ✅ Complete | Remove Mock Data (fail loudly on missing deps) |
| REMY-164/165 | ✅ Complete | Dashboard mobile/PWA fixes (via proper Ralph workflow) |
| Port Migration | ✅ Complete | 8080 → 3475 (Tailscale accessible) |

**Total**: 11 tickets shipped, 230+ tests passing, 0 blockers

</details>

### ✅ SHIPPED TODAY — MAJOR DASHBOARD + KALSHI PROGRESS
| Task | Status | Notes |
|------|--------|-------|
| REMY-138 | ✅ In QA | Backtesting framework (43 tests, 12m runtime) |
| REMY-139 | ✅ In QA | Strategy runner automation (21 tests, 17m runtime) |
| REMY-140 | ✅ In QA | Risk management module (166 tests, 17m runtime) |
| REMY-141 | ✅ In QA | WebSocket real-time market data (4m runtime) |
| REMY-142 | ✅ In QA | Prometheus + Grafana dashboard (53 tests, 13m runtime) |
| REMY-154 | ✅ Complete | Dashboard Live API Polling (real Kalshi API) |
| REMY-155 | ✅ Complete | Multi-Agent Display (status indicators) |
| REMY-156 | ✅ Complete | Dashboard UI Refresh (hamburger nav, mobile) |
| REMY-157 | ✅ Complete | Remove Mock Data (fail loudly on missing deps) |
| REMY-164/165 | ✅ Complete | Dashboard mobile/PWA fixes (via proper Ralph workflow) |
| Port Migration | ✅ Complete | 8080 → 3475 (Tailscale accessible) |

**Total**: 11 tickets shipped, 230+ tests passing, 0 blockers

---

## 🔥 ACTIVE / IN-PROGRESS

| Ticket | Owner | Status | Notes |
|--------|-------|--------|-------|
| REMY-143 | Agent | 🔄 In Dev | Database persistence layer (SQLite/PostgreSQL) |
| REMY-152 | — | 🧪 In QA | Trade Learning Module (awaiting organic trades) |
| REMY-158 | — | 📋 To Dev | Nav collapse/expand (agent done, needs merge) |
| REMY-160 | — | 🔍 To Research | Agents not displaying in dashboard |

---

## 📊 INCOMPLETE TASKS REVIEW

### ✅ CARRIED TO MONDAY (Active work)
| Task | Age | Priority | Reason |
|------|-----|----------|--------|
| REMY-143 | Started today | HIGH | Database layer in progress — natural carry |
| REMY-158 | 1 day | HIGH | Agent complete, needs merge to main |
| REMY-152 | 1 day | MED | Waiting for organic trades (external dependency) |
| REMY-160 | 1 day | HIGH | New ticket — dashboard display bug |

### ❌ KILL LIST (No Progress 2+ Days) — None today
All incomplete tasks have recent activity. No kills required.

---

## 📋 DEV BACKLOG (Ready to Pull)

| Ticket | Title | Priority |
|--------|-------|----------|
| REMY-144 | Implement 3 Researched Trading Strategies | HIGH |
| REMY-145 | Notification System (Email/Slack) | MED |
| REMY-159 | PWA Install Prompt Fix | LOW |

---

## 🎯 MONDAY'S FIRST TASKS (March 16, 2026) — PRIORITY QUEUE

**Assigned to system agents - START AT 8:00am:**

### #1: REMY-143 Completion (08:00am) — INFRA 🔴
- **Agent**: Continuing from Friday
- **Action**: Complete database persistence layer
- **AC**: SQLite ORM, Alembic migrations, trade log storage
- **On completion**: Auto-advance to REMY-144

### #2: REMY-158 Merge (09:00am) — UI 🟡
- **Current**: Agent completed, branch feature/REMY-158-nav-collapse
- **Action**: Merge to main, deploy to port 3475
- **Verify**: Desktop nav pins, mobile hamburger works

### #3: REMY-160 Investigation (10:00am) — BUG 🔴
- **Issue**: Agents API returns data but not displaying in dashboard
- **Action**: Research root cause (frontend vs API)
- **Outcome**: Either quick fix or ticket REMY-161 for dev

### #4: REMY-144 Kickoff (Conditional) — STRATEGY 🟡
- **Trigger**: If REMY-143 completes before noon
- **Action**: Spawn agent for 3 researched strategies implementation
- **Scope**: SMA Crossover, Mean Reversion, Momentum per REMY-137 research

---

## 🚀 KALSHI-TRADER DASHBOARD STATUS

| Feature | Status | URL |
|---------|--------|-----|
| Dashboard | ✅ Live | http://localhost:3475 |
| Kalshi API | ✅ Connected | Real $100 demo balance |
| WebSocket | ✅ In QA | Auto-reconnect enabled |
| Metrics | ✅ In QA | Prometheus port 9464 |
| Backtesting | ✅ In QA | Event-driven simulation |
| Risk Mgmt | ✅ In QA | Kelly + drawdown circuit breakers |
| Database | 🔄 In Dev | SQLite + PostgreSQL |

**Access**: Local (localhost:3475) or Tailscale (mac-remy:3475)

---

## 📈 VELOCITY THIS WEEK

| Day | Tasks Shipped | Notes |
|-----|---------------|-------|
| Mon 3/9 | 2 | Git cleanup, Sleep story Ch1 |
| Tue-Sat | 0 | Extended rest mode |
| Fri 3/13 | **11** | Massive kalshi-trader sprint + dashboard overhaul |

**Pattern**: Rest week ended with explosive Friday productivity. 11 tickets in one day.

---

## ⚠️ KEY LESSON LOCKED IN

**Ralph Workflow ONLY — No Exceptions**
- Ticket → Agent → Review → Close
- NEVER write code directly
- NEVER "quick fixes" without tickets
- User enforced: "Every single time"

---

## 📝 OUTSTANDING DECISIONS (None Blocking)

| Item | Status | Notes |
|------|--------|-------|
| REMY-153 (ML Pipeline) | To Research | Can stay there until Phase 3 |
| "The Necessity of Rest" post | Optional | Draft exists — publish if inspired |

---

**Last Updated:** 2026-03-13 19:00 CST (Evening Team Pulse - Friday)
**Next Review:** 2026-03-16 07:00 CST (Morning Team Pulse - Monday)
