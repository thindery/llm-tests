# Cron Jobs Backup — 2026-02-06

**Status:** Backed up before deletion due to OpenClaw 2026.2.3-1 scheduler regression
**Bug:** Recurring schedules (`--every`, `--cron`) don't execute — scheduler calculates `nextRunAtMs` correctly but never evaluates `now >= nextRunAtMs`
**One-shot (`--at`) workaround:** Functional but requires `channel:` prefix in `--to` parameter

**Action:** Restore these jobs after OpenClaw releases patch (2026.2.4 or later)

---

## Recurring Jobs (Currently Broken)

### 1. wake-now-test-v2 (1 min)
```bash
openclaw cron add \
  --name "wake-now-test-v2" \
  --every 1m \
  --session isolated \
  --message "🦞 **WAKE NOW TEST V2 — SUCCESS!** Cron is working!" \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 60s
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 2. five-minute-test-v2 (5 min)
```bash
openclaw cron add \
  --name "five-minute-test-v2" \
  --every 5m \
  --session isolated \
  --message "🦞 **5-Min Test V2** — {{current_time}} — Cron system operational" \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 5m
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 3. daily-morning-standup-v2 (7am daily)
```bash
openclaw cron add \
  --name "daily-morning-standup-v2" \
  --every 24h \
  --session isolated \
  --message "🦞 Good morning! Daily Standup — 7am CST. Check REMY-TODO.md, THINDERY-TODO.md, report venture status to #daily." \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 24h (from creation time)
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 4. evening-wrap-up-v2 (7pm daily)
```bash
openclaw cron add \
  --name "evening-wrap-up-v2" \
  --cron "0 19 * * *" \
  --tz America/Chicago \
  --session isolated \
  --message "🌆 Evening Wrap-Up — 7pm CST. Review wins, blockers, tomorrow priorities. Post to #daily." \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: 0 19 * * * (7pm CST daily)
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 5. hourly-status-v2 (hourly)
```bash
openclaw cron add \
  --name "hourly-status-v2" \
  --every 1h \
  --session isolated \
  --message "🦞 Hourly status check — checking all 5 ventures." \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 1h
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 6. hourly-pulse-v2 (hourly)
```bash
openclaw cron add \
  --name "hourly-pulse-v2" \
  --every 1h \
  --session isolated \
  --message "🦞 Hourly pulse check — Ventures: All systems nominal." \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 1h
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 7. openclaw-daily-version-check-v2 (12h)
```bash
openclaw cron add \
  --name "openclaw-daily-version-check-v2" \
  --every 12h \
  --session isolated \
  --message "🦞 Daily OpenClaw Update: Check version, run update if needed, report to #daily." \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 12h
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 8. remy-todo-review-v2 (24h)
```bash
openclaw cron add \
  --name "remy-todo-review-v2" \
  --every 24h \
  --session isolated \
  --message "🦞 Daily Todo Review: Check REMY-TODO.md and SKILLS-TODO.md, prioritize items, post needs to #daily." \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 24h
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 9. reddit-fix-test-v2 (2 min)
```bash
openclaw cron add \
  --name "reddit-fix-test-v2" \
  --every 2m \
  --session isolated \
  --message "🦞 **Reddit Fix Test V2** — If you see this, the timestamp fix worked!" \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468727937145766048"
```
Schedule: every 2m
Channel: #daily
Status: ❌ Stopped (backed up & removed)

### 10. awesome-openclaw-updater-v2 (hourly)
```bash
openclaw cron add \
  --name "awesome-openclaw-updater-v2" \
  --every 1h \
  --session isolated \
  --message "🤖 Awesome-OpenClaw Hourly Update: Scan clawhub/GitHub for new skills, update README, commit/push if changes found. Post to #awesome-openclaw." \
  --model ollama/kimi-k2.5:cloud \
  --announce \
  --channel discord \
  --to "channel:1468861843396235469"
```
Schedule: every 1h
Channel: #awesome-openclaw
Status: ❌ Stopped (backed up & removed)

---

## One-Shot Jobs (Executed & Auto-Deleted or Pending)

These were created as workarounds. The ones with `lastStatus: error` failed due to Discord format (missing `channel:` prefix). Pending ones may still execute.

### awesome-updater-oneshot (executed, errored)
- Fired at: 1770427613430
- Error: Ambiguous Discord recipient (needs `channel:` prefix)
- Status: Executed but delivery failed

### hourly-status-oneshot (executed, errored)
- Fired at: 1770427665180
- Error: Ambiguous Discord recipient
- Status: Executed but delivery failed

### hourly-pulse-oneshot (executed, errored)
- Fired at: 1770427686687
- Error: Ambiguous Discord recipient
- Status: Executed but delivery failed

### evening-wrapup-oneshot (executed, errored)
- Fired at: 1770427762761
- Error: Ambiguous Discord recipient
- Status: Executed but delivery failed

### version-check-oneshot (executed, errored)
- Fired at: 1770427766295
- Error: Ambiguous Discord recipient
- Status: Executed but delivery failed

### todo-review-oneshot (pending)
- Scheduled: 2026-02-07T01:27:44.628Z
- Status: Pending (may have fired)

### morning-standup-oneshot (pending)
- Scheduled: 2026-02-07T01:27:45.705Z
- Status: Pending (may have fired)

### wake-now-oneshot (executed, errored)
- Fired at: 1770427769076
- Error: Ambiguous Discord recipient
- Status: Executed but delivery failed

### reddit-fix-oneshot (executed, errored)
- Fired at: 1770427779726
- Error: Ambiguous Discord recipient
- Status: Executed but delivery failed

### five-minute-oneshot (pending)
- Scheduled: 2026-02-07T01:28:48.938Z
- Status: Pending (may have fired)

### simple-test-correct (pending — has channel: prefix)
- Scheduled: 2026-02-07T01:28:34.124Z
- Has: `to: "channel:1468727937145766048"`
- Status: Pending (may fire correctly)

---

## Raw JSON Backup

Full jobs.json preserved below:

```json
{
  "version": 1,
  "jobs": [
    {
      "id": "ecda2c24-e73a-4c4c-a9e7-0cbb818eb08d",
      "name": "wake-now-test-v2",
      "enabled": true,
      "createdAtMs": 1770408100558,
      "updatedAtMs": 1770408144175,
      "schedule": {
        "kind": "every",
        "everyMs": 60000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 **WAKE NOW TEST V2 — SUCCESS!** Cron is working!",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770427849788
      }
    },
    {
      "id": "0404f10a-ce59-4dd2-bb77-4b6dd2d148b9",
      "name": "five-minute-test-v2",
      "enabled": true,
      "createdAtMs": 1770408111578,
      "updatedAtMs": 1770408144182,
      "schedule": {
        "kind": "every",
        "everyMs": 300000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 **5-Min Test V2** — {{current_time}} — Cron system operational",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770428089788
      }
    },
    {
      "id": "dc11772d-18c2-4936-a5fa-4d7e2ae8d253",
      "name": "daily-morning-standup-v2",
      "enabled": true,
      "createdAtMs": 1770408125847,
      "updatedAtMs": 1770408144189,
      "schedule": {
        "kind": "every",
        "everyMs": 86400000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 Good morning! Daily Standup — 7am CST. Check REMY-TODO.md, THINDERY-TODO.md, report venture status to #daily.",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770514189788
      }
    },
    {
      "id": "b54dc049-9414-4480-8ffd-bfac88ebe1e7",
      "name": "evening-wrap-up-v2",
      "enabled": true,
      "createdAtMs": 1770408126995,
      "updatedAtMs": 1770408144151,
      "schedule": {
        "kind": "cron",
        "expr": "0 19 * * *",
        "tz": "America/Chicago"
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🌆 Evening Wrap-Up — 7pm CST. Review wins, blockers, tomorrow priorities. Post to #daily.",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770512400000
      }
    },
    {
      "id": "033459f8-254e-44e4-be27-a26b3e0ecf47",
      "name": "hourly-status-v2",
      "enabled": true,
      "createdAtMs": 1770408128095,
      "updatedAtMs": 1770408144165,
      "schedule": {
        "kind": "every",
        "everyMs": 3600000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 Hourly status check — checking all 5 ventures.",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770431389788
      }
    },
    {
      "id": "ff5bc455-61b0-413c-b135-6f32aa4486d1",
      "name": "hourly-pulse-v2",
      "enabled": true,
      "createdAtMs": 1770408213983,
      "updatedAtMs": 1770408213983,
      "schedule": {
        "kind": "every",
        "everyMs": 3600000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 Hourly pulse check — Ventures: All systems nominal.",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770431389788
      }
    },
    {
      "id": "520969c7-94d6-431d-a4a6-df150fdba025",
      "name": "openclaw-daily-version-check-v2",
      "enabled": true,
      "createdAtMs": 1770408215077,
      "updatedAtMs": 1770408215077,
      "schedule": {
        "kind": "every",
        "everyMs": 43200000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 Daily OpenClaw Update: Check version, run update if needed, report to #daily.",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770470989788
      }
    },
    {
      "id": "5b8dee82-5fe3-4251-87c4-45a9c57bc8f0",
      "name": "remy-todo-review-v2",
      "enabled": true,
      "createdAtMs": 1770408216168,
      "updatedAtMs": 1770408216168,
      "schedule": {
        "kind": "every",
        "everyMs": 86400000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 Daily Todo Review: Check REMY-TODO.md and SKILLS-TODO.md, prioritize items, post needs to #daily.",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770514189788
      }
    },
    {
      "id": "55ced0d9-99a4-4db4-8087-addb197f1f17",
      "name": "reddit-fix-test-v2",
      "enabled": true,
      "createdAtMs": 1770408217264,
      "updatedAtMs": 1770408217264,
      "schedule": {
        "kind": "every",
        "everyMs": 120000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🦞 **Reddit Fix Test V2** — If you see this, the timestamp fix worked!",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468727937145766048"
      },
      "state": {
        "nextRunAtMs": 1770427909788
      }
    },
    {
      "id": "7f8289e9-22fa-4d28-b9db-6ea48eb8a785",
      "name": "awesome-openclaw-updater-v2",
      "enabled": true,
      "createdAtMs": 1770408218380,
      "updatedAtMs": 1770408218380,
      "schedule": {
        "kind": "every",
        "everyMs": 3600000
      },
      "sessionTarget": "isolated",
      "wakeMode": "next-heartbeat",
      "payload": {
        "kind": "agentTurn",
        "message": "🤖 Awesome-OpenClaw Hourly Update: Scan clawhub/GitHub for new skills, update README, commit/push if changes found. Post to #awesome-openclaw.",
        "model": "ollama/kimi-k2.5:cloud"
      },
      "delivery": {
        "mode": "announce",
        "channel": "discord",
        "to": "1468861843396235469"
      },
      "state": {
        "nextRunAtMs": 1770431389788
      }
    }
  ]
}
```

---

## Restoration Instructions

**When OpenClaw 2026.2.4+ is released:**

1. Check update availability: `openclaw update check`
2. Apply update: `openclaw update run` (needs approval)
3. Verify version: `openclaw -V`
4. Recreate jobs using CLI commands above (with `channel:` prefixes)

**Alternative:** If cron tool API is fixed, can recreate via tool calls with full JSON from backup above.

---

## Related Issues

- Discord channel format: Must use `channel:1468727937145766048` not `1468727937145766048`
- One-shot (`--at`) works but recurring (`--every`, `--cron`) broken in 2026.2.3-1
- Bug report: https://www.answeroverflow.com/m/1469255006610788517 (confirmed pattern)

---

**Backup created:** 2026-02-06 19:28 CST  
**OpenClaw version:** 2026.2.3-1 (buggy)  
**Expected fix version:** 2026.2.4+  
**Total jobs backed up:** 21 (10 recurring + 11 one-shot)
