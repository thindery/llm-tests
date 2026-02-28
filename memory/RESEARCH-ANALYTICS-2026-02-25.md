# Analytics Solution Deep-Dive Report
**Date:** 2026-02-25  
**For:** thindery's 5 Ventures

---

## Executive Summary

This report compares leading privacy-focused analytics solutions for 5 venture portfolio sites. Focus on: free tiers, multi-domain support, cookieless tracking, and ease of deployment.

---

## 1. Plausible Analytics

### Overview
- **Type:** Open-source, privacy-focused, lightweight
- **Script Size:** ~1KB (75x smaller than Google Analytics)
- **GDPR Compliance:** 100% compliant, no cookie banner needed

### Self-Hosted (Plausible Community Edition)
| Aspect | Details |
|--------|---------|
| **Cost** | Free (self-hosted) |
| **Setup** | Docker-based deployment; requires PostgreSQL + ClickHouse |
| **Railway Support** | No official Railway template; requires custom Docker setup |
| **Features** | Same as hosted version: pageviews, referrers, events, funnels, revenue attribution |
| **Multi-domain** | Yes - unlimited sites per instance |
| **Cookie banner** | Not required |
| **Data export** | CSV export, API access |
| **Data import** | Google Analytics import supported |

### Hosted (Cloud)
| Plan | Pageviews | Sites | Price |
|------|-----------|-------|-------|
| Free trial | 10k/mo | Unlimited | 30 days |
| Paid | 10k-10M/mo | Unlimited | $9-$199/mo |

**Verdict:** Excellent for self-hosting if you have Docker experience. Not the easiest Railway deployment.

---

## 2. Umami

### Overview
- **Type:** Open-source, privacy-first, modern analytics
- **Script Size:** ~2KB
- **GDPR Compliance:** Cookieless, GDPR compliant by default

### Self-Hosted (Recommended)
| Aspect | Details |
|--------|---------|
| **Cost** | Completely free (self-hosted) |
| **Setup** | Very easy - Railway button deployment available |
| **Railway Support** | ✅ Official Railway template (one-click deploy) |
| **Requirements** | PostgreSQL database + Node.js server |
| **Features** | Pageviews, visitors, bounce rate, sessions, referrers, events, funnels, user journeys, retention, goals |
| **Multi-domain** | Yes - unlimited websites per instance |
| **Cookie banner** | Not required |
| **Data export** | Full REST API, PostgreSQL direct access |
| **Data import** | No GA import (export existing data via API) |

### Railway Deployment Steps
1. Click Railway deploy button → auto-provisions PostgreSQL
2. Set environment variables (DATABASE_URL, PORT=3000)
3. Deploy complete in ~5 minutes
4. Login with default credentials (admin/umami)

### Hosted (Umami Cloud)
| Plan | Pageviews | Features | Price |
|------|-----------|----------|-------|
| Starter | 10k/mo | Basic | $12/mo |

**Verdict:** ⭐ Best for Railway free tier deployment. Excellent feature set, very easy setup.

---

## 3. Cloudflare Web Analytics

### Overview
- **Type:** Browser-based or edge-collected analytics
- **Privacy:** No cookies, no fingerprinting, no client-side state
- **Script:** Lightweight JavaScript beacon

### Free Tier Details
| Aspect | Details |
|--------|---------|
| **Cost** | Free for all Cloudflare users |
| **Setup** | Easiest - copy/paste JS snippet or proxy through Cloudflare |
| **Vercel Integration** | ✅ Supported - just add the beacon script |
| **Multi-domain** | ⚠️ One analytics property per domain; no unified dashboard |
| **Cookie banner** | Not required |
| **Features** | Pageviews, top URLs, countries, referrers, status codes, Core Web Vitals |
| **Limitations** | No events/funnels, no revenue tracking, no custom goals |
| **Data export** | Limited - manual CSV only |

### Multi-Domain Reality Check
- Each domain needs separate analytics property
- No cross-site consolidated view
- Manual aggregation required for portfolio analysis

**Verdict:** Easiest setup but feature-limited. Good for basic traffic stats only.

---

## 4. GoatCounter

### Overview
- **Type:** Open-source, privacy-aware, accessible
- **Script Size:** ~3.5KB (larger than Plausible/Umami)
- **GDPR Compliance:** Fine-grained control, no cookie banner

### Hosted (goatcounter.com)
| Aspect | Details |
|--------|---------|
| **Cost** | Free for "reasonable public usage" |
| **Limit** | Implicit ~100k-500k pageviews/month (soft limit) |
| **Setup** | Copy/paste script tag |
| **Multi-domain** | One site per account (sibling sites unsupported) |
| **Cookie banner** | Not required |
| **Features** | Pageviews, browsers, locations, screen sizes, referrers, campaigns |
| **Limitations** | No events, no funnels, no revenue tracking, no user journeys |
| **Data export** | Full CSV/JSON export |
| **Data import** | Log file parsing supported |

### Self-Hosted
| Aspect | Details |
|--------|---------|
| **Cost** | Free |
| **Setup** | Go binary or Docker; SQLite or PostgreSQL |
| **Railway** | No official template; custom deployment required |

**Verdict:** Good for simple analytics but lacks advanced features (events, funnels).

---

## 5. Google Analytics 4 (GA4) - Not Recommended

### Why to Avoid for Your Ventures

| Issue | Details |
|-------|---------|
| **GDPR/EU** | ❌ Requires cookie consent banner in EU |
| **Complexity** | Extremely complex - 100+ reports, requires training |
| **Privacy** | Collects personal data, behavioral profiling |
| **Data ownership** | Google owns your data; used for ad targeting |
| **Legal risk** | Banned in several EU countries (Austria, France, Italy, Denmark, Finland, Norway, Sweden) |
| **Cookie requirements** | Requires explicit consent under GDPR |

### Only Consider If:
- You need advanced attribution modeling
- You sell ads (AdSense integration)
- You need funnel overlap analysis
- You accept cookie banner UX tradeoff

**Verdict:** ❌ Avoid for privacy-focused ventures. Overkill for simple analytics needs.

---

## 6. Comprehensive Comparison Table

| Tool | Free Tier | Multi-Domain | Cookieless | Events/Funnels | Self-Host | Railway Easy | GDPR Safe |
|------|-----------|--------------|------------|----------------|-----------|--------------|-----------|
| **Umami** | Unlimited | ✅ Yes | ✅ Yes | ✅ Full | ✅ Easy | ⭐ Button | ✅ Yes |
| **Plausible CE** | Unlimited | ✅ Yes | ✅ Yes | ✅ Full | 🔧 Docker | ❌ Manual | ✅ Yes |
| **Cloudflare** | Unlimited | ❌ No* | ✅ Yes | ❌ No | N/A | N/A | ✅ Yes |
| **GoatCounter** | ~100k/mo | ❌ No | ✅ Yes | ❌ No | 🟡 Go/Docker | ❌ Manual | ✅ Yes |
| **GA4** | 10M events | ✅ Yes | ❌ No** | ✅ Full | ❌ No | N/A | ❌ Risk |

*Separate properties per domain, no unified view  
**Requires cookie consent

---

## 7. Recommendations for 5 Ventures

### Primary Recommendation: Umami (Self-Hosted on Railway)

**Why Umami wins:**
1. ✅ **Free forever** - no pageview limits on self-hosted
2. ✅ **One-click Railway deployment** - 5 minutes setup
3. ✅ **Full feature set** - events, funnels, retention, user journeys
4. ✅ **Multi-domain** - track all 5 ventures in one dashboard
5. ✅ **Cookieless** - no GDPR compliance headaches
6. ✅ **Data ownership** - you own everything
7. ✅ **Team sharing** - invite collaborators per-site

**Setup for 5 ventures:**
```
1. Deploy one Umami instance on Railway (free tier)
2. Add all 5 domains as separate sites
3. Copy tracking code to each venture
4. Done - single dashboard, multiple ventures
```

### Secondary Option: Cloudflare Web Analytics (If Simplicity > Features)

**When to choose Cloudflare:**
- You want absolute zero maintenance
- Basic pageview stats are sufficient
- You don't need event tracking or funnels
- You accept managing analytics per-domain

---

## 8. Deployment Comparison: Railway Free Tier

| Tool | Setup Time | Complexity | Success Rate | Monthly Cost |
|------|------------|------------|--------------|--------------|
| **Umami** | 5 min | ⭐ Low | High | $0 |
| **Plausible CE** | 30-60 min | 🔧 High | Medium | $0 |
| **GoatCounter** | 20-30 min | 🟡 Medium | Medium | $0 |

**Railway free tier limits:** $5/month credit (sufficient for Umami + PostgreSQL)

---

## 9. Final Recommendation Summary

### For Your 5 Ventures, Use:

| Venturer # | Recommended Tool | Setup Path |
|------------|------------------|------------|
| All 5 | **Umami** | Railway template → single instance → add 5 sites |

**Single instance strategy** is most efficient:
- One Railway project
- One PostgreSQL database
- Unlimited sites tracked
- Consolidated dashboard (per-site views)
- Shared team management

### What You Get with Umami:
- 📊 Pageviews, visitors, bounce rate
- 📈 Custom events (button clicks, form submissions)
- 🎯 Goal conversions
- 🔄 Funnel analysis
- 👥 Session recordings (anonymized)
- 🗺️ Referrers, UTM tracking
- 📱 Device/browser breakdowns
- 🌍 Geographic data

### What You Avoid:
- ❌ Google Analytics complexity
- ❌ Cookie consent banners
- ❌ GDPR legal risk
- ❌ Per-site costs
- ❌ Data sharing with ad networks

---

## 10. Quick Start Command

```bash
# Deploy Umami to Railway (one command via button)
open https://railway.app/new/template/umami-analytics

# Post-deployment:
# 1. Note the DATABASE_URL (auto-provisioned)
# 2. Visit the deployed URL
# 3. Login: admin / umami
# 4. Change password immediately
# 5. Add your 5 ventures as separate "Websites"
# 6. Copy tracking code to each venture
```

---

*Report generated: 2026-02-25 by Remy Research Agent*  
*Sources: Official docs (plausible.io, umami.is, cloudflare.com, goatcounter.com)*
