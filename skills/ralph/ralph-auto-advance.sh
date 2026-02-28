#!/bin/bash
# ralph-auto-advance.sh - Auto-advance ticket through Ralph workflow
# Usage: ./ralph-auto-advance.sh <ticket_number> --from=<phase> --to=<next_status> [--role=<role>]
# 
# Examples:
#   ./ralph-auto-advance.sh REMY-042 --from=Dev --to="In QA" --role=dev
#   ./ralph-auto-advance.sh REMY-042 --from=Test --to="Ready for Review" --role=qa

set -e

REMY_API="http://localhost:3474/api/tickets"
RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Show usage
usage() {
    echo "🦞 Ralph Auto-Advance"
    echo ""
    echo "Usage: $0 <ticket_number> --from=<phase> --to=<next_status> [--role=<role>]"
    echo ""
    echo "Phases: Planner, Setup, Dev, Verify, Test, Review"
    echo ""
    echo "Examples:"
    echo "  $0 REMY-042 --from=Dev --to=\"In QA\" --role=dev"
    echo "  $0 REMY-042 --from=Test --to=\"Ready for Review\" --role=qa"
    echo "  $0 REMY-042 --from=Planner --to=\"To Dev\" --role=planner"
    echo ""
    echo "Common transitions:"
    echo "  Dev → In QA       (when dev work complete)"
    echo "  Test → Ready for Review  (when QA passes)"
    echo "  Review → Closed/Done    (when code merged)"
}

# Parse arguments
TICKET_NUM=""
FROM_PHASE=""
TO_STATUS=""
ROLE="agent"

if [ $# -lt 1 ]; then
    usage
    exit 1
fi

TICKET_NUM="$1"
shift

while [[ $# -gt 0 ]]; do
    case "$1" in
        --from=*)
            FROM_PHASE="${1#*=}"
            ;;
        --to=*)
            TO_STATUS="${1#*=}"
            ;;
        --role=*)
            ROLE="${1#*=}"
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            usage
            exit 1
            ;;
    esac
    shift
done

# Validate inputs
if [ -z "$TICKET_NUM" ]; then
    echo -e "${RED}❌ Ticket number required${NC}"
    usage
    exit 1
fi

if [ -z "$FROM_PHASE" ]; then
    echo -e "${RED}❌ --from=<phase> required${NC}"
    usage
    exit 1
fi

if [ -z "$TO_STATUS" ]; then
    echo -e "${RED}❌ --to=<status> required${NC}"
    usage
    exit 1
fi

# Get ticket ID from ticket number
TICKET_ID=$(curl -s "${REMY_API}?search=${TICKET_NUM}" | jq -r ".tickets[] | select(.ticket_number==\"${TICKET_NUM}\") | .id" 2>/dev/null)

if [ -z "$TICKET_ID" ]; then
    echo -e "${RED}❌ Ticket ${TICKET_NUM} not found${NC}"
    exit 1
fi

echo -e "${BLUE}🦞 Ralph Auto-Advance: ${TICKET_NUM}${NC}"
echo -e "   Phase: ${YELLOW}${FROM_PHASE}${NC} → (complete)"
echo -e "   Status: ${GREEN}→ ${TO_STATUS}${NC}"
echo -e "   Role: ${ROLE}"
echo ""

# Step 1: Mark phase complete
echo -e "${BLUE}1. Marking ${FROM_PHASE} phase complete...${NC}"

PHASE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${REMY_API}/${TICKET_ID}/ralph/complete-phase" \
    -H "Content-Type: application/json" \
    -H "X-Role: ${ROLE}" \
    -d "{\"phase\":\"${FROM_PHASE}\",\"actor\":\"${ROLE}-agent\",\"actor_role\":\"${ROLE}\",\"actor_name\":\"${ROLE^} Agent\"}" 2>/dev/null)

PHASE_HTTP_CODE=$(echo "$PHASE_RESPONSE" | tail -n1)
PHASE_BODY=$(echo "$PHASE_RESPONSE" | sed '$d')

if [ "$PHASE_HTTP_CODE" = "200" ] || [ "$PHASE_HTTP_CODE" = "201" ]; then
    echo -e "   ${GREEN}✅ ${FROM_PHASE} phase marked complete${NC}"
else
    echo -e "   ${YELLOW}⚠️ Phase completion returned HTTP ${PHASE_HTTP_CODE}${NC}"
    echo "   Response: $PHASE_BODY" | head -c 200
    echo ""
fi

# Step 2: Advance ticket status
echo -e "${BLUE}2. Advancing ticket to '${TO_STATUS}'...${NC}"

STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "${REMY_API}/${TICKET_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"${TO_STATUS}\",\"actor\":\"${ROLE}-agent\",\"actor_role\":\"${ROLE}\",\"actor_name\":\"${ROLE^} Agent\",\"comment\":\"${FROM_PHASE} complete, moving to ${TO_STATUS}\"}" 2>/dev/null)

STATUS_HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed '$d')

if [ "$STATUS_HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Ticket advanced to ${TO_STATUS}${NC}"
    echo ""
    echo -e "${GREEN}🎉 ${TICKET_NUM} successfully moved from ${FROM_PHASE} to ${TO_STATUS}${NC}"
    exit 0
else
    echo -e "   ${RED}❌ Status change failed (HTTP ${STATUS_HTTP_CODE})${NC}"
    echo "   Response: $STATUS_BODY" | head -c 500
    echo ""
    
    # Check for specific error codes
    if echo "$STATUS_BODY" | grep -q "RALPH_PHASE_INCOMPLETE"; then
        echo -e "${YELLOW}⚠️  The previous Ralph phase is not complete.${NC}"
        echo "   Check the Ralph tab: http://localhost:3474/ticket/${TICKET_NUM}?tab=ralph"
    fi
    
    if echo "$STATUS_BODY" | grep -q "MISSING_ACCEPTANCE_CRITERIA"; then
        echo -e "${YELLOW}⚠️  Missing acceptance criteria.${NC}"
        echo "   Add AC here: http://localhost:3474/ticket/${TICKET_NUM}?tab=ac"
    fi
    
    exit 1
fi
