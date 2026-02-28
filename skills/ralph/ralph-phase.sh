#!/bin/bash
# ralph-phase.sh - Mark Ralph workflow phases complete
# Usage: ./ralph-phase.sh <ticket> --mark=<planner|setup|dev|verify|test|review>
# Part of: ~/.openclaw/workspace/skills/ralph/

REMY_DB="${REMY_DB:-$HOME/projects/remy-tracker/remy.db}"

TICKET_NUM="$1"
ACTION="$2"

if [ -z "$TICKET_NUM" ] || [ -z "$ACTION" ]; then
    echo "Usage: $0 <ticket-number> --mark=<phase>"
    echo ""
    echo "Phases: planner, setup, dev, verify, test, review"
    echo ""
    echo "Example:"
    echo "  $0 REMY-018 --mark=planner"
    echo "  $0 REMY-018 --mark=setup"
    exit 1
fi

# Parse --mark=phase
if [[ "$ACTION" =~ ^--mark=(.+)$ ]]; then
    PHASE="${BASH_REMATCH[1]}"
else
    echo "❌ Invalid format. Use --mark=<phase>"
    exit 1
fi

# Get ticket ID
TICKET_ID=$(sqlite3 "$REMY_DB" "SELECT id FROM tickets WHERE ticket_number='$TICKET_NUM';" 2>/dev/null)

if [ -z "$TICKET_ID" ]; then
    echo "❌ Ticket $TICKET_NUM not found"
    exit 1
fi

# Determine who completes based on phase
case "$PHASE" in
    planner|setup)
        WHO="pm"
        ;;
    dev|verify)
        WHO="dev"
        ;;
    test)
        WHO="qa"
        ;;
    review)
        WHO="tech_lead"
        ;;
    *)
        echo "❌ Unknown phase: $PHASE"
        echo "Valid phases: planner, setup, dev, verify, test, review"
        exit 1
        ;;
esac

# Capitalize first letter (bash 3 compatible)
PHASE_CAP=$(echo "$PHASE" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')

# Update the phase
echo "🦞 Marking $PHASE phase complete for $TICKET_NUM (by $WHO)..."

sqlite3 "$REMY_DB" <<EOF
UPDATE ralph_workflow_steps 
SET completed=1, completed_at=datetime('now'), completed_by='$WHO'
WHERE ticket_id=$TICKET_ID AND phase='$PHASE_CAP';
EOF

if [ $? -eq 0 ]; then
    echo "✅ $PHASE phase marked complete"
else
    echo "❌ Failed to mark phase"
    exit 1
fi
