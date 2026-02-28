#!/bin/bash
# ralph-watch.sh - Watch/heartbeat mode for phase tracking
# Usage: ./ralph-watch.sh --ticket=TICKET [--repo=PATH] [--interval=30]
#
# Runs in daemon mode, periodically checking phase status
# and auto-completing when criteria met

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_COMPLETE="${SCRIPT_DIR}/ralph-auto-complete.sh"
RECOVERY="${SCRIPT_DIR}/ralph-recovery.sh"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TICKET=""
REPO_PATH="${PWD}"
INTERVAL=30
PIDFILE="/tmp/ralph-watch-${USER}.pid"
LOGFILE="${HOME}/.openclaw/workspace/logs/ralph-watch.log"

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --ticket=*)
            TICKET="${1#*=}"
            shift
            ;;
        --ticket)
            TICKET="$2"
            shift 2
            ;;
        --repo=*)
            REPO_PATH="${1#*=}"
            shift
            ;;
        --repo)
            REPO_PATH="$2"
            shift 2
            ;;
        --interval=*)
            INTERVAL="${1#*=}"
            shift
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --status)
            show_status
            exit 0
            ;;
        --stop)
            stop_watch
            exit 0
            ;;
        --daemon)
            run_daemon
            exit 0
            ;;
        --help|-h)
            cat <<'EOF'
🦞 Ralph Watch Daemon

Continuously monitors ticket phase and auto-completes when ready.

Usage:
  ./ralph-watch.sh --ticket=TICKET [options]     Start watching
  ./ralph-watch.sh --status                       Show status
  ./ralph-watch.sh --stop                         Stop daemon

Options:
  --ticket=TICKET      Ticket to watch
  --repo=PATH          Repository path (default: current dir)
  --interval=SECONDS   Check interval (default: 30)
  --daemon             Run as daemon (internal use)

Examples:
  # Start watching
  ./ralph-watch.sh --ticket=REMY-042
  
  # Background mode
  ./ralph-watch.sh --ticket=REMY-042 &
  
  # Check status
  ./ralph-watch.sh --status
  
  # Stop
  ./ralph-watch.sh --stop

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Show status
show_status() {
    if [ -f "$PIDFILE" ]; then
        local pid
        pid=$(cat "$PIDFILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}🦞 Ralph Watch is running${NC} (PID: $pid)"
            echo "   Log: $LOGFILE"
            if [ -f "$LOGFILE" ]; then
                echo "   Last 10 lines:"
                tail -10 "$LOGFILE" 2>/dev/null | sed 's/^/   /' || true
            fi
        else
            echo -e "${YELLOW}⚠️  Stale PID file found${NC}"
            rm -f "$PIDFILE"
        fi
    else
        echo "🦞 Ralph Watch is not running"
    fi
}

# Stop watch
stop_watch() {
    if [ -f "$PIDFILE" ]; then
        local pid
        pid=$(cat "$PIDFILE" 2>/dev/null)
        if [ -n "$pid" ]; then
            echo "Stopping Ralph Watch (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            rm -f "$PIDFILE"
            echo -e "${GREEN}✅ Stopped${NC}"
        fi
    else
        echo "Ralph Watch is not running"
    fi
}

# Run daemon
run_daemon() {
    mkdir -p "$(dirname "$LOGFILE")"
    
    echo "Starting Ralph Watch daemon..." >> "$LOGFILE"
    echo "Ticket: $TICKET" >> "$LOGFILE"
    echo "Repo: $REPO_PATH" >> "$LOGFILE"
    
    while true; do
        # Run recovery every 5 cycles
        if [ $(date +%s) % 300 -lt $INTERVAL ]; then
            "$RECOVERY" --max-age=5 >> "$LOGFILE" 2>&1 || true
        fi
        
        # Run auto-complete
        if "$AUTO_COMPLETE" --ticket="$TICKET" --repo="$REPO_PATH" --strict; then
            echo "$(date): Auto-complete successful! Exiting." >> "$LOGFILE"
            rm -f "$PIDFILE"
            exit 0
        fi
        
        echo "$(date): Criteria not met, waiting..." >> "$LOGFILE"
        sleep "$INTERVAL"
    done
}

# Start daemon
start_daemon() {
    # Validate
    if [ -z "$TICKET" ]; then
        echo "Ticket required. Use --ticket=TICKET"
        exit 1
    fi
    
    # Check if already running
    if [ -f "$PIDFILE" ]; then
        local pid
        pid=$(cat "$PIDFILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}Ralph Watch already running (PID: $pid)${NC}"
            exit 1
        fi
    fi
    
    echo -e "${BLUE}🦞 Starting Ralph Watch${NC}"
    echo "   Ticket: $TICKET"
    echo "   Repo: $REPO_PATH"
    echo "   Interval: ${INTERVAL}s"
    
    # Start daemon
    nohup "$0" --ticket="$TICKET" --repo="$REPO_PATH" --interval="$INTERVAL" --daemon > "$LOGFILE" 2>&1 &
    local new_pid=$!
    
    echo "$new_pid" > "$PIDFILE"
    
    echo -e "${GREEN}✅ Started (PID: $new_pid)${NC}"
    echo "   Log: $LOGFILE"
    echo "   Status: ./ralph-watch.sh --status"
    echo "   Stop: ./ralph-watch.sh --stop"
}

# Main entry
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # If --daemon was passed, run as daemon
    if [[ " $* " =~ " --daemon " ]]; then
        run_daemon
    else
        start_daemon
    fi
fi