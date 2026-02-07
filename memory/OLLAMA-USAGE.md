# Ollama Cloud Usage — Reference

**Last Updated:** 2026-02-06  
**Status:** User corrected my understanding — documenting for future reference

---

## ✅ Correct Configuration (Locked In Memory)

**Service:** Ollama Cloud (cloud-hosted, NOT local)  
**Model:** `ollama/kimi-k2.5:cloud`  
**Cost:** $20/month subscription  
**Usage Caps:**
- Every 3 hours: [cap limit TBD]
- Every 7 days: [cap limit TBD]

**OpenClaw Runtime Shows:**
```
model=ollama/kimi-k2.5:cloud
```

---

## 🔍 Usage Checking

**Current Limitation:** I do not have API access to fetch your Ollama Cloud usage dashboard.

**To check usage, thindery should:**
1. Visit https://ollama.com/account or https://ollama.com/dashboard
2. Log in with Ollama account
3. View usage/quota section

**What I can track:**
- Approximate requests per session (if logged)
- Model response times
- Success/failure rates

**What I cannot access:**
- Real-time quota remaining
- 3-hour window usage
- 7-day rolling usage
- Billing dashboard

---

## 📝 Future Improvement

If Ollama Cloud exposes a usage API endpoint, we could:
- Add a skill to query remaining quota
- Alert when approaching 3-hour or 7-day caps
- Switch to fallback model automatically when capped

**Todo:** Research if Ollama Cloud has a usage API or webhook for quota alerts.

---

## ⚠️ Correction Log

**My Error:** Initially said "Ollama has no usage limits — it's local"
**Reality:** User is on Ollama Cloud ($20/mo) with defined caps
**Lesson:** Always verify local vs cloud deployment mode
