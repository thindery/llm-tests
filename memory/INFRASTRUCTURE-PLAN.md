# 🏗️ Infrastructure Architecture Plan
## Pantry-Pal & Remy-Finance Hosting, Domain & Deployment Strategy

**Prepared by:** Infrastructure Architect  
**Date:** February 2026  
**Target Budget:** $0 → $50/month max when profitable

---

## 📋 Executive Summary

| Project | Status | Launch Timeline | Stack |
|---------|--------|-----------------|-------|
| **Pantry-Pal** | MVP Complete, Monetization PR Ready | **THIS WEEK** | React + Vite + Express + SQLite |
| **Remy-Finance** | Design Complete | Q2 2026 | React + TypeScript + Tailwind + Express + PostgreSQL |

**Architecture Philosophy:** Start FREE, scale predictably. Zero surprise bills.

---

## 🌐 Domain Research & Recommendations

### PANTRY-PAL Domain Options (.com only)

| Priority | Domain | Est. Price | Status | Notes |
|----------|--------|------------|--------|-------|
| **1 (RECOMMENDED)** | `pantry-pal.com` | ~$12/yr | Check availability | Perfect match, memorable, keywords in URL |
| 2 | `pantrypalapp.com` | ~$12/yr | Likely available | Clear intent, "app" suffix for web apps |
| 3 | `mypantrypal.com` | ~$12/yr | Likely available | Personal touch, easy to remember |
| 4 | `pantrybuddy.com` | ~$12/yr | Likely available | Alternative branding, friendly |
| 5 | `stockyourpantry.com` | ~$12/yr | Likely available | Action-oriented, SEO friendly |
| 6 | `pantryly.com` | ~$12/yr | Likely available | "-ly" suffix trend, short |

**Best Choice:** `pantry-pal.com` - Perfectly describes the product, easy to spell, passes the "radio test" (can say it and people know how to spell it).

### REMY-FINANCE Domain Options (.com only)

| Priority | Domain | Est. Price | Status | Notes |
|----------|--------|------------|--------|-------|
| **1 (RECOMMENDED)** | `remyfinance.com` | ~$12/yr | Check availability | Brand + function combined |
| 2 | `remytrades.com` | ~$12/yr | Likely available | Action-oriented, trading focus |
| 3 | `stocktrackerly.com` | ~$12/yr | Likely available | "-ly" suffix, describes function |
| 4 | `stockly.io` | ~$30/yr | Likely available | Short, trendy (user said avoid .io but noting for completeness) |
| 5 | `remystocks.com` | ~$12/yr | Likely available | Brand + product clear |
| 6 | `trackmystocks.com` | ~$12/yr | Likely available | SEO-friendly, descriptive |
| 7 | `stockbriefly.com` | ~$12/yr | Likely available | "Brief" implies quick insights |

**Best Choice:** `remyfinance.com` - Professional, brand-forward, works for expansion beyond just stocks.

### Domain Registrar Recommendations

| Registrar | Price (.com) | Whois Privacy | Notes |
|-----------|--------------|---------------|-------|
| **Cloudflare Registrar** | $8-12/yr | FREE | **RECOMMENDED** - At-cost pricing, no markup |
| Namecheap | $11-14/yr | FREE | Good support, easy management |
| Porkbun | $9-11/yr | FREE | Clean UI, fair pricing |
| Google Domains | $12/yr | FREE | Simple, but being migrated to Squarespace |

**Recommendation:** Use **Cloudflare Registrar** for both domains. At-cost pricing (~$8-9/year for .com), free WHOIS privacy, and seamless integration with Cloudflare DNS/CDN.

---

## ☁️ Hosting Architecture

### PANTRY-PAL (Launch This Week)

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER BROWSER                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare (Free Plan)                                         │
│  ├── DNS Management (pantry-pal.com)                           │
│  ├── CDN / Edge Cache (Global)                                  │
│  ├── DDoS Protection                                            │
│  ├── Bot Protection                                             │
│  └── SSL/TLS (Auto Let's Encrypt)                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────────────────────────┐
│  Vercel (Free)  │   │  Railway (Free → Hobby)             │
│                 │   │                                     │
│  React + Vite   │   │  Express API Server                 │
│  Static Hosting │   │                                     │
│                 │   │  Database: SQLite (Volume Storage) │
│  Auto-deploy    │   │                                     │
│  from GitHub    │   │  Clerk Auth: Already configured     │
│                 │   │  Stripe Webhooks: HTTPS ready       │
└─────────────────┘   └─────────────────────────────────────┘
                     │
                     └─► API calls: api.pantry-pal.com
                       │ (Subdomain → Railway)
```

#### Component Details:

| Component | Platform | Plan | Why |
|-----------|----------|------|-----|
| **Frontend** | Vercel | Free | Unlimited static sites, auto-deploy, global CDN |
| **Backend** | Railway | Free Trial → Hobby ($5) | SQLite-friendly via volumes, simple Express hosting |
| **Database** | Railway Volume | 0.5 GB free → 5 GB hobby | SQLite file on persistent volume |
| **Auth** | Clerk | Existing | Continue using - free tier up to 10k MAU |
| **Payments** | Stripe | Existing | Webhooks work fine with Railway HTTPS |
| **CDN/DNS** | Cloudflare | Free | Global CDN, security, SSL |

#### Why Railway for Backend?

| Alternative | Verdict | Why Not |
|-------------|---------|---------|
| **Render** | OK backup | Free tier sleeps after 15 min (cold start), Railway keeps running |
| **Supabase** | Not ideal | Built for PostgreSQL, SQLite is simpler file storage |
| **Fly.io** | Overkill | More complex, better for multi-region |
| **Heroku** | Too expensive | $7/mo minimum, more expensive than Railway |

**Railway is perfect because:**
- ✅ SQLite works natively with volume storage
- ✅ Persistent storage (no cold starts unlike Render free tier)
- ✅ 30-day free trial, then $5/month hobby tier
- ✅ Simple deployment from GitHub
- ✅ Automatic HTTPS (needed for Stripe webhooks)
- ✅ Predictable pricing (no surprise bills)

---

### REMY-FINANCE (Future - Q2 2026)

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER BROWSER                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cloudflare (Free Plan)                                         │
│  ├── DNS Management (remyfinance.com)                          │
│  ├── CDN / Edge Cache (Global)                                  │
│  ├── Bot Protection (Yahoo Finance scrapers)                    │
│  └── SSL/TLS (Auto)                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────────────────────────┐
│  Vercel         │   │  Railway (Hobby → Pro)              │
│  React + TS +   │   │                                     │
│  Tailwind       │   │  Express API Server                 │
│                 │   │                                     │
└─────────────────┘   │  Database: PostgreSQL               │
                     │                                     │
                     │  Yahoo Finance API (no key req'd)   │
                     │  Data caching in PostgreSQL         │
                     └─────────────────────────────────────┘
```

#### Component Details:

| Component | Platform | Plan | Notes |
|-----------|----------|------|-------|
| **Frontend** | Vercel | Free → Pro ($20) if needed | Same as Pantry-Pal |
| **Backend** | Railway | Hobby ($5) → Pro ($20) | More compute for data processing |
| **Database** | Railway Postgres | 1 GB free | Built-in PostgreSQL offering |
| **CDN/DNS** | Cloudflare | Free | Same setup as Pantry-Pal |

---

## 📊 Cost Analysis

### Phase Breakdown

| Phase | Pantry-Pal | Remy-Finance | Total | Notes |
|-------|-----------|--------------|-------|-------|
| **Month 1-3 (Free/Launch)** | **$0** | Not live | **$0** | Railway free trial, Vercel free, Cloudflare free |
| **Month 4-6 (Growth)** | **~$8-10/mo** | Not live | **~$8-10/mo** | Railway Hobby ($5), Domain renewal (~$4/yr), Vercel still free |
| **Steady State** | **~$20-25/mo** | **~$15-20/mo** | **~$35-45/mo** | See breakdown below |
| **Scale (Profitable)** | **~$40-50/mo** | **~$30-40/mo** | **~$70-90/mo** | Upgraded plans |

### Detailed Monthly Costs - STEADY STATE

#### Pantry-Pal (Steady State ~$20-25/mo)

| Service | Plan | Monthly Cost | Limits at This Tier |
|---------|------|--------------|---------------------|
| Domains (1 .com) | Cloudflare | ~$0.70 ($8.50/yr) | 2 domains at this price |
| Vercel | Free | $0 | 1M requests/mo, 100GB bandwidth |
| Railway | Hobby | $5 | $5 credit included, covers light usage |
| Railway Usage | Actual | $2-5 | CPU/RAM if超出 $5 credit |
| Clerk | Free | $0 | Up to 10,000 MAU |
| Stripe | Transaction | 2.9% + 30¢ | Per-transaction, not monthly |
| Cloudflare | Free | $0 | Full CDN, DDoS, SSL |
| **TOTAL** | | **~$8-12/mo** | |

#### Remy-Finance (Steady State ~$15-20/mo)

| Service | Plan | Monthly Cost | Limits at This Tier |
|---------|------|--------------|---------------------|
| Domain | Cloudflare | ~$0.70 | ~$8.50/yr |
| Vercel | Free | $0 | Sufficient for marketing site |
| Railway | Hobby | $5 | $5 credit included |
| Railway | Usage | $5-10 | PostgreSQL + compute for Yahoo API calls |
| Cloudflare | Free | $0 | CDN, security |
| **TOTAL** | | **~$6-12/mo** | |

### Service-by-Service Free Tier Limits

| Service | Free Tier | When to Upgrade |
|---------|-----------|-----------------|
| **Vercel** | 1M requests, 100GB bandwidth | At 80% of limits consistently |
| **Railway** | 30 days + $5 credit, then $1/mo | When need >1 vCPU or >5GB storage |
| **Cloudflare** | Unlimited DNS, CDN, DDoS | Pro ($20) only if need advanced WAF rules |
| **Clerk** | 10,000 MAU, 100 max orgs | Pro ($25/mo) at 8,000 MAU |

---

## 🛡️ Cloudflare Setup Guide

### Why Cloudflare for Both Projects?

| Feature | Benefit | Free Plan |
|---------|---------|-----------|
| **DNS Management** | Fast propagation, easy A/CNAME records | ✅ Unlimited |
| **Global CDN** | Serve static assets from 300+ locations | ✅ Unlimited |
| **DDoS Protection** | Automatic mitigation of attacks | ✅ Unlimited |
| **Bot Protection** | Blocks scrapers, bad bots | ✅ Basic |
| **SSL/TLS** | Auto Let's Encrypt, always HTTPS | ✅ Full |
| **Page Rules** | Redirects, caching rules | 3 rules free |

### Cloudflare Configuration Steps

#### 1. Add Domain to Cloudflare
1. Sign up at cloudflare.com (free)
2. Click "Add a Site"
3. Enter: `pantry-pal.com` (and later `remyfinance.com`)
4. Select **Free Plan**
5. Update nameservers at registrar

#### 2. DNS Records Setup

| Type | Name | Value | TTL | Purpose |
|------|------|-------|-----|---------|
| CNAME | `www` | `cname.vercel-dns.com` | Auto | Frontend on Vercel |
| A | `@` | `76.76.21.21` | Auto | Vercel apex (or use CNAME flattening) |
| CNAME | `api` | `your-railway-app.up.railway.app` | Auto | Backend API |

#### 3. SSL/TLS Settings
- Go to **SSL/TLS** → **Overview**
- Set to **Full (strict)** for best security
- **Always Use HTTPS**: ON
- **Automatic HTTPS Rewrites**: ON

#### 4. Speed Optimizations
- **Auto Minify**: Enable HTML, CSS, JS
- **Brotli**: ON
- **Early Hints**: ON

#### 5. Security Settings
- **Security Level**: Medium
- **Bot Fight Mode**: ON (blocks bad bots scraping Yahoo Finance data)
- **Challenge Passage**: 30 minutes

#### 6. Page Rules (if needed)

**Rule 1: Cache Static Assets**
```
URL: *pantry-pal.com/static/*  
Settings: Cache Level = Cache Everything, Edge Cache TTL = 1 month
```

**Rule 2: API No Cache**
```
URL: *api.pantry-pal.com/*  
Settings: Cache Level = Bypass
```

---

## 🚀 Pantry-Pal Deployment Checklist

### Phase 1: Pre-Deployment (Day 1)

- [ ] **1.1** Purchase domain `pantry-pal.com` at Cloudflare Registrar
  - Cost: ~$8-12 for first year
  - Enable auto-renewal
  
- [ ] **1.2** Set up Cloudflare account and add domain
  - Copy nameservers to registrar
  - Verify DNS propagation (can take up to 24h, usually 5 min)

- [ ] **1.3** Prepare Railway account
  - Sign up at railway.app
  - Connect GitHub account
  - Note: 30-day free trial with $5 credit starts immediately

- [ ] **1.4** Prepare Vercel account
  - Sign up at vercel.com (can use same GitHub)
  - Import Pantry-Pal frontend repo

### Phase 2: Backend Deployment (Day 1-2)

- [ ] **2.1** Deploy backend to Railway
  ```bash
  # In Railway dashboard:
  # 1. New Project → Deploy from GitHub repo
  # 2. Select your backend repo
  # 3. Add environment variables (see 2.2)
  # 4. Add volume for SQLite: Settings → Volumes → Add (mount: /data)
  # 5. Deploy
  ```

- [ ] **2.2** Configure Railway environment variables
  ```
  DATABASE_URL=/data/pantry.db
  CLERK_PUBLISHABLE_KEY=pk_...
  CLERK_SECRET_KEY=sk_...
  STRIPE_SECRET_KEY=sk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  FRONTEND_URL=https://pantry-pal.com
  ```

- [ ] **2.3** Update database path for Railway volume
  ```javascript
  // Ensure SQLite path uses the mounted volume
  const dbPath = process.env.DATABASE_URL || './pantry.db';
  // For Railway: /data/pantry.db
  ```

- [ ] **2.4** Test backend health endpoint
  ```bash
  curl https://your-railway-url.up.railway.app/health
  # Should return 200 OK
  ```

### Phase 3: Frontend Deployment (Day 2)

- [ ] **3.1** Configure Vercel environment variables
  ```
  VITE_API_URL=https://api.pantry-pal.com
  VITE_CLERK_PUBLISHABLE_KEY=pk_...
  ```

- [ ] **3.2** Update API client to use production URL
  ```typescript
  // In your API client
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  ```

- [ ] **3.3** Deploy to Vercel
  - Push to main branch → auto-deploys
  - Set custom domain: `www.pantry-pal.com` and `pantry-pal.com`
  - Enable auto HTTPS

### Phase 4: DNS & SSL Configuration (Day 2-3)

- [ ] **4.1** Configure Cloudflare DNS records
  ```
  A     pantry-pal.com     → 76.76.21.21 (Vercel IP)
  CNAME www.pantry-pal.com → cname.vercel-dns.com
  CNAME api.pantry-pal.com → your-app.up.railway.app
  ```

- [ ] **4.2** Configure Vercel custom domains
  - In Vercel dashboard: Settings → Domains
  - Add: `pantry-pal.com` and `www.pantry-pal.com`
  - Verify DNS (may need to wait for propagation)

- [ ] **4.3** Configure Railway custom domain
  - In Railway: Settings → Domains
  - Add: `api.pantry-pal.com`
  - Railway provides CNAME target, add to Cloudflare

- [ ] **4.4** Verify SSL certificates
  ```bash
  curl -I https://pantry-pal.com
  curl -I https://api.pantry-pal.com
  # Both should show HTTP/2 200 and TLS 1.3
  ```

### Phase 5: Stripe Webhook Setup (Day 3 - CRITICAL)

- [ ] **5.1** Update Stripe webhook endpoint in Stripe Dashboard
  ```
  Old: http://localhost:3000/webhook (or ngrok)
  New: https://api.pantry-pal.com/webhook
  ```

- [ ] **5.2** Test webhook signing secret works
  ```bash
  # Send test event from Stripe CLI or Dashboard
  # Check Railway logs: railway logs
  ```

- [ ] **5.3** Verify webhook is receiving events
  - Create test payment in Stripe
  - Check database was updated (subscription status)

### Phase 6: Pre-Launch Testing (Day 4)

- [ ] **6.1** End-to-end test with real domain
  - Sign up with Clerk (new account)
  - Create pantry item
  - Subscribe with Stripe test card
  - Verify subscription active

- [ ] **6.2** Test on mobile devices
  - iOS Safari
  - Android Chrome
  - Verify responsive design

- [ ] **6.3** Performance check
  ```bash
  # Lighthouse scores should be 90+
  # Test at: https://pagespeed.web.dev/
  ```

- [ ] **6.4** Security headers check
  ```bash
  curl -I https://pantry-pal.com
  # Verify: Strict-Transport-Security, X-Content-Type-Options, etc.
  ```

### Phase 7: Go Live (Day 5)

- [ ] **7.1** Switch Stripe to Live Mode
  - Update environment variables:
    - STRIPE_SECRET_KEY → Live key
    - STRIPE_WEBHOOK_SECRET → Live webhook secret
  - Redeploy Railway

- [ ] **7.2** Verify Clerk production environment
  - Ensure not using development keys

- [ ] **7.3** Final smoke test
  - Create account
  - Make real purchase (use your own card, then refund)
  - Verify email receipts

- [ ] **7.4** Monitor monitoring
  - Set up Railway log alerts (optional)
  - Check Vercel analytics (included free)

- [ ] **7.5** Announce! 🎉
  - Post on social media
  - Submit to relevant directories
  - Email beta users

---

## 💰 "No Surprise Bill" Checklist

Services priced for predictable costs:

| Service | Why It's Safe | Watch Out For |
|---------|---------------|---------------|
| **Cloudflare** | Free tier has NO usage limits on core features | Paid add-ons are opt-in only |
| **Vercel Free** | Hard limits - will error, not bill | Functions usage over 1M invocations |
| **Railway Hobby** | $5 minimum, then usage-based with caps | Egress over 100GB (rare for API) |
| **Domains** | Fixed yearly cost, auto-renew | Enable auto-renew or lose domain |
| **Clerk** | Free up to 10k MAU hard limit | Upgrade required at limit, no surprise |

### Billing Alerts Setup

1. **Railway**: 
   - Set up billing alerts at $10 and $20 in dashboard
   - Enable email notifications

2. **Vercel**:
   - Monitor usage dashboard weekly
   - Set calendar reminder to check

3. **Clerk**:
   - They email at 80% of free tier
   - No automatic billing without explicit upgrade

### Cost Monitoring

Weekly 2-minute check:
```bash
# Railway dashboard - check usage
# Vercel dashboard - check bandwidth
# Clerk dashboard - check MAU count
```

---

## 📚 Remy-Finance Future Planning

When building Remy-Finance, reference this plan:

| Phase | Timeline | Action |
|-------|----------|--------|
| Development | Month 1-2 | Use same free infra as Pantry-Pal |
| Private Beta | Month 2-3 | Deploy to `staging.remyfinance.com` |
| Public Launch | Month 3-4 | Follow Pantry-Pal deployment checklist |
| Scale | Month 6+ | Upgrade Railway → Pro if needed |

### Yahoo Finance API Considerations

- **No API key required** - but be respectful of rate limits
- **Cache heavily** - Use PostgreSQL to cache stock data
- **Cloudflare Bot Protection** - May need to whitelist Yahoo if scraping
- **Rate limiting** - Implement in Express: max 100 requests/min per IP

---

## 🔮 Future Scaling Scenarios

### Scenario A: Pantry-Pal Hits 1,000 Paying Users

| Current | Recommended Upgrade | New Monthly Cost |
|---------|---------------------|-----------------|
| Railway Hobby ($5) | Railway Pro ($20) | +$15 |
| Vercel Free ($0) | Vercel Pro ($20) | +$20 |
| Clerk Free ($0) | Clerk Pro ($25) | +$25 |
| **Total** | | **~$60/mo** |

### Scenario B: Both Apps Profitable

Combined infrastructure: **~$90-120/mo** supporting:
- 50k+ MAU across both apps
- Multiple teams on Railway Pro
- Advanced analytics, support

Still well under 1% of revenue at $10k MRR.

---

## 📞 Quick Reference

| Service | Dashboard URL | Support |
|---------|---------------|---------|
| Cloudflare | dash.cloudflare.com | Community forums |
| Vercel | vercel.com/dashboard | 24/7 email (paid), Discord |
| Railway | railway.app/dashboard | Discord, email |
| Clerk | dashboard.clerk.com | Excellent docs + chat |
| Stripe | dashboard.stripe.com | 24/7 support |

---

## ✅ Summary: What To Do NOW

1. **TODAY**: Buy `pantry-pal.com` at Cloudflare Registrar
2. **TODAY**: Set up Cloudflare account, add domain, configure DNS
3. **TODAY**: Sign up for Railway, deploy backend
4. **TOMORROW**: Deploy frontend to Vercel, connect custom domain
5. **TOMORROW**: Configure Stripe webhooks with live HTTPS URL
6. **DAY 3**: End-to-end testing, fix any issues
7. **DAY 4-5**: Switch Stripe live, go public

**Expected time to live: 2-3 days**  
**Initial cost: $0-12** (just domain)  
**Month 2-3 cost: ~$5-8** (Railway hobby tier once trial ends)

---

*Plan created by Infrastructure Architect*  
*Questions? Check service documentation or escalate to team lead.*
