# X/Twitter API Free/Cheap Alternatives Research
**Research Date:** February 20-21, 2026  
**Due:** 7AM CST February 21, 2026  
**Task:** Find <$10/mo solutions for Twitter read/search functionality

---

## Executive Summary

**Current X Official API Pricing:**
- Basic Tier: $100/month (LEGACY - being phased out)
- New Pay-per-usage: Credit-based, no monthly subscription. Monthly cap of 2M Post reads
- Per-endpoint pricing varies (exact rates in Developer Console)
- Enterprise: Custom pricing for high volume

**Verdict:** For <$10/mo budget, official X API is NOT viable. Need alternatives.

---

## Options Ranked by Criteria

### 1. Nitter (Public Instances) ⭐ TOP RECOMMENDATION

**Cost:** FREE ($0)

**Reliability:** Medium-High
- Multiple public instances available
- Main instances: nitter.net (NL), xcancel.com (US), nitter.poast.org (US), nitter.privacyredirect.com (FI)
- Status monitoring: https://status.d420.de
- Instances go down occasionally but community maintains alternatives
- Requires real accounts to run (for self-hosting)

**Search Quality:** High
- Full-text search capability
- User timelines, hashtags, keyword search
- RSS feeds available: `nitter.net/{username}/rss`
- JSON API-like responses
- No JavaScript required

**Risk:** Low-Medium
- **Read-only** (no posting)
- **Privacy-focused**: No ads, no tracking, no JavaScript
- Terms of Service consideration: Uses unofficial API
- Risk primarily to instances (not end users)
- Self-hosted: Risk of account ban if detected

**Pros:**
- Completely free
- No API keys needed
- Fast and lightweight
- RSS output for any user/timeline
- GDPR/privacy compliant approach

**Cons:**
- Instance reliability varies
- Rate limits unknown (server-side)
- Not officially supported by X
- May require switching instances occasionally

**Quick Implementation:**
```bash
# RSS feed for any user
curl https://nitter.net/elonmusk/rss

# Search via web scrape (JSON-like)
curl https://nitter.net/search?f=tweets&q=keyword
```

---

### 2. Twscrape (Python Library)

**Cost:** FREE (open source) + proxy costs if needed (~$5-10/mo recommended)

**Reliability:** Medium
- Requires own Twitter/X accounts (can buy aged accounts ~$1-5 each)
- Automatic account rotation
- Proxy recommended for reliability ($5-10/mo)
- Self-hosted solution

**Search Quality:** High
- Full search API (Top, Latest, Media tabs)
- User profiles, followers/following
- Tweet details, replies, retweeters
- Trends by location
- List timelines
- Returns structured JSON data

**Risk:** Medium-High ⚠️
- **Requires real X accounts** - accounts can be banned
- Uses unofficial GraphQL endpoints
- Violates X Terms of Service
- Multiple accounts increase detection risk
- Recommended: Use proxies, rotate accounts

**Pros:**
- Full programmatic access
- Async/parallel requests
- Account pool management
- CLI and Python library
- No API limits (limited by account pool size)

**Cons:**
- Account ban risk
- Requires technical setup
- Need account acquisition strategy
- Proxy costs add up

**Quick Implementation:**
```python
pip install twscrape

from twscrape import API, gather

api = API()
# Add accounts with cookies or login
tweets = await gather(api.search("pantry recipes", limit=100))
```

---

### 3. SNSCache (snscrape)

**Cost:** FREE (open source)

**Reliability:** Medium
- Pure scraper (no account needed for basic features)
- Command-line tool
- Python 3.8+ required
- No account authentication for read-only

**Search Quality:** High
- Users, hashtags, searches (live/top tweets)
- JSONL output with full tweet data
- CLI interface

**Risk:** Low-Medium
- Read-only scraper
- No account = lower ban risk
- Still violates ToS technically
- Fairly passive approach

**Pros:**
- No account required
- Mature, stable project
- Lightweight
- Good for archiving

**Cons:**
- CLI only (no library docs)
- No real-time streaming
- May break with X UI changes

**Quick Implementation:**
```bash
pip install snscrape
snscrape --jsonl --max-results 100 twitter-search "pantry recipes" > tweets.jsonl
```

---

### 4. X Premium ($8/mo)

**Cost:** $8/month

**Reliability:** High
- Official X platform
- No ban risk
- Stable access

**Search Quality:** Medium-High
- Better search than free tier
- Advanced search operators
- **BUT: Does NOT include API access**
- No programmatic access
- Manual interface only

**Risk:** None (official)

**Verdict:** ❌ NOT SUITABLE for programmatic needs. Premium gives better search UI but zero API access. API is completely separate product now.

---

### 5. RSS.app / RSS Aggregators

**Cost:** Freemium (~$10-15/mo for paid tiers)

**Reliability:** Medium
- Third-party service
- Subject to their uptime
- Free tier limits: 1 feed, limited updates

**Search Quality:** Low
- User timeline feeds only
- No full-text search
- No keyword/hashtag search

**Risk:** Low
- Uses official methods where possible
- Service reliability dependent

**Verdict:** ❌ NOT SUITABLE for search needs. Good for following specific accounts only.

---

### 6. Social Bearing / Aggregator Platforms

**Cost:** Various (most shut down or costly)

**Search Quality:** Medium
- **Major Issue:** Social Bearing SHUT DOWN
- Statement: "Due to unaffordable Twitter API pricing since Elon took over, Socialbearing is no longer operational"
- Many similar tools have closed

**Verdict:** ❌ NOT RELIABLE - Industry contraction due to API pricing

---

### 7. Academic/Research Access

**Cost:** FREE (for verified researchers)

**Reliability:** High (if approved)
- Requires academic affiliation
- Research proposal required
- Manual application process

**Search Quality:** High
- Full archive access
- Historical data
- Academic-grade tools

**Risk:** None (official)

**Verdict:** ❌ NOT PRACTICAL for Pantry-Pal. Requires institutional affiliation and research justification.

---

## Comparison Matrix

| Option | Cost | Reliability | Search Quality | Risk | Programmatic |
|--------|------|-------------|------------------|------|--------------|
| **Nitter (Public)** | FREE | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Via RSS/Scrape |
| **Twscrape** | ~$5-10/mo* | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **SNScrape** | FREE | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **X Premium** | $8/mo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ None |
| **X Official API** | $100+/mo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Academic** | FREE | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

*Proxy + optional account costs

---

## 🏆 TOP RECOMMENDATION for Pantry-Pal

**Primary Choice: Nitter Public Instances**

**Why:**
1. **Zero cost** - Absolutely free
2. **Read-only search** - Perfect for recipe/ingredient discovery use case
3. **RSS support** - Easy integration: `nitter.net/{user}/rss`
4. **Low risk** - No accounts to manage, no ban risk for user
5. **Good reliability** - Multiple instances, easy fallback

**Implementation:**
```python
# Simple RSS feed integration
import feedparser

def get_user_tweets(username):
    feed = feedparser.parse(f'https://nitter.net/{username}/rss')
    return feed.entries

# For search, scrape nitter search pages
# Parse HTML or use JSON-like endpoints if available
```

---

## 🥈 SECONDARY RECOMMENDATION

**Twscrape with Budget Proxies**

**For:** If you need more than read-only (though Pantry-Pal likely doesn't)

**Setup:**
- Cost: ~$5-10/month for rotating proxies
- 2-3 aged X accounts (~$3-15 one-time)
- Self-hosted Python application

---

## ⚠️ WARNINGS: OPTIONS THAT COULD GET BANNED

### High Risk (Account Ban Likely if Detected):
1. **Twscrape** - Uses real accounts, violates ToS Section 4 (automated access)
2. **Any account-based scraper** - Multiple accounts increases risk
3. **Self-hosted Nitter** - Requires real accounts, similar ban risk

### Lower Risk:
1. **Public Nitter instances** - Risk is to the instance operator, not the user
2. **SNScrape (without auth)** - Read-only, no account, harder to trace

### ToS Violation Clarification:
- X's Developer Agreement prohibits:
  - Scraping outside API
  - Using multiple accounts to circumvent limits
  - Reverse engineering internal APIs
  - "Aggregating accounts" (Section 4.4)

**Mitigation:**
- Use proxies (residential or rotating datacenter)
- Rate limiting (max 1 req/sec)
- Randomize user agents
- Use aged accounts (not freshly created)
- Monitor for blocks/captchas

---

## Final Decision Matrix

| Use Case | Recommendation | Monthly Cost |
|----------|---------------|--------------|
| **Read-only search + timelines** | Nitter public | $0 |
| **Full API-like programmatic** | Twscrape + proxies | ~$5-10 |
| **Archival/Historical** | SNScrape | $0 |
| **Mission-critical production** | X Official API | $100+ |
| **Academic research** | Academic access | $0 |

---

## Resources

- **Nitter Instances:** https://github.com/zedeus/nitter/wiki/Instances
- **Nitter Status:** https://status.d420.de
- **Twscrape:** https://github.com/vladkens/twscrape
- **SNScrape:** https://github.com/JustAnotherArchivist/snscrape
- **X API Docs:** https://docs.x.com

---

**Research completed:** February 21, 2026 03:31 CST

**Next Steps:** Test Nitter RSS feeds with Pantry-Pal use case. Fallback to Twscrape if more features needed.
