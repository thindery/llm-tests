#!/bin/bash
# ralph-recovery.sh - Phase state recovery from crashes
# Usage: ./ralph-recovery.sh [--max-age=MINUTES] [--auto-fix] [--notify]
#
# Detects and recovers from crashed agent phases

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
MAX_AGE=10
AUTO_FIX=false
NOTIFY=false

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --max-age=*)
            MAX_AGE="${1#*=}"
            shift
            ;;
        --auto-fix)
            AUTO_FIX=true
            shift
            ;;
        --notify)
            NOTIFY=true
            shift
            ;;
        --help|-h)
            cat <<'EOF'
🦞 Ralph Recovery

Detects and recovers from crashed agent phases.

Usage:
  ./ralph-recovery.sh [options]

Options:
  --max-age=MINUTES    Maximum age (in minutes) to consider crashed (default: 10)
  --auto-fix           Automatically attempt to recover crashed phases
  --notify             Send notification for recovered phases
  --help               Show this help

Examples:
  # Check for crashed phases
  ./ralph-recovery.sh
  
  # Auto-recover
  ./ralph-recovery.sh --auto-fix
  
  # Check for older phases
  ./ralph-recovery.sh --max-age=30

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

echo -e "${BLUE}🦞 Ralph Recovery${NC}"
echo -e "   Max age: ${MAX_AGE} minutes"
echo

# Create recovery report
echo -e "${BLUE}Checking for crashed phases...${NC}"

# Run recovery
if "$PHASE_TRACKER" recover "$MAX_AGE"; then
    echo -e "${GREEN}✅ Recovery check complete${NC}"
else
    echo -e "${YELLOW}⚠️  Some phases may need manual intervention${NC}"
fi

# Cleanup stale locks
echo
echo -e "${BLUE}Cleaning up stale locks...${NC}"
if "$PHASE_TRACKER" cleanup; then
    echo -e "${GREEN}✅ Lock cleanup complete${NC}"
fi

# Summary
echo
echo -e "${BLUE}Recovery Summary:${NC}"
echo "   - Review any warning messages above"
echo "   - Check Remy-Tracker for phase statuses"
echo "   - Manual intervention may be needed for incomplete phases"