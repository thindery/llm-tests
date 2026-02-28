#!/bin/bash
# Remy-Tracker Health Check Script
# Returns 0 if healthy, 1 if restart needed

DEV_URL="http://localhost:3474"
API_URL="${DEV_URL}/api/tickets"
RESTART_SCRIPT="$HOME/projects/remy-tracker/restart-dev.sh"
LOG_FILE="$HOME/logs/remy-tracker-health.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Retry check 3 times with delay (to handle compilation jitter)
for i in 1 2 3; do
    # Check API endpoint (not static chunks - they 404 during recompile)
    if curl -sf "$API_URL" > /dev/null 2>&1; then
        echo "$(date): ✅ Dev server healthy" >> "$LOG_FILE"
        exit 0
    fi
    
    # If first two attempts fail, wait before retry
    if [ $i -lt 3 ]; then
        sleep 2
    fi
done

# All retry attempts failed - restart needed
echo "$(date): ❌ Dev server unhealthy after 3 retries, restarting..." >> "$LOG_FILE"

# Run restart script if it exists
if [ -f "$RESTART_SCRIPT" ]; then
    bash "$RESTART_SCRIPT" >> "$LOG_FILE" 2>&1
    echo "$(date): 🔄 Restart complete" >> "$LOG_FILE"
else
    echo "$(date): ⚠️ Restart script not found at $RESTART_SCRIPT" >> "$LOG_FILE"
    exit 1
fi
