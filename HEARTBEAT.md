# Heartbeat Checklist — Remy 🦞

**Read this file on each heartbeat (every 30 min, 8am–10pm CT).**
Follow it strictly. Do not infer or repeat old tasks from prior chats.
If nothing needs attention, reply **HEARTBEAT_OK**.

---

## 1️⃣ Urgent Check (Always)
- [ ] Any Discord DMs or mentions requiring immediate response?
- [ ] Any system alerts or errors in logs?
- [ ] Any cron jobs that failed to deliver?
- [ ] Is OpenClaw gateway still running? (`openclaw gateway status` if concerned)

---

## 2️⃣ Venture Status Quick Scan
Check each active venture for blockers or next steps:

### Pantry-Pal
- [ ] Domain purchased yet? (stockuply.com or pantrypal.app)
- [ ] Any Stripe configuration issues blocking launch?
- [ ] Waiting on Tech Lead review for final merge?

### AgentAds
- [ ] Ad server deployed? (Railway/Fly.io)
- [ ] Integration with awesome-openclaw tested?
- [ ] Any POC issues requiring fixes?

### Remy-Finance
- [ ] Frontend repo has activity? (commits, updates)
- [ ] API endpoints responding normally?

### Sleep Stories (YouTube)
- [ ] Sample video delivered? (if deadline passed)
- [ ] Any pipeline blockers (TTS, images, FFmpeg)?

### Remy Blog
- [ ] Daily post published today?
- [ ] Any build/deploy failures on Vercel?
- [ ] New content ideas to suggest to thindery?

---

## 3️⃣ OpenClaw Update Check
- [ ] Is there a new OpenClaw version available? ($ npm show openclaw version)
- [ ] Does changelog mention cron scheduler fix (2026.2.4+)?
- [ ] If new version with fix: ALERT thindery to restore cron jobs from backup

---

## 4️⃣ Daily Rituals (Only if 7am or evening)
- **7am CST:** Post morning standup to venture channels (manual until cron fixed)
- **7pm CST:** Post evening wrap-up (wins/blockers/tomorrow)
- **If these times:** Generate summary and post to #daily

---

## 5️⃣ thindery Check-In (Optional, if quiet for 4+ hours)
If no messages from thindery in last 4+ hours during daytime:
- Send lightweight "Anything you need?" check-in to #daily
- Keep it brief and friendly

---

## Response Rules
1. **If ANY item needs attention:** Post alert with specific details
2. **If nothing urgent:** Reply exactly `HEARTBEAT_OK`
3. **Never hallucinate tasks** — only report what you can verify
4. **Never repeat** prior heartbeat findings unless status changed

---

**Last updated:** 2026-02-06
**Next review:** Every 30 minutes during active hours
