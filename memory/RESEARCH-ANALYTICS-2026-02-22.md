# Unified Analytics Strategy Research

**Date:** 2026-02-22  
**Researcher:** Research Agent  
**Deadline:** Due by 7am CT tomorrow  

---

## Executive Summary

For **4 ventures** needing privacy-friendly, multi-domain analytics at low scale:
1. **remylobster.com** (blog - active)
2. **pantry-pal.com** (future)
3. **remy-finance.com** (future)
4. **sleepstoriesyoutube.com** (future)

**Requirements:**
- ✅ 100% FREE (or near-free at low scale)
- ✅ Works with multiple domains/subdomains
- ✅ Privacy-friendly (no cookie banner needed in US)
- ✅ Simple setup (script tag preferred)
- ✅ Shows: pageviews, referrers, popular content, basic demographics

---

## Analytics Platform Comparison Table

| Platform | Pricing | Cookie Required | Multi-Domain | Self-Hosted | Script Size | Data Retention |
|----------|---------|---------------|--------------|-------------|-------------|----------------|
| **Google Analytics 4** | Free unlimited pageviews | ✅ YES (GDPR consent needed) | ✅ Yes via one property | ❌ No | ~46KB | 14 months (free) |
| **Cloudflare Web Analytics** | **100% FREE** | ❌ NO (cookieless) | ✅ Yes, unlimited sites | ❌ No | ~1KB | 7 days (free) |
| **GoatCounter** | Free <100k pageviews/mo | ❌ NO (GDPR notice optional) | ✅ Yes, unlimited sites | ✅ Yes | ~3.5KB | Unlimited |
| **Umami** | $0 self-hosted | ❌ NO (cookieless) | ✅ Yes | ✅ YES | ~2KB | Unlimited |
| **Plausible** | $9/mo cloud OR $0 self-hosted | ❌ NO (cookieless) | ✅ Yes | ✅ YES | <1KB | Unlimited (self) |
| **PostHog** | 1M events/mo free | ❌ NO (configurable) | ✅ Yes, 1 project free | ✅ Yes | ~20KB | 1 year (free) |
| **Mixpanel** | 20M events/mo free | ⚠️ Optional | ✅ Yes | ❌ No | ~35KB | 90 days (free) |

---

## Detailed Platform Analysis

### 1. Google Analytics 4
**Pricing:** Free (unlimited pageviews, no event limits)
**Cookie/Privacy:** ❌ Uses cookies, requires GDPR consent notice in US for comprehensive tracking
**Multi-Domain:** ✅ One property can track multiple domains/sites
**Setup:** JavaScript tag via Google Tag Manager or gtag.js
**Pros:** Industry standard, integrates with Google Ads, comprehensive reporting
**Cons:** Complex UI, requires cookie consent, privacy concerns, data used by Google
**Verdict:** ❌ **NOT RECOMMENDED** - violates privacy requirement, adds cookie banner burden

---

### 2. Cloudflare Web Analytics ⭐
**Pricing:** **100% FREE** (no usage limits, no credit card required)
**Cookie/Privacy:** ✅ **NO COOKIES**, privacy-first, no fingerprinting
**Multi-Domain:** ✅ **UNLIMITED** sites can be tracked from one account
**Setup:** Simple JavaScript snippet (~1KB) or Beacon via Cloudflare proxy
**Data:** Pageviews, referrers, top paths, device/browser, country, core web vitals
**Pros:** 
- Zero cost forever
- No cookie banner needed (US)
- Works with ANY site (not just Cloudflare-hosted)
- Lightweight, fast
- Privacy-focused by design
**Cons:** 
- 7-day data retention on free tier
- No advanced funnels/retention
- No custom events (pageviews only)
**Verdict:** ✅ **STRONG CANDIDATE** - Zero cost, privacy-perfect, multi-domain works

---

### 3. GoatCounter ⭐
**Pricing:** Free for <100k pageviews/month; $4.99/mo for unlimited
**Cookie/Privacy:** ✅ **NO COOKIES**, GDPR-compliant without notice, privacy-aware
**Multi-Domain:** ✅ Unlimited sites with one account
**Setup:** Simple script tag (~3.5KB) or tracking pixel (no JS)
**Data:** Pageviews, sessions, referrers, browsers, OS, screen sizes, locations
**Pros:**
- Open source (can self-host)
- No tracking of personal data
- Session tracking without cookies
- Export all data anytime
- Optional donation model (not required)
**Cons:**
- 100k limit on free tier
- Simpler UI than competitors
- No built-in API on free tier
**Verdict:** ✅ **STRONG CANDIDATE** - 100k is generous, perfect privacy fit

---

### 4. Umami ⭐⭐
**Pricing:** **$0** self-hosted on Railway/Vercel/Render free tier
**Cookie/Privacy:** ✅ **NO COOKIES**, privacy-focused
**Multi-Domain:** ✅ Yes, unlimited sites
**Setup:** Self-deploy (Docker), then simple script tag (~2KB)
**Data:** Pageviews, referrers, devices, OS, browsers, locations, events
**Pros:**
- Modern UI, beautiful dashboard
- Self-hosted = data ownership
- Can run free on Railway/Render
- Event tracking (button clicks, etc.)
- Fast, minimal overhead
**Cons:**
- Requires technical setup (Docker)
- Must host yourself (no managed free tier)
- No hosted cloud option truly free
**Verdict:** ✅ **EXCELLENT** if willing to self-host; highest value for tech-savvy users

---

### 5. Plausible
**Pricing:** $9/mo cloud OR $0 self-hosted (requires VPS ~$5/mo)
**Cookie/Privacy:** ✅ **NO COOKIES**, privacy-first, GDPR-compliant
**Multi-Domain:** ✅ Yes, unlimited sites (one payment covers all)
**Setup:** Script tag or self-hosted
**Data:** Pageviews, referrers, top pages, countries, devices, goals
**Pros:**
- Truly lightweight (<1KB script)
- No cookie banners needed
- Open source, transparent
- Simple, intuitive UI
**Cons:**
- Not free unless self-hosted (needs VPS)
- Self-hosted costs ~$5/mo for server
**Verdict:** ⚠️ **GOOD BUT PAID** - Best UX but requires $9/mo or VPS costs

---

### 6. PostHog
**Pricing:** Generous free: 1M events/mo, 5k replays, unlimited team
**Cookie/Privacy:** ⚠️ Configurable (can be cookieless but complex)
**Multi-Domain:** ✅ Yes, but 1 project on free tier
**Setup:** JavaScript SDK (~20KB) or snippet
**Data:** Events, funnels, retention, feature flags, session replay
**Pros:**
- Extremely generous free tier
- Product analytics (not just web)
- Session replay included
- Feature flags, A/B testing
**Cons:**
- Overkill for simple blogs
- 20KB script adds overhead
- Complex setup for cookieless mode
- 1 project limit on free tier
**Verdict:** ⚠️ **OVERKILL** - Great product but too heavy for blog analytics

---

### 7. Mixpanel
**Pricing:** Free: 20M events/mo, 90-day data retention
**Cookie/Privacy:** ⚠️ Uses cookies by default (can configure)
**Multi-Domain:** ✅ Yes
**Setup:** JavaScript SDK (~35KB)
**Data:** Events, funnels, cohorts, retention, people profiles
**Pros:**
- Generous free tier
- Product analytics insights
- User flow visualization
**Cons:**
- 35KB script (heavy)
- Product-focused (overkill for blogs)
- 90-day data retention limit
- Requires cookie consent for full features
**Verdict:** ❌ **NOT RECOMMENDED** - Overkill for simple web analytics

---

## Top 3 Recommendations (Ranked)

### 🥇 **1st Place: Cloudflare Web Analytics**
**Why it wins:**
- 100% free, no limits, no catches
- Zero cookie burden (no banner needed in US)
- Unlimited domains from one account
- Dead simple setup (copy-paste script)
- Trusted infrastructure (Cloudflare)
- Privacy-first by design

**Best for:** Someone who wants "set it and forget it" with zero cost

**The Catch:** 7-day rolling data retention

---

### 🥈 **2nd Place: Umami (Self-Hosted)**
**Why it's great:**
- $0 cost (run on Railway/Render free tier)
- No cookie requirements
- Unlimited websites
- Data ownership (you control everything)
- Modern, beautiful dashboard
- Event tracking included

**Best for:** Tech-savvy users who don't mind 30 min setup for long-term value

**The Catch:** Requires Docker deployment knowledge

---

### 🥉 **3rd Place: GoatCounter**
**Why it's solid:**
- Free up to 100k pageviews (generous for small sites)
- No cookies, GDPR-friendly
- Open source (can migrate to self-hosted later)
- Session tracking without fingerprinting

**Best for:** Sites under 100k monthly views wanting a hosted solution

**The Catch:** Need to upgrade if you exceed 100k views

---

## Final Recommendation

### ✅ **Cloudflare Web Analytics** is the BEST choice for thindery's use case.

**Rationale:**
1. **100% free forever** - no usage caps, no credit card required
2. **No cookies = no banner** - privacy-compliant in US without popups
3. **Multi-domain ready** - track all 4+ ventures from one dashboard
4. **Simple setup** - single script tag, no configuration needed
5. **Trusted provider** - Cloudflare is reliable, won't disappear
6. **Good enough data** - shows pageviews, referrers, popular content, basic demographics

**The trade-off** (7-day retention) is acceptable because:
- For a blog and early-stage projects, recent data matters most
- You can export data periodically if needed
- Zero cost justifies the limitation

---

## Cloudflare Web Analytics Setup Steps

### Step 1: Create Account (2 minutes)
1. Go to <https://dash.cloudflare.com/sign-up/web-analytics>
2. Sign up with email (no domain transfer needed)
3. Select "Web Analytics" option

### Step 2: Add First Site (remylobster.com)
1. Click "Add a Site"
2. Enter site domain: `remylobster.com`
3. Copy the provided JavaScript snippet
4. Paste into `<head>` of your blog template:

```html
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
<!-- End Cloudflare Web Analytics -->
```

### Step 3: Add Additional Sites
Repeat Step 2 for:
- `pantry-pal.com`
- `remy-finance.com`
- `sleepstoriesyoutube.com`

### Step 4: Verify Installation
1. Open your site in browser
2. Check browser console for successful beacon requests
3. View dashboard for real-time data (may take 1-2 minutes)

### Step 5: Access Dashboard
- View all sites at: <https://dash.cloudflare.com>
- Toggle between domains in the Web Analytics section
- Data refreshes in near real-time

---

## Alternative: Umami Self-Hosted Setup (for comparison)

If you prefer data ownership or need >7 day retention:

### Railway Free Tier Deployment
```bash
# Fork umami repo
git clone https://github.com/umami-software/umami.git
cd umami

# Deploy to Railway (requires Railway CLI)
railway login
railway init
railway up
```

**Costs:**
- Railway free tier: 500 hours/month (enough for 1 small app)
- If exceeded: ~$5/month for minimal resources

---

## Decision Matrix by Use Case

| Scenario | Recommended | Why |
|----------|-------------|-----|
| "I want zero setup" | Cloudflare | No hosting, instant start |
| "I want data forever" | Umami self-hosted | Unlimited retention |
| "I'm under 100k views" | GoatCounter | Simple hosted option |
| "I want best UI/UX" | Plausible | But pay $9/mo |
| "I need product analytics" | PostHog | Overkill for blogs |

---

## Conclusion

**Deploy Cloudflare Web Analytics tonight.** It meets 100% of your requirements:
- ✅ Free forever
- ✅ No cookie banner (US)
- ✅ Multi-domain support
- ✅ Simple script setup
- ✅ All required metrics

Start there. If 7-day retention becomes a problem in 6+ months, migrate to Umami self-hosted (export/import existing data).

**Time to complete setup:** ~10 minutes for all 4 sites.
