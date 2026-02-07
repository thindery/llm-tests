# 🦞 REMY-TODO.md — Active Tasks

**What goes here:** Research, investigations, my learning tasks  
**Completed items:** Moved to [REMY-TODO-COMPLETE.md](./REMY-TODO-COMPLETE.md)  
**Daily review:** Every morning 7am CST

---

## 🔥 URGENT (Next 24h)

- [ ] **7AM VOICE BRIEFINGS** — Figure out TTS → voice recording → #briefings channel
  - Research: Kokoro TTS skill, ElevenLabs, or browser capture
  - Goal: Daily 7am voice standup in #briefings
  - Assigned: Remy
  - Blocking: Daily ritual automation

---

## ⚡ HIGH PRIORITY (This Week)

### 1. True Agents Investigation
- [ ] Investigate how pantry-pal "agents" worked vs current remy-finance block
  - Review pantry-pal workflow history (check MEMORY.md, daily logs)
  - Check if agents were real `sessions_spawn` or just simulated
  - Verify if openclaw.json was actually changed for pantry-pal
  - Document findings for thindery — clear up the confusion
  - Assigned: Remy

### 2. Twitter OAuth Research
- [ ] Research Twitter OAuth for @RemyLobster automation
  - Find step-by-step OpenClaw + Twitter OAuth guide
  - Explore OAuth 1.0a vs 2.0 — which is simpler?
  - Check clawhub for alternative Twitter/X skills
  - Document SIMPLE setup process
  - Assigned: Remy

### 3. Ollama Usage Monitor
- [ ] Maximize $20/mo Ollama Cloud plan usage
  - Research if ollama.com has hidden API for quota checks
  - Explore browser automation to check https://ollama.com/account
  - Build alert system for "underutilized" periods
  - Track 3-hour + 7-day windows
  - Assigned: Remy

### 4. UNIFIED Analytics Strategy — ALL Projects
- [ ] **Research & recommend ONE consistent analytics solution for all 5 ventures**
  - **Why unified:** Consistency across projects, single dashboard, easier management
  - **Projects needing analytics:**
    - remylobster.com (blog)
    - pantry-pal.com (future)
    - remy-finance.com (future)
    - sleepstoriesyoutube.com (future)
  - **Requirements:**
    - 100% FREE (or near-free at low scale)
    - Works with multiple domains/subdomains
    - Privacy-friendly (no cookie banner)
    - Simple setup (script tag preferred)
    - Shows: pageviews, referrers, popular content, basic demographics
  - **Options to evaluate:**
    - **Google Analytics 4** (FREE but cookie banner needed?)
    - **Cloudflare Web Analytics** (FREE, no cookies, multi-domain?)
    - **GoatCounter** (FREE <100k views, open source)
    - **Umami** ($0 self-hosted on Railway free tier)
    - **Plausible** ($0 self-hosted or $6/mo shared)
    - **PostHog** (FREE tier available)
    - **Mixpanel** (FREE tier available)
  - **Research questions:**
    - Do any support multi-domain in free tier?
    - Which require cookie consent banners?
    - Which work best with static sites (Vercel)?
    - Self-hosted vs cloud: which is easier for you?
  - **Deliverable:** Comparison table + recommended solution for all projects
  - **Assigned:** Remy
  - **Priority:** Medium (enables data-driven decisions)

---

## 📌 MEDIUM PRIORITY (Next 2 Weeks)

### 5. API Deployment Research — Pantry-Pal
- [ ] **Research best practice for deploying pantry-pal-api with Vercel**
  - **Context:** thindery prefers Vercel (easy GitHub integration)
  - **Challenge:** 2 repos (frontend + API) need coordinated deployment
  - **Options to evaluate:**
    - Vercel serverless functions (convert Node → serverless)
    - Vercel + Railway/Fly.io (frontend on Vercel, API elsewhere)
    - Monorepo approach (combine frontend + API in one repo)
  - **Considerations:**
    - SQLite persistence (Vercel serverless = ephemeral filesystem)
    - GitHub auto-deploy flow (trigger both on push?)
    - Database migration strategy (SQLite → PostgreSQL upgrade path)
  - **Deliverable:** Recommendation + setup guide for 2-repo deployment
  - **Assigned:** Remy
  - **Priority:** After True Agents investigation

### 6. X API Search (Free Alternatives)
- [ ] Find <$10/mo Twitter read/search solution
  - Check X Premium ($8/mo) — NO API included
  - Research Nitter, RSS feeds as alternatives
  - Look for unofficial/free proxies
  - Target: < $10/mo instead of $100/mo Basic tier
  - Assigned: Remy

### 7. Memory System Optimization
- [ ] Keep engram manual mode organized
  - Migrate all venture status to entity files (done! monitor for drift)
  - Capture corrections/preferences from sessions
  - Weekly review of profile/entities for accuracy
  - Assigned: Remy

---

## 🔄 ONGOING / MONITORING

- [ ] **OpenClaw Update** — Watch for 2026.2.4+ (cron scheduler fix)
  - Current: 2026.2.3-1
  - Status: All 21 jobs backed up, awaiting patch
  - Action: Check `npm show openclaw version` daily

- [ ] **Cron Job Restoration** — Restore recurring jobs after patch
  - Source: `~/memory/CRON-BACKUP-2026-02-06.md`
  - Jobs: 7am standup, hourly checks, awesome-openclaw updater

- [ ] **Awesome-OpenClaw Maintenance** — Continue hourly scans
  - Repo: `~/projects/awesome-openclaw/`
  - Current: 100+ skills, 80+ tools documented

---

## 🤔 RESEARCH QUEUE (Backlog)

- [ ] Moltuni platform research (skill marketplace revenue)
- [ ] QMD Memory integration (if engram needs enhancement)
- [ ] Pay Lobster beta signup (for AgentAds payment rails)
- [ ] 4-hour awesome-openclaw scan automation optimization

---

**Rules for this file:**
1. ✅ When done → move to REMY-TODO-COMPLETE.md with completion date
2. ❌ When no longer relevant → move to REMY-TODO-COMPLETE.md as "CANCELLED"
3. 📅 Review every morning 7am
4. 🦞 Only MY tasks — thindery's tasks go in THINDERY-TODO.md

**Last Updated:** 2026-02-06 22:30 CST  
**Next Review:** 2026-02-07 07:00 CST
