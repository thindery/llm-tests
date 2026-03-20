# REMY-TODO.md - Team Task Queue

**Last Updated:** 2026-03-19 7:00 PM CT  
**Next Review:** 2026-03-20 8:00 AM CT

---

## 🔴 TOMORROW'S FIRST TASKS (Start at 8am, Friday March 20)

### 1. Kalshi-Trader: NCAA Basketball Market Discovery + Price Parsing Fix
**Assignee:** dev-agent  
**Priority:** Critical  
**Status:** In Progress (from today)  
**Notes:** Git commit shows "Fix Kalshi client price parsing and add NCAA basketball discovery" was worked on today. Complete the implementation so NCAA basketball markets are discoverable and prices parse correctly.

### 2. Kalshi-Trader: REMY-220 Fix Daily Volume Calculation
**Assignee:** dev-agent  
**Priority:** High  
**Status:** In Dev  
**Notes:** Daily volume calculation needs verification and fix. Part of the "preserve UI" re-implementation series.

### 3. Kalshi-Trader: REMY-211 Orders Count on Agents Page
**Assignee:** dev-agent  
**Priority:** Medium  
**Status:** In Dev  
**Notes:** Display orders count alongside trades count on agents page. Backend likely done, frontend needs completion.

---

## 📋 BACKLOG (Ready to Pull)

### ML Pipeline Phase 1 Completion (REMY-189)
- Database schema for suggestions, outcomes, confidence
- Shadow Mode Engine for suggestion logging
- Currently "In Dev" - ready for completion

### Agent Paige - BLOCKED by Tylor Decision
- REMY-111 through REMY-107: Supabase setup (needs SQL run in Supabase dashboard)
- REMY-106, REMY-104, REMY-105: Dashboard features (blocked by auth migration)
- TASK-084: Auth system (needs decision on Clerk vs Supabase)
- **No action until Tylor unblocks**

### Kalshi-Trader ML Pipeline (Blocked by REMY-152)
- REMY-189 through REMY-193: ML Pipeline Phases 1-5
- REMY-152: Trade Learning Module (needs 200+ trades first)
- REMY-153: Model Training Pipeline (depends on 152)

### ML Pipeline Phase 2 (REMY-190) → DONE
- Confidence Scoring & A/B Testing Framework - IMPLEMENTED
- See code in src/kalshi_trader/ml/

---

## ✅ TODAY'S SHIPPED (March 19)

1. **REMY-240: Daily Momentum Strategy** - IMPLEMENTED & ACTIVE
   - Fast Loop adaptation for Kalshi's daily markets
   - Entry threshold: 0.5% deviation, Exit: 0.2% correction
   - Running in production with LIVE account ($98.20)
   - Risk controls: Circuit breaker (3 losses), daily drawdown 3%
   
2. **Kalshi Trader Production Setup** - COMPLETE
   - Live environment configured (api.elections.kalshi.com)
   - WebSocket migrated to production endpoints
   - Balance showing real $98.20 from production account
   - Dashboard auto-detects LIVE vs DEMO mode

3. **REMY-189: ML Pipeline Phase 1** - FOUNDATION DONE
   - Database schema created
   - Shadow mode engine implemented
   - Agent tracker OpenClaw integration fixed
   - PR merged to main

4. **REMY-190: ML Pipeline Phase 2** - IMPLEMENTED ✅
   - Bayesian confidence scoring for reversion, breakout, volatility
   - A/B testing framework with 50/50 assignment
   - Real-time Streamlit dashboard with confidence trends
   - Statistical comparison (Welch's t-test)
   - Full test coverage (14 unit tests)
   - Research documentation complete

4. **REMY-242: python-dotenv Integration** - DONE
   - Live trading connection test working
   - Environment variables properly loaded
   - Production credentials validated

5. **Remy-Tracker Database Restoration** - FIXED
   - Database corrupted yesterday, restored from backup
   - All 242 tickets recovered
   - CLI and web API operational

6. **REMY-241: System Stability Investigation** - TICKET CREATED
   - Root cause identified: Claude Code + Ollama integration causing memory exhaustion
   - Decision: Paused Claude Code agents
   - System stable now

---

## 🚫 KILLED (No Progress 2+ Days)

**PocketMind Research (stale since March 12):**
- REMY-116: Research Rewind.ai memory tool
- REMY-123: Research local-first architecture options  
- REMY-124: Research browser extension frameworks
- REMY-135: Fix Wireless ADB Reliability

*Rationale: 7+ days in "To Research" with no movement. Kalshi-Trader is current priority. Can recreate if PocketMind becomes active again.*

---

## 📊 SYSTEM HEALTH

| Service | Port | Status |
|---------|------|--------|
| Remy-Tracker Web | 3474 | ✅ Online (242 tickets) |
| Kalshi-Trader Dashboard | 3475 | ✅ Live Environment, $98.20 balance |
| Daily Momentum Strategy | - | ✅ Active, monitoring |
| Ollama Agents | - | ⏸️ Paused (REMY-241) |

---

## 🎯 WEEKLY GOALS (Week of March 16)

1. ⏳ Complete Kalshi-Trader dashboard polish (Daily Volume, Orders Count) - In Dev
2. ✅ Fix Remy-Tracker Kanban desktop scroll - Verified complete
3. ⏳ **NEW: Complete NCAA Basketball market discovery + price parsing** - Started today
4. ✅ ML Pipeline Phase 1 completion (REMY-189) - DONE
5. ✅ ML Pipeline Phase 2 (REMY-190) - Confidence Scoring & A/B Testing - DONE

---

## 📝 NOTES FOR TOMORROW

- **Strategy is LIVE:** Daily Momentum Strategy running against real markets with $98.20
- **No weekend trading:** Kalshi markets close Friday evening, reopen Sunday
- **NCAA opportunity:** March Madness markets active - priority for tomorrow
- **System stable:** After Claude Code pause, memory pressure resolved
- **REMY-190 DONE:** ML Pipeline Phase 2 complete with confidence scoring & A/B testing
- **REMY-189 DONE:** ML Pipeline foundation fully implemented with all phases

---

*This file is auto-generated by team-pulse-evening cron job.*
