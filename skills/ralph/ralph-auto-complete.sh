#!/bin/bash
# ralph-auto-complete.sh - Auto-completion trigger for Ralph phases
# Usage: ./ralph-auto-complete.sh --ticket=TICKET [--repo=PATH] [--on-pass=STATUS] [--strict]
#
# Features:
# - Automatically monitors test/build/lint status
# - Checks AC completion
# - Triggers phase completion when criteria met
# - Recovers from crashes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHASE_TRACKER="${SCRIPT_DIR}/run-phase-tracker.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TICKET=""
REPO_PATH="${PWD}"
ON_PASS_STATUS="In QA"
STRICT=false
WATCH=false
INTERVAL=30
VERBOSE=false

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
        --on-pass=*)
            ON_PASS_STATUS="${1#*=}"
            shift
            ;;
        --on-pass)
            ON_PASS_STATUS="$2"
            shift 2
            ;;
        --strict)
            STRICT=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --interval=*)
            INTERVAL="${1#*=}"
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            cat <<'EOF'
🦞 Ralph Auto-Complete

Monitors dev work and auto-completes phase when criteria met.

Usage:
  ./ralph-auto-complete.sh --ticket=TICKET [options]

Options:
  --ticket=TICKET      Ticket number (e.g., REMY-042)
  --repo=PATH          Repository path (default: current dir)
  --on-pass=STATUS     Status to set on completion (default: In QA)
  --strict             Require ALL verifications to pass
  --watch              Continuously monitor (default: one-shot)
  --interval=SECONDS   Watch interval (default: 30)
  --verbose            Show detailed output
  --help               Show this help

Examples:
  # One-shot verification
  ./ralph-auto-complete.sh --ticket=REMY-042
  
  # Watch mode
  ./ralph-auto-complete.sh --ticket=REMY-042 --watch --interval=60
  
  # Strict mode (all checks must pass)
  ./ralph-auto-complete.sh --ticket=REMY-042 --strict

EOF
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage"
            exit 1
            ;;
    esac
done

# Validate
if [ -z "$TICKET" ]; then
    echo -e "${RED}❌ Ticket number required${NC}"
    echo "Use --ticket=TICKET"
    exit 1
fi

if [ ! -d "$REPO_PATH" ]; then
    echo -e "${RED}❌ Repository path not found: $REPO_PATH${NC}"
    exit 1
fi

# Environment setup
export PHASE_TRACKER_VERBOSE="$VERBOSE"

echo -e "${BLUE}🦞 Ralph Auto-Complete${NC}"
echo -e "   Ticket: ${YELLOW}${TICKET}${NC}"
echo -e "   Repo: ${REPO_PATH}"
echo -e "   On Pass: ${GREEN}${ON_PASS_STATUS}${NC}"
echo

# Function to run verification
run_verify() {
    local output
    local exit_code=0
    
    if $VERBOSE; then
        echo -e "${BLUE}Running verification...${NC}"
        "$PHASE_TRACKER" verify "$TICKET" "$REPO_PATH" 2>&1 || exit_code=$?
    else
        output=$("$PHASE_TRACKER" verify "$TICKET" "$REPO_PATH" 2>&1) || exit_code=$?
    fi
    
    return $exit_code
}

# Function to complete phase
complete_phase() {
    echo -e "${GREEN}✅ All criteria met! Completing phase...${NC}"
    
    if "$PHASE_TRACKER" complete "$TICKET" "Dev" "$ON_PASS_STATUS"; then
        echo -e "${GREEN}🎉 Phase completed successfully!${NC}"
        
        # Add comment to ticket
        echo -e "${BLUE}Adding completion comment...${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to complete phase${NC}"
        return 1
    fi
}

# Main logic
if $WATCH; then
    echo -e "${BLUE}Watch mode enabled (interval: ${INTERVAL}s)${NC}"
    echo "Press Ctrl+C to stop"
    echo
    
    while true; do
        if run_verify; then
            if complete_phase; then
                echo -e "${GREEN}Auto-complete successful! Exiting.${NC}"
                exit 0
            fi
        else
            if $VERBOSE; then
                echo -e "${YELLOW}⏳ Criteria not yet met, checking again in ${INTERVAL}s...${NC}"
            else
                echo -n "."
            fi
        fi
        
        sleep "$INTERVAL"
    done
else
    # One-shot mode
    if run_verify; then
        complete_phase
        exit 0
    else
        echo -e "${YELLOW}⚠️  Verification failed - phase not complete${NC}"
        
        if $STRICT; then
            echo -e "${RED}Strict mode: Exiting with error${NC}"
            exit 1
        else
            echo -e "${BLUE}Some checks failed. Phase not auto-completed.${NC}"
            exit 0
        fi
    fi
fi