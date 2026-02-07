# Authentication Architecture Recommendation: Pantry-Pal

**Date:** 2026-02-03
**Task:** Select best auth solution for React + Express + SQLite pantry app

---

## 🏆 Recommendation: Clerk

Clerk is the optimal choice for pantry-pal given the requirements for "super easy, super cheap" with Google OAuth and minimal code changes.

### Why Clerk Wins for Pantry-Pal

| Factor | Clerk Advantage |
|--------|-----------------|
| **Ease** | Drop-in React components (`<SignIn />`, `<UserButton />`). No auth UI to build. |
| **Backend** | JWT verification in Express is ~10 lines of middleware. Keep existing SQLite. |
| **Free Tier** | 10,000 MAU included (10× your 1k requirement). No credit card needed. |
| **Google OAuth** | Included in free tier (up to 3 social providers). One-click familiar login. |
| **Growth Path** | Clear pricing; easy to migrate off if needed (standard JWT, exportable users). |

### Cost Analysis

| Users | Monthly Cost | Notes |
|-------|--------------|-------|
| 1,000 | **$0** | Well within free tier (10k MAU) |
| 10,000 | **$0** | Still within free tier |
| 100,000 | **~$1,825** | $25 base + 90k × $0.02/MAU |

**Note:** At 100k users, you'll likely be generating revenue. Clerk's pricing aligns with SaaS growth stages.

### Migration Path from Single-User SQLite

1. **Add `user_id` column** to pantry items table (nullable during transition)
2. **Wrap Clerk provider** around React app (15 min setup)
3. **Add Express middleware** to verify Clerk JWTs on API routes (~20 lines)
4. **Update queries** to filter by `user_id` from JWT claims
5. **Soft-delete or archive** existing anonymous data, or prompt users to "claim" it on first login

**Breaking Changes:**
- Existing local data becomes orphaned unless migrated
- API now requires authentication (add `Authorization` header)

---

## Why Not the Others?

| Option | Dealbreaker for Pantry-Pal |
|--------|---------------------------|
| **Supabase Auth** | Forces PostgreSQL migration. Great if starting fresh, but heavy lift for existing SQLite app. |
| **Firebase Auth** | 50k free MAU is tempting, but requires Firebase ecosystem adoption. Vendor lock-in risk for a SaaS product. |
| **Auth0** | Free 25k MAU, but paid plans start at $35/mo for only 500 MAU. Expensive scaling curve. |
| **Passport.js / Lucia** | Free and flexible, but 2-3 weeks of implementation vs. Clerk's 1-2 days. "Super easy" requirement not met. |

---

## Implementation Estimate

| Phase | Time | Work |
|-------|------|------|
| Setup | 2-4 hours | Clerk dashboard, React SDK, Google OAuth config |
| Backend | 4-6 hours | JWT middleware, user ID integration, data isolation |
| Testing | 2-3 hours | Login flows, session management, edge cases |
| **Total** | **1-2 days** | Minimal disruption to existing codebase |

---

## Future-Proofing Notes

- Clerk uses standard JWTs → migrating away later is straightforward
- User data exportable via API if you outgrow them
- No database lock-in (unlike Supabase/Firebase)
- Easy to add organizations/teams later if pantry-sharing becomes a feature

---

## Verdict

**Use Clerk.** It hits the sweet spot of "drop-in easy" while being genuinely free for the first 10,000 users. Your SQLite + Express backend stays intact, you get beautiful pre-built auth UI, and Google OAuth works in minutes. The only faster option is Firebase, but Clerk avoids the Google ecosystem lock-in that's risky for a SaaS-bound product.
