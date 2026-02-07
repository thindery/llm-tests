# 🤫 AgentAds — Project Organization

**Status:** POC Sprint  
**Goal:** Working prototype by Friday EOD  
**Last Updated:** 2026-02-05 22:57 CST  

---

## 🎯 Project Goals

### Primary Goal
Build "AdWords for AI Agents" — an ad network that lets AI agent developers monetize with one simple snippet.

### Success Metrics
| Metric | Friday POC | Month 1 | Month 3 |
|--------|-----------|---------|---------|
| Publishers | 1 (awesome-openclaw) | 5 | 20 |
| Advertisers | 2 (mock/real) | 5 | 15 |
| Ad impressions | Trackable | 10K/mo | 100K/mo |
| Revenue | $0 (test) | $500/mo | $10K/mo |

### Why This Matters
- AI agents are exploding but creators can't monetize
- Existing ad networks don't understand agent context
- First-mover advantage in $15-20B market

---

## ❓ Key Questions to Answer

### Technical Questions
1. **How do we track impressions reliably?**
   - Pixel tracking (1x1 GIF)?
   - JavaScript beacon?
   - Server-side logging?
   - What about ad blockers?

2. **How do we prevent click fraud?**
   - IP rate limiting?
   - Device fingerprinting?
   - CAPTCHA on suspicious clicks?
   - Publisher verification?

3. **How do we target contextually?**
   - Keywords in page content?
   - Publisher category tags?
   - Agent workflow detection?
   - Manual advertiser selection?

4. **How do we serve ads fast?**
   - CDN caching?
   - Edge functions (Cloudflare Workers)?
   - Pre-load next ad?
   - 

### Business Questions
5. **What do we charge advertisers?**
   - CPM rate ($5? $10? $20?)
   - Minimum budget ($100? $500?)
   - Self-serve or manual sales?

6. **What do we pay publishers?**
   - Revenue share (60%? 70%? 80%?)
   - Payout threshold ($50? $100?)
   - Payment frequency (monthly? net-30?)

7. **Who are our first 10 advertisers?**
   - OpenClaw hosting partners?
   - AI API companies (Claude, OpenAI)?
   - Developer tools (Vercel, Railway)?
   - Clawhub skill creators?

### Legal/Ethics Questions
8. **Privacy compliance?**
   - GDPR (EU users)?
   - CCPA (California)?
   - Cookie consent?
   - Data retention policies?

9. **What ad content is allowed?**
   - Competitive products OK?
   - Crypto/NFT ads?
   - Adult content exclusion?
   - Editorial review process?

---

## ✅ MVP Bare Minimum Requirements

### Must Have for Friday POC

#### Publisher Side
- [ ] **Simple SDK** — Publisher can add ad with 1-3 lines of code
- [ ] **Ad renders** — Ad displays correctly on awesome-openclaw
- [ ] **Non-intrusive** — Ad fits design, doesn't break UX
- [ ] **Async loading** — Doesn't block page render

#### Advertiser Side  
- [ ] **2 sample ads** — Railway + Claude (or similar)
- [ ] **Relevant targeting** — Ads relevant to OpenClaw/AI agents
- [ ] **Working links** — Click goes to advertiser site

#### Tracking (Critical)
- [ ] **Impression tracking** — Log when ad is viewed
- [ ] **Click tracking** — Log when ad is clicked
- [ ] **Basic analytics** — Simple dashboard shows counts
- [ ] **Time stamps** — When impression/click occurred
- [ ] **Publisher ID** — Which publisher generated the impression

#### Infrastructure
- [ ] **Ad server** — Returns ad via API endpoint
- [ ] **Static hosting** — SDK hosted on CDN or GitHub
- [ ] **Works on awesome-openclaw** — Proof it integrates

### Can Skip for Friday (Future)
- [ ] Payment processing (Stripe integration)
- [ ] Real-time bidding
- [ ] Complex targeting algorithms
- [ ] Publisher dashboard
- [ ] Fraud detection beyond basics
- [ ] GDPR compliance UI
- [ ] Multiple ad formats
- [ ] A/B testing

---

## 🎁 Nice-to-Haves (Post-MVP)

### Near-term (Month 1-2)
1. **Auto-refresh ads** — Rotate ads every 30 seconds
2. **Multiple ad sizes** — Banner, sidebar, inline
3. **Dark mode support** — Ads match site theme
4. **A/B testing** — Test different ad copy
5. **Email reports** — Weekly publisher stats
6. **Referral program** — Publishers earn for referrals

### Medium-term (Month 3-6)
7. **Self-serve dashboard** — Advertisers create campaigns
8. **Stripe integration** — Auto-billing and payouts
9. **Content targeting** — Scan page for context
10. **Performance optimization** — Sub-100ms ad load
11. **Fraud scoring** — ML-based click fraud detection
12. **API webhooks** — Real-time event notifications

### Long-term (Vision)
13. **Real-time bidding** — Auction-based ad serving
14. **Cross-device tracking** — Unified user profiles (privacy-safe)
15. **Video ads** — For YouTube/agent video content
16. **Native ads** — In-content recommendations
17. **Programmatic** — Integration with external DSPs

---

## 💳 Payment & Billing Structure

### Advertiser Billing (They Pay Us)

**Model:** CPM (Cost Per Mille / 1,000 impressions)
**Rate:** $10-20 CPM (market rate for developer niche)
**Minimum:** $100 campaign budget
**Billing:** Pre-pay via Stripe
**Options:**
- $100 = ~10,000 impressions
- $500 = ~50,000 impressions  
- $1,000 = ~100,000 impressions

### Publisher Payouts (We Pay Them)

**Revenue Share:** 70% to publisher, 30% to AgentAds
**Example:**
- Advertiser pays $10 CPM
- Publisher earns $7 CPM
- AgentAds keeps $3 CPM

**Payout Threshold:** $50 minimum
**Frequency:** Monthly (net-30)
**Method:** Stripe Connect or PayPal
**Reporting:** Real-time dashboard + monthly invoice

### Sample Math

**Scenario:** awesome-openclaw gets 5,000 monthly visitors
- 2 ad impressions per visitor = 10,000 impressions
- At $10 CPM = $100 advertiser spend
- Publisher earns $70
- AgentAds earns $30

**At Scale:** 20 publishers, 100K monthly impressions each
- 2M total impressions
- At $10 CPM = $20,000 revenue
- Publisher payouts: $14,000
- AgentAds net: $6,000/mo

---

## 📊 Tracking Architecture

### What We Track

#### Impression Event
```javascript
{
  event: "impression",
  ad_id: "railway-001",
  publisher_id: "awesome-openclaw",
  placement: "sidebar",
  timestamp: "2026-02-05T22:57:00Z",
  ip: "192.168.1.1", // Hashed/anonymized
  user_agent: "Mozilla/5.0...", // Browser
  referrer: "https://awesome-openclaw.example.com",
  session_id: "abc123", // For deduplication
  url: "/page/path"
}
```

#### Click Event
```javascript
{
  event: "click",
  ad_id: "railway-001",
  publisher_id: "awesome-openclaw",
  impression_id: "imp_abc456", // Link to original impression
  timestamp: "2026-02-05T22:57:30Z",
  ip: "192.168.1.1",
  destination: "https://railway.app"
}
```

### How We Track It

**Option A: JavaScript Beacon (Immediate)**
- Fire fetch/XHR request when ad renders
- Fire when click happens
- Simple, reliable
- Ad blockers might block

**Option B: Pixel Tracking (Invisible Image)**
- 1x1 transparent GIF
- Browser loads it = impression counted
- Harder to block (looks like normal image)
- Slightly less data

**Option C: Combined (Recommended)**
- Pixel for impression (reliable)
- JavaScript for click (needs interaction)
- Server-side validation

### Storage (Friday POC)

Simple JSON/CSV files work:
```javascript
// impressions.json
[
  {"ad_id": "railway-001", "ts": "2026-02-05T22:57:00Z", "pub": "awesome-openclaw"},
  {"ad_id": "claude-001", "ts": "2026-02-05T22:57:01Z", "pub": "awesome-openclaw"}
]

// clicks.json  
[
  {"ad_id": "railway-001", "ts": "2026-02-05T22:57:30Z", "pub": "awesome-openclaw"}
]
```

### Real Database (Post-Friday)

Use SQLite or PostgreSQL:
```sql
CREATE TABLE impressions (
  id TEXT PRIMARY KEY,
  ad_id TEXT,
  publisher_id TEXT,
  created_at TIMESTAMP,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE TABLE clicks (
  id TEXT PRIMARY KEY,  
  impression_id TEXT,
  ad_id TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY (impression_id) REFERENCES impressions(id)
);
```

### Deduplication ( Critical)

Prevent double-counting:
- Session-based (same user, 30-min window = 1 impression)
- IP-based (backup, but shared IPs are issue)
- Cookie-based (if privacy allows)

**Friday POC:** Simple 5-minute cooldown per ad per session

---

## 📝 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-05 | Static ads for POC | Fastest to build, proves concept |
| 2026-02-05 | NPM package first | Developer-friendly, TypeScript |
| 2026-02-05 | CPM model initially | Predictable for publishers |
| 2026-02-05 | 70/30 revenue share | Competitive with Carbon Ads |
| 2026-02-05 | Awesome-openclaw test case | Real traffic, low risk |
| 2026-02-05 | Pixel + JS tracking | Reliable, hard to block |

---

## 🚀 Immediate Action Items (Updated)

### Thursday (Tomorrow)
- [ ] **Dev:** Finish SDK with impression tracking
- [ ] **Dev:** Build simple analytics dashboard
- [ ] **Researcher:** Complete competitive analysis
- [ ] **All:** Review POC requirements checklist

### Friday  
- [ ] **Dev:** Integrate with awesome-openclaw
- [ ] **Dev:** Test impression/click tracking end-to-end
- [ ] **PM:** Demo to thindery
- [ ] **All:** Document learnings for v2 planning

---

## 📚 Related Files

- `~/memory/AGENTADS-POC-PLAN.md` — Technical build plan
- `~/memory/MONETIZATION-RESEARCH.md` — Revenue stream context
- `~/projects/agentads-poc/` — Code (coming Thursday)
- Discord: #agentads-team (1468829699135377480)

---

**Owner:** Remy (PM), Dev team  
**Stakeholders:** thindery (CEO), Visionary (Strategy)  
**Status:** 🟢 ORGANIZED — Building to spec
