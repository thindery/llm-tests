# Analytics Platform Research: Unified Strategy for 4 Ventures
**Research Date:** 2026-02-21 (Overnight)  
**Purpose:** Select unified analytics solution for multi-venture portfolio  
**Due:** 7AM CST

---

## Executive Summary

**Top 2 Recommendations:**
1. **Plausible Analytics Cloud** ($6/month) - Best overall value, zero maintenance
2. **Umami Self-Hosted on Railway** ($0/month) - Best for the cost-conscious, low traffic

**Decision Matrix:** For immediate launch → Plausible Cloud (set-and-forget). For testing/lower traffic → Umami Self-Hosted (Railway free tier).

---

## Comparison Table: 7 Analytics Solutions

| Platform | Cost | Multi-Domain | Cookie Banner | Setup Difficulty | Best For |
|----------|------|--------------|---------------|------------------|----------|
| **Google Analytics 4** | Free | ⚠️ Separate dashboards | **Yes** (GDPR) | Hard | Enterprise, deep funnel analysis |
| **Cloudflare Web Analytics** | **Free** | ✅ Unlimited sites | **No** (privacy-first) | Easy | Fast setup, basic metrics |
| **GoatCounter** | **Free** ($ donate) | ✅ Multiple sites | **No** | Easy | Open source preference |
| **Umami** | **$0** (self-host) / $X (cloud) | ✅ Unlimited | **No** | Medium | Control freaks, dev-friendly |
| **Plausible** | **$6/mo** / $0 (self-host) | ✅ 50 sites/starter | **No** | Easy | Set-and-forget simplicity |
| **PostHog** | **$0** (1M events/mo) | ✅ 1-6 projects | ⚠️ May need* | Hard | Product analytics, mobile apps |
| **Mixpanel** | **$0** (1M events/mo) | ✅ Unlimited | **Yes** (GDPR) | Medium | Product analytics startups |

\* PostHog: Anonymous events don't require consent, but identified events may (person profiles feature).

---

## Detailed Analysis by Platform

### 1. Google Analytics 4 (GA4)
**Cost:** Free  
**Multi-Domain:** ⚠️ Requires separate data streams/partial unification  
**Setup:** Complex - requires Google Tag, event configuration, conversion setup  
**Cookie Banner:** Required for EU users (collects personal data, cross-site tracking)  

**Pros:**
- Industry standard
- Deep funnel attribution
- Free no matter how much traffic
- Google ecosystem integration (Ads, Search Console)

**Cons:**
- Complex UI, steep learning curve
- Cookie consent banner required
- Data sampled at high volumes
- Potential data sharing with Google
- No unified multi-domain dashboard in free tier

**Cost at Scale:** Always free (but capped at 10M events/month for unsampled data)  
**Estimated monthly cost @ current traffic:** $0

---

### 2. Cloudflare Web Analytics
**Cost:** **Free forever**  
**Multi-Domain:** ✅ Unlimited sites (RUM = Real User Monitoring)  
**Setup:** Script tag OR Cloudflare proxy (no code)  
**Cookie Banner:** **Not required** (no client-side state, no fingerprinting)  

**Pros:**
- 100% free, unlimited pageviews
- Truly privacy-first (no cookies, no localStorage)
- Simple dashboard (pageviews, referrers, countries, paths)
- Can use without proxying through Cloudflare (JS beacon)

**Cons:**
- Limited metrics (no demographics, basic browser info only)
- No real-time collaboration features
- Less detailed than competitors
- Requires Cloudflare account

**Traffic Limits:** "Millions/day is fine" - generous unstated limits  
**Cost at Scale:** $0  

---

### 3. GoatCounter
**Cost:** **Free** (donation-supported hosted) / $0 (self-hosted)  
**Multi-Domain:** ✅ Yes, multiple sites per account  
**Setup:** Single script tag  
**Cookie Banner:** **Not required** (stores aggregate data only, not personal data)  

**Pros:**
- Open source, can self-host
- Privacy-focused (no unique identifiers)
- Very lightweight (~3.5KB script)
- Can work without JavaScript (tracking pixel option)
- No "fingerprinting" via IP/UA

**Cons:**
- Donation-based sustainability uncertainty
- Interface less polished than alternatives
- 100k+ views/day requires self-hosting
- Limited feature set

**Traffic Limits:** "Reasonable public usage" - small business OK, millions/day not  
**Cost @ 10x traffic:** $0 (but may need to self-host at high volume)

---

### 4. Umami
**Cost:** **$0** (self-hosted) / ~$9-19 (Umami Cloud per site)  
**Multi-Domain:** ✅ Unlimited in self-hosted  
**Setup:** Docker compose / Railway one-click / Vercel  
**Cookie Banner:** **Not required** (GDPR compliant, no personal data)  

**Pros:**
- Modern, beautiful dashboard
- Self-host = total data ownership
- Event tracking, UTM campaigns, funnel analysis
- Script is under 2KB
- Railway free tier = free hosting

**Cons:**
- Self-host requires maintenance (updates, backups)
- Limited session replay features vs PostHog
- Must manage your own database

**Railway Free Tier Limits:** $5/mo credit = ~500hrs compute + 1GB storage  
**Cost @ current traffic:** $0 (Railway free)  
**Cost @ 10x traffic:** $5-15/mo (Railway paid starter)

---

### 5. Plausible Analytics ⭐ RECOMMENDATION #1
**Cost:** **$6/month** (Starter = 10K pageviews) / $0 (self-host)  
**Options:**  
- Starter: $6/mo (10K pageviews, 50 sites)
- Business: $14/mo (100K pageviews)
- Self-host: Free (MIT license)

**Multi-Domain:** ✅ Up to 50 sites (Starter) / 50 sites (Business)  
**Setup:** Single script tag (`plausible.js` ~1KB)  
**Cookie Banner:** **Not required** (no cookies, no personal data, EU-hosted)  

**Pros:**
- Simple, gorgeous dashboard
- Script is 75x smaller than GA
- Open source (can self-host)
- Aggregated multi-domain view
- Funnels, goals, UTM tracking
- Data never leaves EU

**Cons:**
- Self-host requires technical setup/maintenance
- Paid for cloud hosting
- Less detailed than GA4

**Cost @ current traffic:** $6/month  
**Cost @ 10x traffic (100K views):** $14/month (Business plan)  
**Cost @ 100x traffic:** $49/month (Growth plan)

---

### 6. PostHog
**Cost:** **Free tier:** 1M events/session, then usage-based  
**Pricing:** $0.00005/event after free tier ($50/million events)  
**Multi-Domain:** ✅ 1 project (free), 6 projects (paid)  
**Setup:** Complex - SDK integration, event tracking setup  
**Cookie Banner:** ⚠️ Anonymous events = no consent; Identified events = may need consent  

**Pros:**
- Generous free tier (1M events)
- Product analytics powerhouse (funnels, retention, cohorts)
- Feature flags, A/B testing, session replay
- Data warehouse integration

**Cons:**
- Overkill for simple blog analytics
- Steep learning curve
- Pricing gets expensive quickly
- Complex consent requirements for identified tracking

**Free Tier:** 1M events/mo, 5K session replays, 1M feature flags  
**Cost @ 10x traffic (500K events):** $0 (still within free tier)  
**Cost @ 5M events:** $200/month

---

### 7. Mixpanel
**Cost:** **Free:** 1M events/mo  
**Paid:** $28/month (per user) after 1M events  
**Multi-Domain:** ✅ Unlimited events (paid), 1M cap (free)  
**Setup:** SDK + event tracking code  
**Cookie Banner:** **Yes** required (collects device/user data)  

**Pros:**
- Powerful product analytics
- 10K session replays free
- Behavioral cohorts, analytics formulas
- Good for mobile apps

**Cons:**
- Cookie consent required
- Expensive if you exceed free tier
- Complex setup
- Mobile-focused features not needed for blogs

**Cost @ 10x traffic:** $0 (free tier)  
**Cost @ 2M events:** ~$56/month

---

## Cost Comparison: Current vs 10x Traffic Scale

| Platform | Current (Est. 5-10K views/mo) | 10x Traffic (50-100K views/mo) |
|----------|-------------------------------|--------------------------------|
| GA4 | $0 | $0 |
| Cloudflare | $0 | $0 |
| GoatCounter | $0 | $0 |
| Umami (self-hosted) | $0 (Railway free) | $5-15/mo |
| Plausible Cloud | $6/mo | $14/mo |
| PostHog | $0 | $0 (if <1M events) |
| Mixpanel | $0 | $0 (if <1M events) |

---

## Top 2 Recommendations

### 🥇 #1: Plausible Analytics Cloud ($6/month)

**Rationale:**
- **Zero maintenance burden** - No servers to manage, no updates
- **Perfect fit for your requirements:**
  - ✅ Privacy-first (no cookie banner needed)
  - ✅ Multi-domain support (50 sites on Starter)
  - ✅ Simple script tag setup
  - ✅ Shows pageviews, referrers, popular content, basic demographics
- **Predictable costs:** $6 → $14 predictable scaling
- **GDPR compliant out-of-box:** EU-hosted servers, no data processing agreements needed
- **Fast:** 1KB script won't slow down sites

**Why over Umami?** While Umami is free, the $6/month buys you:
- Automatic backups
- Security updates handled
- Zero devops time
- Professional support
- More time to focus on content, not infrastructure

**When to choose:** You're running a business, not a server. Value your time over $6/month.

---

### 🥈 #2: Umami Self-Hosted on Railway ($0/month)

**Rationale:**
- **Best value at low scale:** Free Railway tier covers usage
- **Full data ownership:** Your database, your rules
- **Modern UI:** Better than GoatCounter, comparable to Plausible
- **Privacy-first:** No cookie banner required

**Setup:** One-click Railway deployment, connect PostgreSQL database  
**Maintenance:** ~30 min/month (updates, monitoring)  
**Backups:** Manual or automated via Railway

**Why over Plausible?** If:
- You enjoy self-hosting
- Want zero recurring costs now
- Have technical skills (or willing to learn Docker basics)
- Traffic is genuinely low (<100K pageviews/month)

**Warning:** At 10x traffic, you'll likely need Railway paid tier ($5-15/mo), erasing Plausible cost advantage.

---

## Quick-Start Guide: Plausible Cloud (Recommended)

### Step 1: Sign Up (5 minutes)
1. Go to https://plausible.io/register
2. Create account
3. Add your first site (remylobster.com)
4. Note your script code: `data-domain="remylobster.com"`

### Step 2: Install Script (5 minutes per site)
Add to `<head>` of each site:
```html
<script defer data-domain="remylobster.com" src="https://plausible.io/js/script.js"></script>
```

Or install official plugins:
- **WordPress:** Plausible Analytics plugin
- **Ghost:** Code injection in header
- **Custom HTML:** Direct script tag

### Step 3: Add Remaining Sites (5 minutes)
In Plausible dashboard:
1. Click "+ Add website"
2. Add pantry-pal.com, remy-finance.com, sleepstoriesyoutube.com
3. Each gets unique `data-domain` attribute
4. Install corresponding script on each site

### Step 4: Dashboard Access
- View unified stats: Settings → Sites → click site
- Or view all sites: Dashboard shows quick stats for all
- Invite team members: Site Settings → People

### Step 5: Optional Features
- **Goals:** Track newsletter signups, button clicks
- **Funnels:** Multi-step conversion paths
- **Custom properties:** Track categories, authors
- **Search Console:** Connect for keyword data

---

## Quick-Start Guide: Umami Self-Hosted (Alternative)

### Step 1: Deploy on Railway (10 minutes)
1. Go to https://railway.app/
2. Sign up (GitHub/auth0)
3. Click "New Project" → "Deploy from GitHub repo"
4. Use: `umami-software/umami`
5. Add PostgreSQL database
6. Set environment variable: `DATABASE_URL` (auto-populated)
7. Deploy

### Step 2: Configure (5 minutes)
1. Visit your Railway URL (e.g., `https://analytics-production-xxx.up.railway.app`)
2. Login: `admin` / `umami`
3. Change password immediately

### Step 3: Add Sites (5 minutes per site)
1. Click "Add website"
2. Enter domain name and name
3. Copys tracking code:
```html
<script async defer data-website-id="YOUR-ID" src="https://your-railway-url/umami.js"></script>
```

### Step 4: Install on All Sites
Repeat for remylobster.com, pantry-pal.com, remy-finance.com, sleepstoriesyoutube.com

### Step 5: Railway Free Tier Limits
- **Compute:** ~500 hours/month (always-on OK for low traffic)
- **Storage:** 1GB PostgreSQL (sufficient for ~6 months of data)
- **Traffic:** Unmetered outbound

**When to upgrade:** If Railway usage exceeds $5/mo credit, switch to Plausible Cloud ($6/mo guaranteed).

---

## Recommendation Summary

**If you want the fastest path to working analytics:** Choose Plausible Cloud  
**If you want zero cost and don't mind maintenance:** Choose Umami on Railway  
**If you need product analytics depth:** Choose PostHog (but overkill for blogs)  
**If you want 100% free with no maintenance:** Choose Cloudflare Web Analytics (but limited features)

**My recommendation for your use case (4 content/blog sites):**
→ **Plausible Analytics Cloud** - $6/month investment saves infinite hours of maintenance, provides professional-grade privacy-first analytics with multi-domain view, and scales predictably.

---

*Research completed: 2026-02-21 03:45 CST*
*Sources: Official documentation, pricing pages, GitHub repositories, GDPR compliance docs*
