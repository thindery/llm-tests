#!/bin/bash
# ralph-create.sh - Helper script for proper Ralph workflow
# Usage: ./ralph-create.sh "REMY-018" "Ticket Title" [AC file]
# Part of: ~/.openclaw/workspace/skills/ralph/

set -e

TICKET_NUM=$1
TITLE=$2
AC_FILE=$3

if [ -z "$TICKET_NUM" ] || [ -z "$TITLE" ]; then
    echo "Usage: $0 <ticket-number> <'title'> [ac-file.json]"
    echo ""
    echo "Example:"
    echo "  $0 REMY-018 'Fix login bug'"
    echo "  $0 REMY-018 'New feature' ./ac-list.json"
    exit 1
fi

DB_PATH="${DB_PATH:-$HOME/projects/remy-tracker/remy.db}"

echo "🎫 Creating ticket: $TICKET_NUM - $TITLE"

# Step 1: Create ticket
remy add "$TITLE" --type="Dev Task" --priority=High --project=General --status="To Research" --agent="pm" --role="pm" >/dev/null

# Get ticket ID
TICKET_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM tickets WHERE ticket_number='$TICKET_NUM';" 2>/dev/null)

if [ -z "$TICKET_ID" ]; then
    echo "❌ Failed to get ticket ID for $TICKET_NUM"
    exit 1
fi

echo "   Ticket ID: $TICKET_ID"

# Step 2: Add AC if file provided
if [ -n "$AC_FILE" ] && [ -f "$AC_FILE" ]; then
    echo "   Adding AC from $AC_FILE..."
    
    # Use ralph-ac.sh to add AC via API
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if ! "$SCRIPT_DIR/ralph-ac.sh" "$TICKET_NUM" --file="$AC_FILE"; then
        echo "❌ Failed to add AC via API"
        exit 1
    fi
    
    # Verify AC was added by checking the API
    AC_COUNT=$(curl -s "http://localhost:3474/api/tickets/$TICKET_ID/ac?as=pm" | jq 'length' 2>/dev/null || echo "0")
    echo "   Added $AC_COUNT acceptance criteria"
fi

# Step 3: Mark Planner complete
echo "   Marking Planner phase complete..."
sqlite3 "$DB_PATH" <<EOF
UPDATE ralph_workflow_steps 
SET completed=1, completed_at=datetime('now'), completed_by='pm'
WHERE ticket_id=$TICKET_ID AND phase='Planner';
EOF

# Step 4: Mark Setup complete  
echo "   Marking Setup phase complete..."
sqlite3 "$DB_PATH" <<EOF
UPDATE ralph_workflow_steps 
SET completed=1, completed_at=datetime('now'), completed_by='pm'
WHERE ticket_id=$TICKET_ID AND phase='Setup';
EOF

# Step 5: Add reference comment
echo "   Adding reference comment..."
remy comment "$TICKET_NUM" "AC defined — see official AC tab ✓" --role=pm >/dev/null 2>&1 || true

echo ""
echo "✅ Ticket $TICKET_NUM created successfully!"
echo "   View: http://localhost:3474/ticket/$TICKET_NUM"
echo "   AC Tab: http://localhost:3474/ticket/$TICKET_NUM?tab=ac"
echo ""
echo "Next steps:"
echo "   remy show $TICKET_NUM"
echo "   remy move $TICKET_NUM --to 'In Dev' --role=pm"
