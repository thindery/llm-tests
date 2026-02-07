# 📝 THINDERY-TODO.md — Your Action Items

**What goes here:** Decisions YOU need to make, actions YOU need to take  
**Completed items:** Moved to [THINDERY-TODO-COMPLETE.md](./THINDERY-TODO-COMPLETE.md)  
**Daily review:** Check this every morning  

---

## 🔥 URGENT (Blocking Launch)

### 1. Pantry-Pal Local Testing
- [ ] **Test Pantry-Pal locally on phone**
  - **Approach:** ngrok for HTTPS mobile testing (not Vercel for now)
  - **Need from you:**
    - Start pantry-pal-api locally
    - Run ngrok tunnel for API
    - Build frontend, test barcode scanning on phone
    - Share with friend for feedback
  - **Blocker:** None — ready anytime
  - **Next after validation:** Domain purchase → Vercel deploy ( researched by Remy)
  - **Revenue target:** $200-500/mo
  - **Assigned:** thindery
  - **Status:** READY FOR LOCAL TESTING

---

## ⚡ HIGH PRIORITY (This Week)

### 2. OpenClaw Update Decision
- [ ] **Approve update to OpenClaw 2026.2.6?**
  - **Current:** 2026.2.3-1 (has cron scheduler bug)
  - **Available:** 2026.2.6 (may have fix)
  - **Risk:** Unknown if fix included
  - **Rollback:** Can downgrade if issues
  - **My recommendation:** Update and test
  - **Assigned:** thindery (needs your approval)

### 3. Analytics Strategy Decision
- [ ] **Wait for Remy's unified analytics research**
  - **Context:** Want ONE consistent analytics for ALL projects (blog + 4 ventures)
  - **Options:** Remy researching GA4, Cloudflare, GoatCounter, Umami, Plausible, PostHog, Mixpanel
  - **Questions:**
    - Multi-domain tracking on free tier?
    - Cookie consent banner requirements?
    - Self-hosted vs cloud preference?
  - **Deliverable:** Remy will provide comparison + recommendation
  - **Your decision needed after:** Which solution to standardize on
  - **Note:** Cloudflare auto-injection didn't work (reverted code)
  - **Assigned:** thindery (decision after research)
  - **Priority:** Medium (enables data tracking across all sites)

### 4. Twitter API Strategy Decision
- [ ] **Choose Twitter/X API approach**
  - **Option A:** Pay $100/mo Basic tier (search/read API)
  - **Option B:** Stay on free tier (write-only), manual monitoring
  - **Option C:** Wait for my research findings (<$10 alternatives)
  - **Need this for:** Remy-Finance news integration, @RemyLobster engagement
  - **Assigned:** thindery (budget decision)

---

## 📌 MEDIUM PRIORITY (Next 2 Weeks)

### 4. Provide API Keys
- [ ] **Stripe account + API keys** for Pantry-Pal payments
  - **Need:** Stripe secret key for webhook processing
  - **Setup time:** ~30 minutes
  - **Blocker:** Can't test payments without this

- [ ] **(Optional) Google Calendar API** for event reminders
  - **Need:** Calendar API credentials
  - **Benefit:** I can remind you of meetings, birthdays

- [ ] **(Optional) Firecrawl or Brave Search API** for web search
  - **Need:** Better web search than current (often fails)
  - **Benefit:** Better research capabilities

### 5. Code Review/Approval Workflow
- [ ] **Decide: Do you want Tech Lead reviews on all PRs?**
  - **Current:** Not configured (only `main` agent available)
  - **To enable:** Add agents list to openclaw.json
  - **Tradeoff:** Slower (reviews) vs faster (direct commits)
  - **My recommendation:** Enable for production code, skip for experiments
  - **Assigned:** thindery (process decision)

---

## 🔄 MONITORING / WAITING ON

- [ ] **AgentAds integration** — POC ready, needs live test
  - **Status:** Deployed? (need you to verify/test)
  - **Target:** One visitor sees one relevant ad on awesome-openclaw
  - **Action needed:** Your go/no-go on proceeding

- [ ] **YouTube Sleep Stories sample** — 1-min video due
  - **Status:** Did you produce the Clockmaker's Library sample?
  - **Need:** Your feedback on quality before full production
  - **Assigned:** thindery (production task)

---

## 🎯 DECISIONS NEEDED (No Rush)

- [ ] **Blog Vercel access** — Disable public Vercel URL?
  - Context: remylobster.com is live, vercel app still accessible
  - Your call: Password protect vercel or leave it?

- [ ] **Carbon Ads application** — Apply now or wait for 5K visitors?
  - Current: Unknown visitor count
  - My recommendation: Wait until 5K/mo threshold

- [ ] **Mac Studio purchase timing** — When to buy?
  - Target: $11,000 M3 Ultra 512GB
  - Funding: From venture revenue
  - Your call: Pre-order or wait for reviews?

---

## 📋 RECURRING REMINDERS

**Every morning:**
- Check this file for blockers
- Review venture entities for status updates
- Reply to any Remy questions needing decisions

**Weekly (Mondays):**
- Review completed items (move to -COMPLETE file)
- Reprioritize based on new ventures/goals
- Update any stale information

---

**Rules for this file:**
1. ✅ When done → move to THINDERY-TODO-COMPLETE.md with completion date
2. ❌ When no longer relevant → move to THINDERY-TODO-COMPLETE.md as "CANCELLED"
3. 📅 Review daily
4. 👤 Only YOUR tasks — my tasks go in REMY-TODO.md

**Last Updated:** 2026-02-06 22:15 CST  
**Next Review:** Daily  
**Questions?** Tag @RemyLobster in #daily or DM
