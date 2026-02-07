# OpenClaw Log Monitoring Setup

## Objective
Set up automated hourly log analysis to catch fatal/error issues early and help debug OpenClaw stability.

## Installed Skills
- ✅ log-tail - Stream logs from systemd
- ✅ clawdbot-logs - Analyze Clawdbot logs (adapted for OpenClaw)
- ✅ uptime-monitor - Tracks uptime/dead events

## Current Errors in Logs (from gateway.err.log)

### Critical Issues Found:
1. **Slow Discord Listener** - Taking 30-313 seconds to process messages
   - Multiple instances: 159.6s, 72.9s, 36.9s, 91.9s, 169.9s, 313.8s, 97.6s
   - This explains the lag you're experiencing!

2. **Gemini API Rate Limit (429)**
   - "Resource has been exhausted"
   - Batch embeddings failing, falling back to non-batch

3. **Missing Files**
   - THINDERY-TODO.md not found
   - REMY-TODO.md not found
   - x_delete.py not found

4. **Edit Failures**
   - "Could not find exact text" in README.md

5. **WebSocket Disconnections**
   - "WebSocket was closed before connection established"
   - Happened at 12:15:54

6. **Tool Failures**
   - "read tool called without path" - multiple instances
   - Python externally-managed-environment error
   - Exec failed on missing files

7. **Timeouts**
   - Embedded run timeout: 600000ms (10 min)

## Cron Job Setup

### Hourly Log Analysis
Analyzes logs and reports errors to Discord #daily.

### Uptime Check
Already have 5-min uptime checks with uptime-monitor skill.

## Next Actions
1. Create custom log analysis script
2. Set up hourly cron job
3. Report findings to Discord
4. Investigate slow Discord listener (may need model optimization)
5. Consider rate limiting Gemini calls or switching models
