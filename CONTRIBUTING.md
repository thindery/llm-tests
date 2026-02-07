# Contributing Guide — Dev Team Workflow

> **TL;DR:** Small, focused PRs. One feature per branch. Review fast, merge often.

---

## 🎯 PR Philosophy

**Golden Rule:** 
> One PR = One logical change. Not one massive PR with everything.

**Why small PRs?**
- ✅ Faster code reviews (Tech Lead can review in 10 min, not 2 hours)
- ✅ Easier debugging ( problems are isolated)
- ✅ Less merge conflicts (parallel work possible)
- ✅ Safer rollbacks (revert one small thing, not everything)
- ✅ Clear history (git log tells a story)

---

## 📦 PR Size Guidelines

| PR Size | Lines of Code | Review Time | Acceptable? |
|---------|--------------|-------------|-------------|
| **Tiny** | < 50 lines | 5 min | ✅ Ideal |
| **Small** | 50-200 lines | 10-15 min | ✅ Perfect |
| **Medium** | 200-500 lines | 20-30 min | ⚠️ Okay if focused |
| **Large** | 500-1000 lines | 45+ min | ❌ Break it up |
| **Huge** | 1000+ lines | Hours | ❌❌ Definitely break it up |

---

## 🏗️ Chunked PR Strategy (Example: Pantry-Pal Monetization)

**Instead of:**  
❌ One giant PR: "Add monetization" (500+ lines, touches DB, backend, frontend, UI)

**Do this:**  
✅ Six small, sequential PRs:

### PR 1: Database Schema Foundation
```
Branch: feature/stripe-schema
Files: database/migrations/, models/user.ts
Lines: ~50
Review: "Add user tier fields for monetization"
```

### PR 2: Stripe Backend Setup  
```
Branch: feature/stripe-backend
Files: api/stripe.ts, config/stripe.ts
Lines: ~150
Review: "Stripe checkout and webhook handlers"
```

### PR 3: Feature Gating Middleware
```
Branch: feature/tier-gating
Files: lib/tier-gating.ts, middleware/
Lines: ~100
Review: "Tier checking utilities, no UI changes"
```

### PR 4: Pricing Page UI
```
Branch: feature/pricing-page
Files: pages/pricing.tsx, components/PricingCard.tsx
Lines: ~200
Review: "Pricing page with tier comparison"
```

### PR 5: Upgrade Flow Integration
```
Branch: feature/upgrade-flow
Files: components/UpgradeModal.tsx, hooks/useUpgrade.ts
Lines: ~150
Review: "Checkout flow + tier upgrade handling"
```

### PR 6: Pro Feature Restrictions
```
Branch: feature/pro-restrictions
Files: components/ItemLimitWarning.tsx, hooks/useItemCount.ts
Lines: ~100
Review: "Item limits, AI limits, upgrade prompts"
```

---

## 🔄 Recommended Order for Dependent Features

```
PR 1 (schema)
    ↓
PR 2 (backend) ──┬── PR 3 (gating) ──┬── PR 4 (pricing)
    ↓            │                    │
    │            └── PR 5 (flow) ─────┘
    ↓                                 
    └────────────── PR 6 (restrictions)
```

**Parallel work possible after PR 3 is merged:**
- Dev A works on PR 4 (pricing page)
- Dev B works on PR 5 (upgrade flow) 
- Both can progress independently

---

## ✍️ PR Description Template

```markdown
## What this PR does
Brief 1-2 sentence description

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Tested locally
- [ ] Unit tests pass
- [ ] Manual QA done

## Screenshots (if UI)
[Before/After images]

## Related PRs
- Depends on: #1 (if any)
- Blocks: #4 (if any)
```

---

## 🚫 Don't Do This (Usually)

**❌ The Mega-PR:**
```
Branch: feature/everything
Commits: 50
Lines: +2,400 / -800
Files: 45 files across frontend, backend, database, tests, docs
Review time: 3+ hours
Merge conflicts: Constant during review
```

**⚠️ Pragmatic Exception:** Sometimes a tightly-coupled feature (like adding Stripe payments) touches backend + frontend + schema together, and splitting actually creates *more* complexity. In these cases:
- Limit to 2-3 focused commits
- Clear separation in commit messages
- Good test coverage
- Fast review (don't let big PRs sit)

**❌ The Mystery PR:**
```
Title: "Updates"
Description: empty
No screenshots
No testing notes
Reviewers have to guess what's happening
```

**❌ The WIP PR:**
```
Title: "WIP - don't review yet"
Commit messages: "fix", "oops", "try again", "finally works"
Force pushes: 20
Confuses everyone
```

---

## ✅ Do This Instead

**✅ The Perfect PR:**
```
Title: "Add Stripe checkout endpoint"
Branch: feature/stripe-checkout
Lines: +120 / -15
Files: 3
Description: 
  - Implements POST /api/create-checkout-session
  - Handles Stripe product/price lookup
  - Returns checkout URL for redirect
  
Testing: Tested with Stripe CLI webhook forwarding
Related: PR #1 merged (database schema already in main)
```

---

## 🎓 Learning Resources

- [Google Code Review Best Practices](https://google.github.io/eng-practices/review/)
- [How to Write Small, Focused PRs](https://www.atlassian.com/blog/git/written-unwritten-guide-pull-requests)

---

## 📋 Quick Checklist Before Opening PR

- [ ] PR is < 500 lines (ideally < 200) *[exceptions OK if tightly coupled]*
- [ ] One logical feature/fix per PR
- [ ] Clear description of what changed and why
- [ ] Tests included or QA notes
- [ ] No unrelated changes sneaked in
- [ ] Branch name is descriptive: `feature/payment-stripe`, `fix/login-error`
- [ ] Commit messages are clear
- [ ] Screenshots if UI changes
- [ ] Not marked "WIP" or "Draft" unless actually WIP
- [ ] If PR is large (>500 lines), explain why splitting wasn't practical

---

**Last Updated:** 2026-02-04  
**Enforced by:** Remy 🦞 and Tech Lead 👨‍💼
