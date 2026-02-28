#!/bin/bash
# Ralph Ticket Advancement Helper Script
# Usage: ./ralph-advance.sh <ticket_id> <current_phase> <next_status> [role]

set -e

TICKET_ID=$1
CURRENT_PHASE=$2
NEXT_STATUS=$3
ROLE=${4:-"agent"}
RALPH_API="http://localhost:3474/api/tickets"

if [ -z "$TICKET_ID" ] || [ -z "$CURRENT_PHASE" ] || [ -z "$NEXT_STATUS" ]; then
    echo "Usage: $0 <ticket_id> <current_phase> <next_status> [role]"
    echo ""
    echo "Examples:"
    echo "  $0 123 Development Verify dev"
    echo "  $0 456 Review Closed architect"
    echo "  $0 789 Planner Setup planner"
    exit 1
fi

echo "=== Advancing Ticket $TICKET_ID ==="
echo "Phase: $CURRENT_PHASE -> (complete)"
echo "Status: -> $NEXT_STATUS"
echo "Role: $ROLE"
echo ""

# Step 1: Mark current phase complete
echo "1. Marking phase '$CURRENT_PHASE' complete..."
curl -s -X POST "$RALPH_API/$TICKET_ID/ralph/complete-phase" \
    -H "Content-Type: application/json" \
    -H "X-Role: $ROLE" \
    -d "{\"phase\":\"$CURRENT_PHASE\"}" | jq . 2>/dev/null || cat
echo ""

# Step 2: Advance ticket status
echo "2. Advancing ticket status to '$NEXT_STATUS'..."
curl -s -X PATCH "$RALPH_API/$TICKET_ID" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"$NEXT_STATUS\"}" | jq . 2>/dev/null || cat
echo ""

# Step 3: Confirmation
echo "3. ✅ Ticket $TICKET_ID moved from $CURRENT_PHASE to $NEXT_STATUS"
