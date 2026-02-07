---
id: entity-venture-agentads
category: entity
type: project
created: 2026-02-06T22:07:00.000Z
updated: 2026-02-06T22:07:00.000Z
name: AgentAds
aliases: ["agent-ads", "ad-network"]
status: poc-complete
---

# AgentAds 🤫

**Tagline**: "AdWords for AI Agents" — Contextual ad serving network

## Basic Info

- **Type**: Ad network / Moonshot venture
- **Location**: `~/projects/agentads/`
- **Status**: 🟢 POC complete, ready for integration test
- **SDK Size**: ~2KB (ultra-lightweight)

## Components

- **SDK** (`sdk/agentads.js`): Client-side ad request library
- **Ad Server** (`server/`): Express.js with SQLite storage
- **Dashboard** (`dashboard/`): HTML/CSS/JS analytics UI
- **Examples** (`examples/`): Integration demos

## Features

- ✅ Targeting algorithm (context + intent matching)
- ✅ Revenue sharing (70/30 split publisher/platform)
- ✅ Analytics tracking (impressions, clicks, CTR)
- ✅ XSS vulnerability fixed (Tech Lead review)
- ✅ Race condition fixed (analytics atomic writes)
- ✅ Hardcoded URL made configurable

## Blockers

| Blocker | Status | Action Needed |
|---------|--------|---------------|
| Ad server deployment | 🟡 PENDING | Deploy to Railway/Fly.io |
| Awesome-openclaw integration | 🟡 PENDING | Test "one visitor sees one ad" |
| Payment rails | 🟡 PENDING | Sign up for Pay Lobster beta |

## Competitive Analysis

| Platform | Revenue Share | Min Traffic | AI Agent Focus |
|----------|--------------|-------------|----------------|
| **EthicalAds** | 70% | 10K/mo | ❌ No |
| **Carbon Ads** | 70% | 20K/mo | ❌ No |
| **AgentAds** (target) | 70-75% | 10K/mo | ✅ YES |

**Gap identified**: No ad network specifically targeting AI agent vertical

## Revenue Projection

- **Target**: $500-2,000/month (varies by traffic)
- **Model**: CPM $10-20
- **30-day MVP**: Build scraper, test integration, onboard publishers

## Next Steps

1. Deploy ad server to Railway or Fly.io
2. Integrate with awesome-openclaw repository
3. Live test: one visitor sees one relevant ad
4. Sign up for Pay Lobster beta (payment rails)

## Notes

Moonshot validated with 72% confidence per thindery's assessment. First target customer: publishers of AI agent directories and openclaw skills lists. Revenue funds Mac Studio purchase.
