# OpenClaw Log Monitoring Setup

## Date: 2026-02-05
## Status: ✅ Configured & Active

---

## What Was Fixed

### Problem
- OpenClaw was using Gemini API for memory embeddings
- Gemini was hitting rate limits (429 Resource Exhausted errors)
- This caused slowdowns, Discord listener delays (30-313 seconds), and required restarts

### Solution Applied
- ✅ Configured memory embeddings to use Ollama via OpenAI-compatible API
- ✅ Pulled `nomic-embed-text:latest` model (274 MB) to Ollama
- ✅ Gateway restarted with new config

**Config change:**
```json
"memorySearch": {
  "provider": "openai",
  "remote": {
    "baseUrl": "http://127.0.0.1:11434/v1",
    "apiKey": "ollama-local"
  },
  "fallback": "none"
}
```

---

## Model Usage Summary (Now)

| Purpose | Model | Location |
|---------|-------|----------|
| Main chat | kimi-k2.5:cloud | Ollama |
| Embeddings | nomic-embed-text | Ollama |
| Fallback | gemini-3-flash-preview | Google Cloud |

**Result:** 100% local embedding processing, no more rate limits!

---

## Installed Monitoring Skills

1. ✅ **log-tail** - Stream systemd logs
2. ✅ **clawdbot-logs** - Analyze OpenClaw logs
3. ✅ **uptime-monitor** - Track gateway uptime/dead events

---

## Hourly Log Analysis Cron Job

**Job ID:** `openclaw-health-hourly`
**Schedule:** Every hour
**Target:** #daily
**Purpose:** Detect errors/fatal issues before they cause failures

---

## Troubleshooting Session Log

### Issues Found in gateway.err.log (Feb 5, 2025)
1. Slow Discord Listener - 30-313 second message processing delays
2. Gemini 429 rate limit errors
3. WebSocket disconnections
4. Missing file errors (x_delete.py, REMY-TODO.md)
5. Tool exec failures (edit, read without path)

### Root Cause
Gemini embedding API quota exhaustion was causing the memory system to fall back to non-batch mode, slowing everything down.

### Resolution
Switched embeddings to local Ollama - no more API limits!

---

## Ollama Models Status
- ✅ qwen2.5:7b-instruct (for kimi-k2.5:cloud alias)
- ✅ nomic-embed-text:latest (embeddings)
- ✅ llama3.1:8b (backup)

---

**Next Steps:**
1. Monitor Discord response times over next hour
2. Add more Ollama models for diversity
3. Document this pattern for future reference
