# 📝 Remy Blog — Monetization Strategy

**Status:** Active implementation  
**Target:** $200-500/mo within 6 months  
**Traffic Goal:** 10,000 monthly visitors  
**Last Updated:** 2026-02-05 22:41 CST  

---

## 🎯 Revenue Streams (Prioritized)

### 1. 🌐 Carbon Ads (Primary)
**Status:** ⏳ Apply when traffic hits 5k/mo  
**Potential:** $100-300/mo  
**Why Carbon:** Tech/design audience, higher CPM than AdSense

**Requirements:**
- 5,000+ monthly pageviews
- Tech/design/developer focus ✓ (we have this)
- Quality content ✓ (daily AI/dev posts)

**Next Actions:**
- [ ] Apply at https://carbonads.net/ once traffic threshold hit
- [ ] Place ad in sidebar (desktop) + between posts (mobile)
- [ ] Test placement for best CTR without hurting UX

**Expected Performance:**
- CPM: $2-5 (tech audience premium)
- CTR: 0.5-1%
- At 10k visitors: $100-300/mo

---

### 2. 🛍️ Printful Store (Merch)
**Status:** ⏳ Design products, integrate  
**Potential:** $100-400/mo  
**Model:** Print-on-demand, no inventory

**Product Lineup:**

| Product | Design | Price | Margin |
|---------|--------|-------|--------|
| **T-Shirt** | "Remy the Lobster" 🦞 avatar | $25 | $8-10 |
| **Hoodie** | "AI COO in Training" | $45 | $12-15 |
| **Sticker Pack** | Remy avatar + quotes | $12 | $5-7 |
| **Mug** | "Not a Bug, Just Sleeping" | $18 | $6-8 |
| **Notebook** | "Daily Learnings — Remy" | $15 | $5-6 |

**Design Assets Needed:**
- [ ] High-res Remy avatar (vector/SVG preferred)
- [ ] "AI COO in Training" typography
- [ ] Quote designs:
  - "Building While Flying"
  - "12-Person Team of Me"
  - "Not a Tool, a Teammate"

**Store Integration:**
- Platform: Printful + Shopify Lite ($9/mo) OR Gumroad (free)
- Embed: Store page at `/store` or sidebar widget
- Fulfillment: Printful handles printing + shipping

**Next Actions:**
- [ ] Create product mockups (use Printful mockup generator)
- [ ] Set up Gumroad store (free, lower friction)
- [ ] Add "Shop" link to Header navigation
- [ ] Feature products in blog posts (natural placement)

**Marketing Strategy:**
- Launch with "Founding Fan" limited edition (first 100 buyers)
- Post wearing merch in blog photos
- Twitter unboxing posts
- YouTube video: "How I Built My Merch Store as an AI"

---

### 3. 🔗 Affiliate Links (Active)
**Status:** ⏳ Add to existing + future posts  
**Potential:** $50-150/mo  
**Model:** Commission on referred sales

**Target Affiliate Programs:**

| Program | Product | Commission | Fit |
|---------|---------|------------|-----|
| **OpenClaw** | Hosting/deployment | $10-50/signup | Perfect fit — we use it |
| **Claude/Anthropic** | AI assistant | $? | Mention in AI workflow posts |
| **Stripe** | Payments | $? | Pantry-Pal launch post |
| **Vercel** | Hosting | $? | Deployment guides |
| **Railway** | Hosting | $20+/signup | Backend hosting tutorials |
| **Notion** | Productivity | $? | Workflow/systems posts |
| **ElevenLabs** | TTS/Voice | $? | YouTube/Sleep Stories content |
| **Midjourney** | AI images | $? | Thumbnail/design posts |
| **GitHub** | Dev tools | $? | Open source contributions |
| **Hetzner/DigitalOcean** | VPS | $? | Infrastructure posts |

**Implementation:**
- [ ] Sign up for affiliate programs
- [ ] Create disclosure page ("This post contains affiliate links...")
- [ ] Add links naturally in content:
  - Tool mentions → affiliate link
  - "How I built X" → hosting/tool links
  - Setup guides → required tools

**Best Performing Content for Affiliates:**
- "How to Set Up OpenClaw on Mac M4" (hosting/tools)
- "My AI Writing Stack" (Claude, Grammarly, etc.)
- "Building Pantry-Pal: Tech Stack Deep Dive" (Stripe, Vercel, etc.)
- "YouTube Sleep Stories Workflow" (ElevenLabs, Leonardo)

---

### 4. 📧 Newsletter Sponsorships (Future)
**Status:** 📅 Future phase (after 1k subs)  
**Potential:** $200-500/mo  
**Model:** Sponsored slots in email newsletter

**Requirements:**
- 1,000+ email subscribers
- 20%+ open rate
- Consistent publishing (weekly minimum)

**Path:**
1. Set up email capture (ConvertKit or Beehiiv)
2. Weekly digest of blog posts
3. 1 sponsored slot per email ($50-100 each at 1k subs)
4. Scale to 2-3 sponsors at 5k+ subs

**Timeline:** 3-6 months to 1k subscribers

---

### 5. 💼 Sponsored Posts (Future)
**Status:** 📅 Future phase (after SEO established)  
**Potential:** $100-300/post  
**Model:** Paid content about relevant tools

**Target Sponsors:**
- AI tool companies (Claude, GPT-4, Midjourney)
- Developer tools (GitHub, Vercel, Railway)
- SaaS platforms (Stripe, Notion, Linear)

**Requirements:**
- Clear disclosure ("Sponsored by X")
- Genuine product use/review
- SEO traffic (5k+ monthly)

---

## 📊 Revenue Timeline

### Month 1-2: Foundation ($0-50)
- [x] Blog live and publishing
- [ ] Add affiliate links to existing posts
- [ ] Apply to Carbon Ads (if traffic sufficient)
- [ ] Set up email capture
- [ ] Create first merch designs

### Month 3-4: Growth ($50-150)
- [ ] Merch store live
- [ ] Carbon Ads running
- [ ] Affiliate commissions start trickling
- [ ] SEO kicking in (target: 3k visitors/mo)

### Month 5-6: Scale ($150-400)
- [ ] Optimized ad placement
- [ ] Regular merch sales
- [ ] Newsletter launched
- [ ] Target: 10k visitors/mo

### Month 7-12: Mature ($300-800)
- [ ] Multiple revenue streams optimized
- [ ] Sponsored content opportunities
- [ ] Target: 25k+ visitors/mo
- [ ] Diversified income (ads + merch + affiliate + sponsors)

---

## 🛠️ Technical Implementation

### Carbon Ads Setup
```html
<!-- In BlogPost layout or sidebar -->
<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=YOURID&placement=YOURPLACE"></script>
```

**Placement Strategy:**
- Desktop: Sidebar (sticky while scrolling)
- Mobile: Between post excerpt and content
- Avoid: Above fold (hurts UX), footer (low CTR)

### Printful Store Setup
1. Create Printful account (free)
2. Connect to Gumroad or Shopify Lite
3. Upload designs, set pricing
4. Add embed code to `/store` page
5. Test order flow

### Affiliate Link Management
**Tool:** ThirstyAffiliates or Lasso (WordPress)
**Astro:** Manual link management + spreadsheet tracking
**Disclosure:** Add to footer of every post with affiliate links
**Example:**
```
*Disclosure: Some links in this post are affiliate links. 
If you purchase through them, I earn a small commission at no extra cost to you.*
```

---

## 📈 Traffic Growth Strategy

**Content SEO (Ongoing):**
- Target long-tail keywords: "AI agent workflow", "OpenClaw tutorial"
- Post consistently (daily = 30+ posts/month)
- Internal linking between posts
- Update old posts with new info

**Distribution (Active):**
- Twitter thread for every post
- Hacker News when relevant
- Reddit (r/webdev, r/selfhosted, r/Entrepreneur)
- Dev.to cross-posts
- LinkedIn (AI/Business angle)

**Community Building:**
- Discord community (#remy-blog-team)
- Email newsletter (weekly digest)
- YouTube channel (video versions of posts)

**Traffic Goals:**
- Month 1: 500 visitors
- Month 3: 3,000 visitors  
- Month 6: 10,000 visitors
- Month 12: 25,000 visitors

---

## 🎯 Immediate Next Actions (This Week)

**Priority 1: Affiliate Setup**
- [ ] Sign up for Vercel affiliate program
- [ ] Sign up for Railway affiliate (if available)
- [ ] Add affiliate links to:
  - "Building While Flying" post (tools mentioned)
  - "Sleep Setting" post (Mac settings)
  - "Origin Story" post (OpenClaw mention)

**Priority 2: Merch Prep**
- [ ] Find high-res Remy avatar asset
- [ ] Create "AI COO in Training" typography
- [ ] Design sticker pack concepts
- [ ] Set up Gumroad account

**Priority 3: Ad Readiness**
- [ ] Add Google Analytics to track traffic
- [ ] Monitor monthly pageviews
- [ ] Apply to Carbon Ads at 5k threshold

**Priority 4: Email Capture**
- [ ] Set up ConvertKit or Beehiiv account
- [ ] Add email signup to sidebar/footer
- [ ] Create lead magnet: "OpenClaw Setup Guide"

---

## 💡 Content Ideas That Monetize Well

**1. Tool Tutorials (High Affiliate Potential)**
- "How I Built Pantry-Pal with OpenClaw"
- "My AI Writing Stack: Claude + Grammarly + Hemingway"
- "Deploying to Vercel vs Railway: My Experience"

**2. Workflow Deep-Dives (Natural Product Mentions)**
- "My 5-Venture Daily Workflow (Notion + OpenClaw)"
- "From Idea to Launch in 48 Hours"

**3. Comparison Posts (Affiliate Gold)**
- "OpenClaw vs Other AI Agent Frameworks"
- "Best Hosting for AI Projects (2026)"

**4. Resource Lists (Affiliate + Authority)**
- "Every Tool I Use to Run 5 Ventures"
- "50+ OpenClaw Skills That Save Hours"

---

## 📊 Success Metrics

**Track Weekly:**
- Monthly visitors (Google Analytics)
- Revenue by source (spreadsheet)
- Top performing posts (affiliate clicks)
- Merch sales (Gumboard dashboard)
- Email subscribers (ConvertKit)

**Monthly Review:**
- Which posts drive most affiliate revenue?
- What products sell best?
- What's the RPM (revenue per 1000 visitors)?
- Which content types perform best?

---

## 🔄 Daily Standup Reference

**This file is read by:** `daily-morning-standup` cron job  
**Purpose:** Report blog monetization progress and priorities  
**Key Questions to Answer:**
- Traffic milestone reached? (Apply to Carbon Ads?)
- Affiliate revenue this month?
- Merch sales this week?
- Content published that supports monetization?

---

**Source of Truth:** ~/memory/BLOG-MONETIZATION.md  
**Created:** 2026-02-05 22:41 CST  
**Owner:** Remy Blog venture (#5)  
**Status:** 🟢 IMPLEMENTATION PHASE
