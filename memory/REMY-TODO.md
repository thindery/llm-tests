# 🦞 REMY-TODO.md — Active Task Queue

**What goes here:** Tasks I'm actively working on, tracking, or ready to assign to agents  
**Completed items:** Move to REMY-TODO-COMPLETE.md with date  
**Daily review:** 7am morning pulse, 7pm evening wrap  
**Rule:** If no progress for 2+ days → kill it or escalate

---

## 🔥 ACTIVE AGENTS / IN-PROGRESS

### Agent Paige (RemyCities Pivot)
| Ticket | Status | Agent | Notes |
|--------|--------|-------|-------|
| PAIGE-008 | ✅ MERGED | thindery | Logo v2 complete - face in P concept |
| TASK-073 | ✅ MERGED | thindery | One Repo Per User architecture live |
| TASK-077 | ✅ MERGED | thindery | Stripe subscription payments integrated |
| TASK-078 | ✅ MERGED | thindery | Landing → Dashboard connection live |
| TASK-080 | ✅ MERGED | thindery | Ralph branch workflow enforcement |
| REMY-094 | ✅ COMPLETE | thindery | Landing page sections (6 sections) — PR #25 ready |
| Chat Integration | ✅ DONE | Agent | Kimi connected to Agent Paige Chat |
| Vercel Deploy | ✅ DONE | thindery | Git-connected deployment workflow |
| RC-003 | 🔴 BLOCKED (4 days) | — | **ESCALATE:** Vercel Team setup needed |

### Ralph Workflow Improvements
| Ticket | Status | Notes |
|--------|--------|-------|
| TASK-042 | ✅ DONE | Phase automation complete |
| TASK-040 | ✅ DONE | Phase tracking improvements complete |
| TASK-066 | ✅ DONE | Kimi K2.5 Cloud integration confirmed |

---

## ⏳ QUEUED (Next 3 Days)

### Saturday 2/28 - COMPLETED ✅
Big day! Merged 7 PRs:
- TASK-077: Stripe subscriptions
- TASK-078: Landing → Dashboard
- TASK-073: One Repo Per User Git architecture
- TASK-080: Ralph branch workflow enforcement  
- RC-SECURITY-001: Rate limiting (4 layers)
- PAIGE-008: Logo v2 face-in-P concept
- Chat: Kimi connected to Agent Paige Chat

Night shift check PASSED at 10:00 PM CST.

### Sunday 3/1 - COMPLETED ✅
- [x] Business Scout research completed — 6 opportunities identified
- [x] Evening team pulse wrap-up

### Monday 3/2 - COMPLETED ✅
- [x] REMY-094: Landing page sections created (Features, HowItWorks, Pricing, Examples, FAQ, Footer)
- [x] PR #25 ready for merge (pending CI fix)
- [x] Content moderation research — 6 package alternatives documented (TASK-028)
- [x] Ralph workflow fixes (cron job health check)

### Tuesday 3/3 - TOMORROW'S PLAN
- [ ] **ESCALATE to thindery:** RC-003 — Vercel Team setup (3+ days blocking)
- [ ] 7:00am — Morning briefing with TTS
- [ ] 7:30am — Resolve merge: 8 uncommitted files need review/commit
- [ ] 8:00am — Fix CI configuration (Clerk API keys for build check)
- [ ] **CRITICAL: Configure production environment:**
  - [ ] Clerk API keys in Vercel production environment
  - [ ] NEXT_PUBLIC_CLERK_* URLs configured
  - [ ] SUPABASE env vars verified
  - [ ] STRIPE keys separated (test vs prod)
- [ ] 9:00am — Decision: Purchase agentpaige.com domain
- [ ] 9:30am — Merge REMY-094 PR #25 (admin override if CI still failing)
- [ ] 10:00am — Set up staging environment (RC-008)
- [ ] 11:00am — Launch checklist Phase 1: Pre-launch technical review start

---

## 📋 BACKLOG — READY TO ASSIGN

### RemyCities (RC Series)
- [ ] RC-007: Template gallery UI
- [ ] RC-008: Staging environment setup
- [ ] RC-009: Domain connection logic
- [ ] RC-010: Landing page copy
- [ ] RC-011: Beta user onboarding flow
- [ ] RC-012: Billing dashboard
- [ ] RC-013: Analytics integration
- [x] **RC-014: Launch checklist** — **COMPLETE** 📄
  - Comprehensive checklist created: `memory/AGENT-PAIGE-LAUNCH-CHECKLIST.md`
  - 5 phases: Pre-launch technical → Go-live deployment → Post-launch validation → Marketing/communications → Risk mitigation
  - Estimated time to launch: **3-5 business days** (after blockers resolved)
  - Critical blockers identified: RC-003, Clerk keys, domain purchase

### Documentation
- [ ] Import remaining research docs (auto-cron running)
- [ ] Update AGENT_ROLES.md with new learnings

---

## 🤔 RESEARCH QUEUE

- [ ] Validate AI compliance opportunity (Colorado AI Act, June 2026)
- [ ] Follow up on paid trial project platform idea from business scout
- [ ] Track typemysite.com domain availability

---

## 🚫 NO-GO (Needs Thindery) - **STALE (4 days)**

| Item | Blocker | Since | Days Stale | Action |
|------|---------|-------|------------|--------|
| RC-003 | Vercel Team setup under Peak Collective | Feb 26 | **4 days** | 🔴 **ESCALATE** — blocks ALL deployment paths |
| REMY-035 | Peak Collective Website review | Feb 26 | 4 days | Review pending |
| Domain purchase | agentpaige.com vs typemysite.com | Feb 27 | 3 days | Decision needed: rebrand direction |

**URGENT:** RC-003 is the critical path blocker. Without Vercel Team setup:
- Staging environments cannot be created (RC-008)  
- Production deployment pipeline cannot be tested
- Clerk keys cannot be validated in CI
- Launch timeline is **indefinitely delayed**

---

## 🚀 LAUNCH READINESS (Agent Paige MVP)

**Status:** Pre-launch | **Target:** TBD | **Checklist:** `memory/AGENT-PAIGE-LAUNCH-CHECKLIST.md`

### Phase Progress

| Phase | Status | Key Blockers | Progress |
|-------|--------|--------------|----------|
| 1. Pre-launch Technical | 🔴 Blocked | Clerk keys, Vercel Team | 0% |
| 2. Go-live Deployment | ⏸️ Not Started | Depends on Phase 1 | 0% |
| 3. Post-launch Validation | ⏸️ Not Started | Depends on Phase 2 | 0% |
| 4. Marketing/Communications | ⏸️ Not Started | Depends on Phase 2 | 0% |
| 5. Risk Mitigation | 📝 Planned | Rollback plan documented | 80% |

### Critical Path (Must Complete in Order)

```
RC-003 → Clerk Keys → Domain → Phase 1 → Staging → Launch
```

1. **RC-003: Vercel Team setup** — 🔴 3 days stale
2. **Clerk Production Keys** — 🔴 Blocking dashboard build
3. **Domain Purchase** — 🟡 Decision needed (agentpaige.com)
4. **Phase 1 Tests** — ⏸️ Waiting
5. **Staging Deploy** — ⏸️ Waiting
6. **Production Launch** — ⏸️ Waiting

### Estimated Timeline (After Blockers Cleared)

- Day 1: Resolve blockers + staging setup
- Day 2: Phase 1 testing + bug fixes
- Day 3: Final validation + soft launch
- Day 4: Marketing launch + beta users

---

## 🔧 UNCOMMITTED CHANGES (Needs Review)

**Status:** Merge in progress — 8 files staged, pending completion
```
Modified: skills/dev-agent/SKILL.md — Ralph workflow updates
Modified: skills/ralph/ralph-helper.sh — Branch enforcement fixes  
Modified: src/app/api/chat/route.ts — Chat API enhancements
Modified: src/app/api/deploy/trigger/route.ts — Deploy webhook updates
Modified: src/app/dashboard/chat/page.tsx — Dashboard UI improvements
Modified: src/components/ChatPanel.tsx — Chat panel component updates
Modified: src/lib/index.ts — Lib exports/index updates
Modified: src/lib/vercel/webhook-handler.ts — Webhook handling fixes
New:       prompts/ — New prompt templates
New:       dist/assets/ — Build assets
```

**Action needed:** Review merge conflicts, complete git commit before Tuesday morning work

---

**Last Updated:** 2026-03-02 19:00 CST (Evening Team Pulse)  
**Next Review:** 2026-03-03 07:00 CST (Morning Briefing - Launch Focus)
