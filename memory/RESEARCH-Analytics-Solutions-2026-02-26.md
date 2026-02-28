# Analytics Solutions Comparison for Static Websites
**Research Date:** February 26, 2026  
**Context:** 4+ projects (remylobster.com, pantry-pal.com, remy-finance.com, sleepstoriesyoutube.com)  
**Goal:** One unified analytics solution at minimal/zero cost

---

## Quick Recommendation

**🥇 WINNER: Cloudflare Web Analytics** for immediate setup, or **GoatCounter** if you prefer open-source. Both are 100% free, privacy-friendly (no cookie banners), support multiple domains, and work perfectly with static sites (Vercel, Netlify, etc.).

---

## Side-by-Side Feature Comparison

| Feature | Cloudflare | GoatCounter | Umami | Plausible | PostHog | GA4 | Mixpanel |
|---------|-----------|-------------|-------|-----------|---------|-----|----------|
| **Cost** | Free | Free (<100k/mo) | $5/mo* | $6/mo** | Free tier | Free | Free tier*** |
| **Multi-Domain** | Unlimited | Unlimited | Yes | Yes | Yes | Requires properties | Limited |
| **Cookie Banner** | ❌ No | ❌ No | ❌ No | ❌ No | ⚠️ Configurable | ✅ Required | ✅ Required |
| **Self-Hosted Option** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (complex) | ❌ No | ❌ No |
| **Script Tag Setup** | ✅ Simple | ✅ Simple | ✅ Simple | ✅ Simple | ✅ Moderate | ⚠️ Moderate | ⚠️ Moderate |
| **Vercel Compatible** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Pageviews** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Referrers** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Popular Content** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Demographics** | ✅ Country | ✅ Limited | ✅ Basic | ✅ Basic | ✅ Basic | ✅ Detailed | ⚠️ Limited |
| **Real-time** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **API Access** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Export Data** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Limited |
| **Uptime Monitoring** | ✅ Yes | ❌ No | ❌ No | ❌ No | ✅ Yes | ❌ No | ❌ No |

\* Requires Railway ($5/mo hobby plan minimum)  
\*\* $6/mo for hosted; free if self-hosted  
\*\*\* 20M events/mo free, but cookie consent required  

---

## Individual Analysis

### 1. Cloudflare Web Analytics ⭐ HIGHLY RECOMMENDED

**Pricing:** 100% FREE  
**Website:** https://www.cloudflare.com/web-analytics/

#### Free Tier Limits
- **Unlimited pageviews** - No hard cap
- **Unlimited sites** - Add as many as you want
- **Real-time data** - No delay
- **7 days of browser insights** retention

#### Pros
✅ **100% FREE at any scale** - No upgrade pressure  
✅ **No cookie banner required** - Privacy-first by design  
✅ **No JavaScript loading** - Uses beacon API (performance boost)  
✅ **Built-in uptime monitoring** - Alerts when sites are down  
✅ **Bot detection** - Filters out crawlers automatically  
✅ **Multi-domain perfect** - Track all 4 sites in one dashboard  
✅ **Vercel integration** - Native deployment support

#### Cons
❌ **Shorter data retention** - 7 days of detailed data (though core metrics retained longer)  
❌ **Less detailed** - Not as granular as GA4  
❌ **No self-hosted option** - Cloud-only  
❌ **Requires DNS through Cloudflare** - For full features

#### Best For
Users who want **zero cost, zero maintenance, zero cookie banners**, and don't need deep demographic analysis.

---

### 2. GoatCounter ⭐ HIGHLY RECOMMENDED (Open Source)

**Pricing:** FREE for <100k pageviews/month  
**Website:** https://www.goatcounter.com/

#### Free Tier Limits
- **100,000 pageviews/month** per site
- Unlimited sites (under same account)
- Self-hosted option always free

#### Pros
✅ **100% free under 100k views**  
✅ **No cookie banner required** - Privacy-focused  
✅ **Lightweight script** - ~2KB  
✅ **Open source** - Self-host if you want  
✅ **Multi-domain support** - Track multiple sites  
✅ **Simple dashboard** - No learning curve  
✅ **No account required** - Anonymous tracking option  
✅ **Export data anytime** - No lock-in

#### Cons
❌ **100k limit** - Need paid tier ($5/mo) above that  
❌ **Basic features** - No funnels, heatmaps, etc.  
❌ **Less "modern" UI** - Functional but dated  
❌ **Support via GitHub issues only** - No dedicated support

#### Best For
Users who want **open source, simple setup, no vendor lock-in**, and have moderate traffic.

---

### 3. Umami

**Pricing:** Free tier exists, but realistically $5/mo (Railway hobby tier)  
**Website:** https://umami.is/

#### Free Tier Limits
- **Self-hosted only** = truly free forever
- **Cloud hosted** = $20/mo (too expensive)
- **Railway self-host** = ~$5/mo (PostgreSQL required)

#### Pros
✅ **Beautiful modern UI**  
✅ **Event tracking** - Beyond just pageviews  
✅ **Multi-domain support**  
✅ **No cookie banner needed**  
✅ **Self-hosted = full privacy**  
✅ **Team features** - Share access  
✅ **Goals/conversions** - Built-in

#### Cons
❌ **Not free in practice** - Requires server (~$5/mo minimum)  
❌ **Self-hosted complexity** - Database management needed  
❌ **One-click deploys can be flaky** - Railway sometimes breaks  
❌ **Maintenance burden** - Updates, backups, scaling

#### Setup (Railway)
```bash
# Deploy via Railway template
# 1. Go to railway.app
# 2. Use Umami template
# 3. Add PostgreSQL database
# 4. Deploy (~$5/mo minimum)
# 5. Add script tag to your sites
```

#### Best For
Users who want **modern analytics with events** and don't mind the $5/mo hosting cost for full control.

---

### 4. Plausible Analytics

**Pricing:** $6/mo (hosted) or FREE (self-hosted)  
**Website:** https://plausible.io/

#### Free Tier Limits
- **Self-hosted** = completely free (no limits)
- **Hosted** = $6/mo for up to 10k pageviews, then $12/mo
- **Multi-site discounts** available

#### Pros
✅ **Privacy-first pioneer** - GDPR/CCPA compliant by default  
✅ **Fast, lightweight** - <1KB script  
✅ **No cookies = no banner**  
✅ **Email reports** - Weekly summaries  
✅ **Funnel analysis** - Convert goals  
✅ **SaaS backing = longevity**  
✅ **Import from Google Analytics**

#### Cons
❌ **Paid tier expensive** - $6/mo minimum for hosted  
❌ **Self-hosted requires effort** - Server + maintenance  
❌ **Lower limits on free alternatives** - Cloudflare/GoatCounter beat pricing  
❌ **No real-time chat support** - Email only

#### Setup (Self-Hosted)
```yaml
# docker-compose.yml example
version: '3'
services:
  plausible:
    image: plausible/analytics:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://...
      - SECRET_KEY_BASE=...
```

#### Best For
Users who want **industry-leading privacy analytics** and are willing to pay $6/mo OR self-host with some effort.

---

### 5. PostHog

**Pricing:** Generous free tier + usage-based  
**Website:** https://posthog.com/

#### Free Tier Limits
- **1 million events/month** (very generous)
- **Unlimited users**
- **Unlimited projects**
- **Community support**

#### Pros
✅ **Powerful features** - Funnels, cohorts, retention, feature flags  
✅ **Product analytics** - Not just web analytics  
✅ **Session recording** - See what users do  
✅ **A/B testing built-in** - Feature flags  
✅ **Very generous free tier** - 1M events is a lot  
✅ **Self-host available** - Open source

#### Cons
❌ **Requires cookie consent** - For EU compliance  
❌ **Complex setup** - More than just a script tag  
❌ **Overkill for simple sites** - Feature bloat if you just want pageviews  
❌ **Learning curve** - Dashboard can be overwhelming  
❌ **Self-hosted is complex** - Requires Kubernetes for production

#### Best For
Power users who want **product analytics, A/B testing, and session recordings** alongside web analytics.

---

### 6. Google Analytics 4

**Pricing:** Free tier (uses your data as payment)  
**Website:** https://analytics.google.com/

#### Free Tier Limits
- **Unlimited pageviews/events**
- **Standard reports**
- **Data sampling** kicks in at high volumes

#### Pros
✅ **Industry standard** - Everyone knows it  
✅ **Deep integration** - Google Ads, Search Console, etc.  
✅ **Powerful audience building** - Demographics, interests  
✅ **Custom reports** - Very flexible  
✅ **Free training/resources** - Massive community  
✅ **No limits** - Handles any traffic volume

#### Cons
❌ **Cookie consent REQUIRED** - GDPR/ePrivacy compliance  
❌ **Privacy invasive** - Data sold to Google's ad network  
❌ **Blocked by ad blockers** - ~40% of data lost  
❌ **Bloated script** - Slows down your site  
❌ **Complex UI** - Steep learning curve  
❌ **Multi-domain pain** - Requires separate properties or complex setup

#### Best For
Users who need **detailed demographic data**, use Google Ads, or don't care about cookie banners.

---

### 7. Mixpanel

**Pricing:** Free tier + paid plans  
**Website:** https://mixpanel.com/

#### Free Tier Limits
- **20 million events/month** (extremely generous)
- **Unlimited users**
- **90-day data history**
- **Core reports**

#### Pros
✅ **Very generous free tier** - 20M events is massive  
✅ **Product analytics** - Cohorts, funnels, retention  
✅ **Real-time streaming**  
✅ **SQL queries** - For custom analysis  
✅ **Good API**

#### Cons
❌ **Cookie consent required**  
❌ **Primarily product analytics** - Not designed for content sites  
❌ **Can be expensive** - $20/mo+ when you hit limits  
❌ **No privacy focus** - Traditional tracking  
❌ **Overkill for blogs** - Better for SaaS products

#### Best For
SaaS products and apps, NOT content sites/blogs.

---

## Detailed Answers to Research Questions

### Do any support multi-domain in free tier?

| Solution | Multi-Domain Free? | Notes |
|----------|-------------------|-------|
| **Cloudflare** | ✅ Unlimited | Best option - one dashboard, all sites |
| **GoatCounter** | ✅ Unlimited | Per-site limits apply |
| **Umami** | ✅ Yes | Self-hosted only |
| **Plausible** | ✅ Yes | Self-hosted free, hosted requires $6/mo |
| **PostHog** | ✅ Unlimited | One project = multiple domains |
| **GA4** | ⚠️ Complex | Requires cross-domain tracking setup |
| **Mixpanel** | ✅ Yes | Single project, multiple domains |

**Winner:** Cloudflare for pure simplicity across all domains.

---

### Which require cookie consent banners?

| Solution | Cookie Banner Required? | Why |
|----------|-------------------------|-----|
| **Cloudflare** | ❌ **NO** | Privacy-first, no cookies stored |
| **GoatCounter** | ❌ **NO** | Anonymous by design |
| **Umami** | ❌ **NO** | Self-hosted, no third-party cookies |
| **Plausible** | ❌ **NO** | Privacy-compliant by default |
| **PostHog** | ⚠️ Configurable | Can work without, EU compliance recommended |
| **GA4** | ✅ **YES** | GDPR/ePrivacy law requires it |
| **Mixpanel** | ✅ **YES** | Tracking cookies used |

**Winner:** Cloudflare, GoatCounter, Umami, Plausible (all cookie-banner-free)

---

### Which work best with static sites (Vercel)?

| Factor | Best Options |
|--------|-------------|
| **Easiest setup** | GoatCounter, Cloudflare, Plausible (single script tag) |
| **Vercel native integration** | Cloudflare (use as CDN), Vercel Analytics (but paid) |
| **Fastest script** | Plausible (~1KB), GoatCounter (~2KB), Cloudflare (beacon) |
| **Static site generators** | All work (Next.js, Astro, Hugo, Jekyll, etc.) |

**Script tag example for all options:**
```html
<!-- Cloudflare -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>

<!-- GoatCounter -->
<script async src="//gc.zgo.at/count.js" 
        data-goatcounter="https://YOURCODE.goatcounter.com/count"></script>

<!-- Umami -->
<script async src="https://your-domain.com/script.js" 
        data-website-id="YOUR_ID"></script>

<!-- Plausible -->
<script defer data-domain="yourdomain.com" 
        src="https://plausible.io/js/script.js"></script>
```

---

### Self-hosted vs Cloud: Which is easier?

| Aspect | Cloud-Hosted | Self-Hosted |
|--------|--------------|-------------|
| **Setup time** | 5 minutes | 1-2 hours |
| **Maintenance** | None | Updates, backups, monitoring |
| **Cost** | $0-$20/mo | ~$5/mo (server) |
| **Privacy** | Good | Best (full control) |
| **Reliability** | High | Depends on your setup |
| **Scaling** | Automatic | Manual |

**Recommendation:** Start with cloud-hosted (Cloudflare GoatCounter), migrate to self-hosted only if you grow significantly or have strict data requirements.

---

### Limits on events/pageviews for free tiers

| Solution | Free Limit | What happens after? |
|----------|-----------|---------------------|
| **Cloudflare** | **Unlimited** | None - truly unlimited |
| **GoatCounter** | 100k/mo | $5/mo for unlimited |
| **Umami (self-hosted)** | Unlimited | N/A - self-hosted |
| **Plausible (cloud)** | None ($6/mo entry) | - |
| **PostHog** | 1M events/mo | Pay-as-you-go |
| **GA4** | Unlimited | None |
| **Mixpanel** | 20M events/mo | 90-day retention only, or upgrade |

**Winner:** Cloudflare (truly unlimited), Mixpanel (20M events is huge for free)

---

## Final Recommendation

### For Your Use Case (4+ static sites, free/no-cookies)

## 🏆 PRIMARY RECOMMENDATION: Cloudflare Web Analytics

**Why:**
1. **Zero cost** - Free forever, unlimited pageviews
2. **Zero maintenance** - No servers to manage
3. **Zero cookies** - No banners needed
4. **Perfect for multi-domain** - All 4 sites in one dashboard
5. **Vercel compatible** - Works perfectly with your setup
6. **Extra features** - Built-in uptime monitoring, bot filtering

**Setup Steps:**
```bash
1. Sign up at cloudflare.com (free account)
2. Add your domains to Cloudflare (optional - can use without DNS)
3. Go to Analytics → Web Analytics
4. Click "Add a site"
5. Copy the script tag provided
6. Add to your site's <head>:
   <script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
           data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
7. Deploy and data flows immediately
```

---

### 🏆 ALTERNATIVE: GoatCounter

**Choose this if:**
- You want open source / no vendor lock-in
- You're comfortable with a 100k/mo limit (likely fine for your sites)
- You might want to self-host later

**Setup:**
```bash
1. Go to goatcounter.com
2. Sign up (no credit card)
3. Create a site for each domain
4. Copy the tracking code
5. Add to your sites
6. Done - all sites visible in dashboard
```

---

### When to choose others:

- **Umami:** If you want event tracking (button clicks, downloads) AND don't mind $5/mo hosting
- **Plausible:** If you want the "premium" privacy analytics experience AND can afford $6/mo
- **PostHog:** If you need product analytics, A/B testing, session recordings (overkill for blogs)
- **GA4:** If you need detailed demographic data OR use Google Ads
- **Mixpanel:** Skip this - better for SaaS, not content sites

---

## Summary Table: Best To Worst for Your Use Case

| Rank | Solution | Score | Why |
|------|----------|-------|-----|
| 🥇 1st | Cloudflare | 10/10 | Free, easy, multi-domain, no cookies |
| 🥈 2nd | GoatCounter | 9/10 | Free, open source, simple, no cookies |
| 🥉 3rd | Plausible | 7/10 | Great but costs $6/mo |
| 4th | Umami | 6/10 | Good features but $5/mo hosting reality |
| 5th | PostHog | 5/10 | Overkill, requires cookies |
| 6th | GA4 | 3/10 | Requires cookie banner, privacy issues |
| 7th | Mixpanel | 2/10 | Wrong tool for the job |

---

## My Strong Recommendation

**Go with Cloudflare Web Analytics.**

It meets every single requirement:
- ✅ 100% FREE (no upgrade pressure ever)
- ✅ Multi-domain support built-in
- ✅ No cookie banners needed
- ✅ Single script tag, <5 min setup per site
- ✅ Shows pageviews, referrers, popular content
- ✅ Works perfectly with Vercel/Netlify static sites
- ✅ Bonus: Uptime monitoring included

The only trade-off is retention (7 days of detailed browser data), but core metrics are retained longer and for a free solution, it's unbeatable.

---

*Research completed: February 26, 2026*  
*File: ~/.openclaw/workspace/memory/RESEARCH-Analytics-Solutions-2026-02-26.md*
