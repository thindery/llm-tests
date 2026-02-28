#!/bin/bash
# ralph-status.sh - Check Ralph workflow status for a ticket
# Usage: ./ralph-status.sh <ticket-number>
# Part of: ~/.openclaw/workspace/skills/ralph/

REMY_DB="${REMY_DB:-$HOME/projects/remy-tracker/remy.db}"

TICKET_NUM="$1"

if [ -z "$TICKET_NUM" ]; then
    echo "Usage: $0 <ticket-number>"
    echo ""
    echo "Example:"
    echo "  $0 REMY-018"
    exit 1
fi

# Get ticket ID
TICKET_ID=$(sqlite3 "$REMY_DB" "SELECT id FROM tickets WHERE ticket_number='$TICKET_NUM';" 2>/dev/null)

if [ -z "$TICKET_ID" ]; then
    echo "❌ Ticket $TICKET_NUM not found"
    exit 1
fi

echo "🦞 Ralph Workflow Status: $TICKET_NUM"
echo ""

# Show AC
echo "📋 Acceptance Criteria:"
sqlite3 "$REMY_DB" <<EOF
SELECT 
    CASE 
        WHEN status = 'pending' THEN '⬜'
        WHEN status = 'in_test' THEN '🔄'
        WHEN status = 'pass' THEN '✅'
        WHEN status = 'fail' THEN '❌'
        ELSE '⬜'
    END as status_icon,
    sort_order + 1 as ac_num,
    substr(given_text, 1, 50) as given
FROM acceptance_criteria 
WHERE ticket_id=$TICKET_ID 
ORDER BY sort_order;
EOF

echo ""
echo "🔄 Ralph Phases:"
sqlite3 "$REMY_DB" <<EOF
SELECT 
    CASE 
        WHEN completed = 1 THEN '✅'
        ELSE '⬜'
    END as status,
    phase,
    CASE 
        WHEN completed = 1 THEN '(' || completed_by || ' @ ' || substr(completed_at, 12, 5) || ')'
        ELSE ''
    END as who
FROM ralph_workflow_steps 
WHERE ticket_id=$TICKET_ID 
ORDER BY sort_order;
EOF

echo ""
echo "🔗 Links:"
echo "   http://localhost:3474/ticket/$TICKET_NUM"
echo "   http://localhost:3474/ticket/$TICKET_NUM?tab=ac"
echo "   http://localhost:3474/ticket/$TICKET_NUM?tab=ralph"
