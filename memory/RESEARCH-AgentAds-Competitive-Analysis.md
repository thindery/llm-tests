# AgentAds Competitive Analysis Report

**Research Date:** February 5, 2026  
**Analyst:** Research Subagent  
**Timeline:** 24 hours (completed)

---

## Executive Summary

The AI agent / developer-focused advertising network landscape is served by several key players, ranging from exclusive boutique networks (Carbon Ads, EthicalAds) to massive automated platforms (Google AdSense) and infrastructure providers (Kevel/Adzerk, Broadstreet). The market shows clear differentiation between privacy-focused, contextual targeting approaches and behavioral tracking models.

---

## 1. CARBON ADS (carbonads.net)

### Overview
- **Parent Company:** BuySellAds
- **Positioning:** Exclusive network for developers, creators, and designers
- **Network Size:** 600+ hand-picked tech sites
- **Total Payouts:** $120M+ to publishers

### Integration
- **Method:** JavaScript script tag (single code snippet)
- **Framework Support:** React, Vue, etc. - load as client component
- **Ad Formats:** Native CPC "Classic" and "Cover" formats
- **Placement Requirements:** 
  - Desktop: Above the fold (visible at 1366×768)
  - Mobile: Within 1 scroll (within 3× viewport height)

### Publisher Requirements
- **Traffic Minimums:** None officially, but application asks for tiers:
  - Less than 10,000 / 10K-50K / 50K-250K / 250K-1M / +1M monthly pageviews
- **Approval Process:** Invitation only, 5-7 business day review
- **Exclusivity:** YES - Carbon ads must be the ONLY ads on the page

### Revenue Model
- **Publisher Payout:** $0.50–$1.10 CPM (cost per thousand impressions)
- **Revenue Share:** Not publicly disclosed (estimated ~50-60% based on CPM rates)
- **Payment Schedule:** Net-30
- **Minimum Payout:** $1
- **Payment Methods:** 
  - PayPal ($20 min balance)
  - Check ($50 min balance) 
  - Wire Transfer ($500 min, $35 fee)
  - Open Collective (4% platform fee)

### Targeting
- **Method:** Pixel-based tracking (no cookies claimed, but loads third-party pixels)
- **Geographic:** Country-level, OS, browser targeting
- **Audience:** English-speaking developers/designers (US, Canada, Europe = 100% fill rate)

### Advertiser Details
- **Campaign Minimum:** $5,000–$10,000/month for 60-90 days
- **No self-serve:** Managed campaigns only
- **Target CTR:** 0.07% network average

### API Documentation
- **Publisher Dashboard:** https://sell.buysellads.com/auth
- **Docs:** Available via BuySellAds documentation

---

## 2. ETHICALADS (ethicalads.io)

### Overview
- **Parent Company:** Read the Docs
- **Positioning:** Privacy-preserving, developer-focused ad network
- **Network Size:** 100+ sites, 35 million developer impressions/month
- **Differentiation:** 100% GDPR/CCPA compliant, no cookie banners needed

### Integration
- **Method:** JavaScript client (open source)
- **Ad Formats:** Single text or image ad per page
- **Placement Requirements:**
  - Above the fold on both desktop AND mobile
  - Only EthicalAds ad on page (own promotions OK)
  - Not within content flow

### Publisher Requirements
- **Traffic Minimums:** 50,000+ monthly pageviews (explicitly stated)
- **Approval Process:** Invite-only, application required
- **Audience:** Developer-focused sites (Frontend, Backend/Python, Data Science, DevOps, Security)

### Revenue Model  
- **Publisher Payout:** ~$2.00-$2.50 CPM
- **Revenue Share:** **70% to publishers** (explicitly stated - industry-leading)
- **Payment Schedule:** Monthly (by 15th of month)
- **Minimum Payout:** $50
- **Payment Methods:**
  - PayPal
  - OpenCollective
  - GitHub Sponsors
  - Stripe Connect (bank transfer)

### Targeting
- **Method:** Contextual (AI-powered) + Geographic
- **No Tracking:** No cookies, no third-party scripts/pixels
- **Keywords:** Site-level + optional page-specific keywords
- **Geo:** Country + US State level only (IP-based)

### Advertiser Details
- **Pricing:** Public pricing available (transparent model)
- **Revenue Calculator:** Available for publishers
- **Target CTR:** 0.1% or higher expected

### Open Source
- **Ad Server:** https://github.com/readthedocs/ethical-ad-server
- **Ad Client:** https://github.com/readthedocs/ethical-ad-client
- **Full transparency** on how ads are selected

---

## 3. GOOGLE ADSENSE

### Overview
- **Positioning:** The 800lb gorilla - dominant market leader
- **Reach:** Virtually every website type, global coverage
- **Fill Rate:** Near 100% globally

### Integration
- **Method:** Simple script tag (copy-paste)
- **Auto-ads:** Can automatically place ads on page
- **Ad Formats:** Display, native, in-feed, in-article, anchor ads, vignette

### Publisher Requirements
- **Traffic Minimums:** No minimum (anyone can apply)
- **Approval:** Automated review process
- **Exclusivity:** None - can use with other ad networks

### Revenue Model
- **Publisher Payout:** Variable (typically $1-$10+ CPM depending on niche)
- **Revenue Share:** **68% to publishers** (officially disclosed)
- **Payment Schedule:** Monthly (Net-21)
- **Minimum Payout:** $100
- **Payment Methods:** Bank transfer, check

### Targeting
- **Method:** Behavioral tracking (cookies), contextual, interest-based
- **Data:** Extensive user profiling via Google's data ecosystem
- **Consent Required:** GDPR cookie banners, CCPA notices

### Why It's Dominant
1. **Scale:** Millions of advertisers = highest fill rates
2. **Automation:** Set-and-forget implementation
3. **Global:** Works in every country/language
4. **Smart targeting:** Access to Google's user data
5. **Trust:** Advertisers trust Google brand

---

## 4. BUYSELLADS (buysellads.com)

### Overview
- **Positioning:** Premium ad marketplace + managed sales
- **Network Size:** 200+ publishers
- **Traffic Requirements:** 200,000+ monthly pageviews (higher tier than Carbon)

### Business Model
- **Hybrid:** Marketplace (self-serve) + Managed (sales team)
- **Partnership Models:**
  1. End-to-End Management (Premier Partner)
  2. Add-On Sales Support (work alongside your sales team)
  3. Supplemental Sales (fill unsold inventory)

### Integration
- **Method:** JavaScript framework + Ad Serving API
- **Formats:** Native, Display, Email, Podcast, Sponsored Content
- **Documentation:** https://docs.buysellads.com

### Ad Serving API
- Server-side or Client-side integration
- JSON API for custom implementations
- Email ad serving support

### Targeting
- **Audiences:** Business, Consumer, Crypto, Design, Developer, AI
- **Method:** Contextual + Behavioral

### Revenue Model
- **Revenue Share:** Custom/negotiated per publisher (not public)
- **Premium:** Higher rates due to direct brand relationships

---

## 5. AD SERVING AS A SERVICE

### KEVEL (formerly Adzerk) - kevel.com
- **Model:** API-based ad serving infrastructure (NOT an ad network)
- **Target:** Retailers, Marketplaces, Fintech, Travel, Delivery apps
- **Products:**
  - Kevel Ad Server (API-based serving)
  - Kevel Audience (AI segmentation)
  - Kevel Console (Campaign management UI)
- **AI Features:** Yield Forecast, Custom Relevancy, AI Segment Builder
- **Use Case:** Build your OWN retail media network
- **Not a competitor** for AgentAds (they're infrastructure, not a network)

### BROADSTREET - broadstreetads.com
- **Model:** Ad manager for small publishers (direct sales focus)
- **Target:** Local news, B2B publishers
- **Differentiation:** "Only ad manager for publishers who work directly with advertisers"
- **Features:** Ad serving + reporting for direct-sold campaigns
- **Competes with:** Google Ad Manager
- **Not a competitor** for AgentAds (they're tools, not a network)

---

## FEATURE COMPARISON MATRIX

| Feature | Carbon Ads | EthicalAds | Google AdSense | BuySellAds |
|---------|------------|------------|----------------|------------|
| **Integration Ease** | Easy (script) | Easy (script) | Easiest (script) | Moderate (JS + API) |
| **Revenue Share** | ~50-60% (est) | **70%** | 68% | Custom |
| **Publisher CPM** | $0.50-$1.10 | ~$2.00-$2.50 | $1-$10+ | Premium rates |
| **Traffic Min** | None (any size) | 50K+/month | None | 200K+/month |
| **Approval** | Invite-only | Invite-only | Automated | Managed |
| **Exclusivity** | YES | Single ad | NO | Varies |
| **Targeting** | Pixel-based | Contextual | Behavioral | Contextual + Behavioral |
| **Privacy/Cookies** | Loads 3rd party pixels | **No tracking** | Extensive tracking | Flexible |
| **GDPR Compliance** | Questionable | **Full** | Via consent | Varies |
| **Ad Formats** | Native CPC | Single native | Many formats | Many formats |
| **Self-Serve** | NO | NO | YES | YES (partial) |
| **Open Source** | NO | **YES** | NO | NO |
| **Transparency** | Low | **High** | Medium | Medium |
| **Human Support** | Account manager | Email (human) | None | Dedicated team |

---

## GAPS & OPPORTUNITIES FOR AGENTADS

### 1. The "No Minimum" Gap
- **Carbon:** Accepts small publishers but vague on minimums
- **EthicalAds:** 50K minimum excludes smaller AI agent sites
- **Opportunity:** Accept publishers with 10K-50K pageviews (growing agent sites)

### 2. The AI Agent Vertical Gap
- **Current Networks:** Focus on "developers" broadly
- **Opportunity:** Exclusive focus on AI agent builders, LLM developers, AI automation
- **Niche:** No one owns "AI agent monetization" yet

### 3. The API-First Integration Gap
- **Current:** Script tags dominate
- **Opportunity:** API-first for agent-based content (not just web pages)
- **Innovation:** Ads IN agent conversations/responses

### 4. The Transparency + Privacy Sweet Spot
- **EthicalAds:** 70% share but requires 50K traffic
- **Carbon:** Lower requirements but less transparent
- **Opportunity:** EthicalAds model (70% share, open source, privacy) + lower barriers

### 5. The Self-Serve Gap
- **Carbon & EthicalAds:** Managed only (slow, high touch)
- **Opportunity:** Self-serve for both publishers AND advertisers

### 6. The "Acceptable Ads" Positioning
- **EthicalAds:** Listed on Acceptable Ads (ad blocker allowlist)
- **Opportunity:** Similar positioning - "respects users, respects privacy"

---

## RECOMMENDED INTEGRATION PATTERN FOR MVP

### Tier 1: Quick Win (Script Tag)
- Single JavaScript snippet (like Carbon/EthicalAds)
- Copy-paste installation
- Auto-detects placement
- Works on any web-based agent interface

### Tier 2: Framework Integration
- React/Vue/Angular components (npm packages)
- Client-side rendered (CSR) support
- SPA-friendly (single page applications)

### Tier 3: API-First (Differentiator)
- REST API for server-side rendering
- JSON ad responses
- Perfect for chatbots, API-based agents
- Programmatic integration into agent responses

### Ad Placement Strategy
- **Above the fold** (Carbon/EthicalAds requirement)
- **Non-disruptive** - beside content, not within agent conversation flow
- **Single ad per page** (high value, not spammy)
- **Mobile-responsive** - same placement rules as desktop

---

## ESTIMATED REVENUE SHARE RECOMMENDATION

### Recommended Publisher Revenue Share: 70-75%

### Justification:
1. **EthicalAds** leads at 70% - we should match or beat
2. **Google** is 68% - we need to differentiate
3. **Carbon** estimated 50-60% - we can offer more
4. Being new: Higher share attracts early publishers

### Recommended Payout Structure:
- **Minimum Payout:** $25 (lower than EthicalAds' $50, competitive with Carbon)
- **Payment Schedule:** Net-30 or faster (Net-15 for premium publishers)
- **Methods:** PayPal, Stripe Connect, Crypto (Web3-friendly for agent community)

### Estimated Publisher CPM:
- **Target:** $2.00-$3.00 CPM for agent-focused sites
- **Higher rates:** AI/ML content commands premium advertiser pricing
- **Geographic:** North America/Europe = higher CPM

---

## STRATEGIC RECOMMENDATIONS

### Short Term (MVP)
1. **Match EthicalAds** on transparency (70% share, open source optional)
2. **Lower barrier** than EthicalAds (accept 10K+ pageviews)
3. **Script tag first** - easiest integration
4. **Single ad format** - native text/image (clean, non-spammy)

### Medium Term
1. **Build self-serve** dashboard (Carbon/EthicalAds missing this)
2. **API-first approach** for agent integrations (differentiator)
3. **Build advertiser marketplace** (like BuySellAds self-serve)
4. **Acceptable Ads** certification (reduce ad blocking)

### Long Term
1. **Open source the ad server** (EthicalAds path - builds trust)
2. **Multiple ad formats** (beyond just native)
3. **Premium managed tier** for large publishers (Carbon model)
4. **Agent-native ad experiences** (ads as agent recommendations)

---

## KEY TAKEAWAYS

1. **The market exists** - Carbon ($120M paid) and EthicalAds prove developers will monetize
2. **Privacy is differentiating** - No-cookie, GDPR-compliant is table stakes now
3. **Transparency wins trust** - 70% revenue share and open source code builds publisher loyalty
4. **AI agent vertical is untapped** - No one specifically targets agent developers
5. **Lower barriers = growth** - Accepting smaller publishers helps ecosystem grow
6. **Integration simplicity matters** - Script tag is minimum, API is differentiator

---

*Report compiled through direct website research of all competitors*
*Sources: carbonads.net, ethicalads.io, buysellads.com, google.com/adsense, kevel.com, broadstreetads.com*
