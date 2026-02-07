# 📱 Discord Channel Reference (Source of Truth)

**Critical Rule:** Always use `channel:ID` format, never `#channel-name`

---

## ✅ Verified Channel IDs

| Channel | ID | Purpose | Tested |
|---------|-----|---------|--------|
| **#daily** | `1468727937145766048` | Hourly/daily status reports, health checks | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#todo** | `1469033196644602165` | Active TODOs and priorities | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#pantry-pal-team** | `1468829696492830862` | Venture #1 team coordination | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#remy-finance-team** | `1468829697365381120` | Venture #2 team channel | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#sleep-stories-team** | `1468829698216956028` | Sleep Stories YouTube channel — content pipeline, video production, upload scheduling | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#agentads-team** | `1468829699135377480` | AgentAds venture team — AI agent advertising network, MVP sprint | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#executive** | `1468829699932291083` | CEO + COO private channel — strategic decisions, venture pivots | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#briefings** | `1468833087004741655` | Daily audio briefings — 2-3 min voice TL;DR for CEOs | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#awesome-openclaw** | `1468861843396235469` | 🌟 Automated updates every 4hrs. New skills, tools, community finds. Curation bot in action. | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#remy-blog-team** | `1468846895232319737` | 📝 Daily blog venture. Remy's POV on AI teamwork, learnings, goals. | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#general** (DM) | `1468265485031182491` | Direct 1-on-1 with thindery | ✅ **2026-02-05 22:09 CST** — CONFIRMED |
| **#general** (Guild) | `1468097156324917321` | General chat in thindery's server | ✅ **2026-02-05 22:09 CST** — CONFIRMED |

**Verified Messages (Batch Test 2026-02-05 22:09 CST):**
- #daily: `1469182818062958592`
- #todo: `1469182819631759433`
- #pantry-pal-team: `1469182821083119723`
- #remy-finance-team: `1469182822353998009`
- #sleep-stories-team: `1469182823788445738`
- #agentads-team: `1469182824778301554`
- #executive: `1469182826233724958`
- #briefings: `1469182827265527818`
- #awesome-openclaw: `1469182828582277132`
- #remy-blog-team: `1469182830092484851`
- #general (DM): `1469182831594049723`
- #general (Guild): `1469182832856535216`

**All 12 channels: 100% delivery rate ✅**

---

## 🚫 NEVER USE (Doesn't Work)

- ❌ `#daily` — Unknown target error
- ❌ `#todo` — Use ID `1469033196644602165`
- ❌ Channel names without `channel:` prefix

**Correct Format:** `channel:1468727937145766048`

---

## 📝 Cron Job Rules

All cron jobs posting to Discord MUST:

```json
{
  "delivery": {
    "mode": "announce",
    "channel": "discord",
    "to": "channel:1468727937145766048"
  }
}
```

**Common Mistakes:**
- Using `"to": "#daily"` → ❌ FAILS
- Using `"to": "daily"` → ❌ FAILS
- Missing `channel:` prefix → ❌ FAILS

---

## 🔧 Active Cron Jobs (Target #daily)

### hourly-pm-checkin
**Posts to:** #daily (`1468727937145766048`)
**Schedule:** Every hour (top of hour)
**Purpose:** PM status check on all ventures

### openclaw-health-hourly
**Posts to:** #daily (`1468727937145766048`)
**Schedule:** Every hour (top of hour)
**Purpose:** Gateway health monitoring

### daily-morning-standup
**Posts to:** #daily (`1468727937145766048`)
**Schedule:** 7 AM CST
**Purpose:** Day planning and priorities

---

## 📊 Channel Inventory

### Created ✅:
- [x] #daily — `1468727937145766048`
- [x] #remy-blog-team — `1468846895232319737` (Venture #7)
- [x] #todo — `1469033196644602165`
- [x] #pantry-pal-team — `1468829696492830862`
- [x] #remy-finance-team — `1468829697365381120`
- [x] #sleep-stories-team — `1468829698216956028`
- [x] #agentads-team — `1468829699135377480`
- [x] #executive — `1468829699932291083`
- [x] #briefings — `1468833087004741655`

---

## 🎯 Testing Protocol

**Before finalizing any channel reference:**
1. Manual test post: `message action=send target="1468727937145766048"`
2. Verify message appears in Discord
3. Document the ID with timestamp
4. Use ONLY this documented format

---

## ⚠️ Critical Notes

| Issue | Discovery Date | Solution |
|-------|---------------|----------|
| Channel names don't work | 2026-02-05 | Use `channel:ID` format |
| Isolated sessions fail silently | 2026-02-05 | Use `sessionTarget: main` |
| File had wrong data | 2026-02-05 21:44 | Corrected and verified |

---

**Source of Truth:** This file
**Last Updated:** 2026-02-05 22:09 CST
**Verified By:** Mass test to all 12 channels — 100% delivery confirmed by thindery
**Status:** ✅ FULLY VERIFIED and OPERATIONAL 🦞📱
