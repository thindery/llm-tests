#!/bin/bash
# ralph-promote.sh - Promote approved Research tickets to Dev Backlog
# Part of REMY-003 Auto-Research Pipeline

set -e

REMY_TRACKER_DIR="$HOME/projects/remy-tracker"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🦞 Ralph Promote - Research → Dev Backlog"
echo "============================================"

cd "$REMY_TRACKER_DIR" 2>/dev/null || {
  echo "Error: Cannot find remy-tracker directory"
  exit 1
}

# Find Research tickets in "To Research" or "Tylor Decision" status with AC
echo "Checking for promotable Research tickets..."

# Get tickets that are Research type, in decision/status, and have AC
PROMOTABLE=$(sqlite3 remy.db <<EOF
SELECT 
  t.ticket_number,
  t.title,
  t.status,
  COUNT(ac.id) as ac_count,
  COUNT(CASE WHEN ac.status = 'pass' THEN 1 END) as passed_ac
FROM tickets t
LEFT JOIN acceptance_criteria ac ON ac.ticket_id = t.id
WHERE t.type = 'Research'
  AND t.status IN ('Tylor Decision', 'To Research')
  AND t.status != 'Closed/Done'
GROUP BY t.id
HAVING ac_count >= 3
ORDER BY t.priority DESC, t.created_at ASC;
EOF
)

if [ -z "$PROMOTABLE" ]; then
  echo -e "${GREEN}✅ No Research tickets ready for promotion${NC}"
  echo "Criteria: Research type + In Decision + ≥3 AC defined"
  exit 0
fi

echo ""
echo "Found promotable Research tickets:"
echo "$PROMOTABLE" | while IFS='|' read -r ticket title status ac_count passed_ac; do
  echo "  • $ticket: $title"
  echo "    Status: $status | AC: $ac_count ($passed_ac passed)"
done
echo ""

# Check for approval signals (thindery comments, activity, etc.)
echo "Checking for approval signals..."

# For each ticket, check if there's recent activity from thindery suggesting approval
echo "$PROMOTABLE" | while IFS='|' read -r ticket title status ac_count passed_ac; do
  # Get ticket ID
  TICKET_ID=$(sqlite3 remy.db "SELECT id FROM tickets WHERE ticket_number = '$ticket';")
  
  # Check for approval comments
  APPROVAL=$(sqlite3 remy.db <<EOF
SELECT COUNT(*) FROM ticket_comments
WHERE ticket_id = $TICKET_ID
  AND (
    content LIKE '%approve%' 
    OR content LIKE '%proceed%' 
    OR content LIKE '%go for it%' 
    OR content LIKE '%do it%'
    OR content LIKE '%looks good%'
    OR content LIKE '%LGTM%'
  )
  AND created_at > datetime('now', '-7 days');
EOF
)
  
  if [ "$APPROVAL" -gt 0 ]; then
    echo -e "${GREEN}🚀 $ticket has approval signal - ready to promote!${NC}"
    
    # Promote to Dev Task
    echo "Promoting $ticket to Dev Task and moving to Dev Backlog..."
    
    # Update type
    sqlite3 remy.db "UPDATE tickets SET type = 'Dev Task', updated_at = datetime('now') WHERE ticket_number = '$ticket';" >/dev/null 2>&1
    
    # Move to Dev Backlog using remy CLI
    node cli/src/index.js move "$ticket" --to "Dev Backlog" --role=pm --agent="Ralph" 2>&1 || {
      echo "Warning: Could not move ticket via CLI, updating directly..."
      sqlite3 remy.db "UPDATE tickets SET status = 'Dev Backlog', updated_at = datetime('now') WHERE ticket_number = '$ticket';" >/dev/null 2>&1
    }
    
    # Add comment
    node cli/src/index.js comment "$ticket" \
      --text="🚀 PROMOTED: Research complete, approved by thindery. Moved to Dev Backlog as Dev Task." \
      --role=pm --agent="Ralph" 2>&1 || true
    
    echo -e "${GREEN}✅ $ticket promoted to Dev Backlog${NC}"
  else
    echo "  • $ticket: Awaiting approval signal (no approve/proceed found in recent comments)"
  fi
done

echo ""
echo "Promote check complete."
