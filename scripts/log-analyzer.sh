#!/bin/bash
# OpenClaw Log Analyzer - Hourly health check
# Runs via cron and generates report

LOG_DIR="$HOME/.openclaw/logs"
REPORT_FILE="$HOME/.openclaw/workspace/temp/log-report-$(date +%Y%m%d-%H%M).txt"
mkdir -p "$HOME/.openclaw/workspace/temp"

echo "=== OpenClaw Log Analysis - $(date) ===" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check for slow listeners (Discord lag)
SLOW_COUNT=$(grep -c "Slow listener detected" "$LOG_DIR/gateway.err.log" 2>/dev/null || echo "0")
if [ "$SLOW_COUNT" -gt 0 ]; then
  echo "⚠️ SLOW LISTENERS: $SLOW_COUNT instances" >> "$REPORT_FILE"
  grep "Slow listener detected" "$LOG_DIR/gateway.err.log" | tail -5 >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

# Check for errors
ERROR_COUNT=$(grep -cE "(ERROR|error:|failed:)" "$LOG_DIR/gateway.err.log" 2>/dev/null || echo "0")
if [ "$ERROR_COUNT" -gt 0 ]; then
  echo "❌ ERRORS FOUND: $ERROR_COUNT instances" >> "$REPORT_FILE"
  grep -E "(ERROR|error:|failed:)" "$LOG_DIR/gateway.err.log" | tail -5 >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

# Check for WebSocket issues
WS_COUNT=$(grep -c "WebSocket was closed" "$LOG_DIR/gateway.err.log" 2>/dev/null || echo "0")
if [ "$WS_COUNT" -gt 0 ]; then
  echo "🔌 WEBSOCKET DROPS: $WS_COUNT instances" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

# Check for API rate limits
RATE_COUNT=$(grep -c "429\|quota\|exhausted" "$LOG_DIR/gateway.err.log" 2>/dev/null || echo "0")
if [ "$RATE_COUNT" -gt 0 ]; then
  echo "⏱️ RATE LIMITS: $RATE_COUNT instances (Gemini API)" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
fi

# Check gateway.log for recent activity
echo "📊 RECENT ACTIVITY (last 10 lines):" >> "$REPORT_FILE"
tail -10 "$LOG_DIR/gateway.log" >> "$REPORT_FILE" 2>/dev/null || echo "No gateway.log" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "=== End Report ===" >> "$REPORT_FILE"

# Output for cron to capture
cat "$REPORT_FILE"
