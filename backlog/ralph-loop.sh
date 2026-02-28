#!/bin/bash
# ralph-loop.sh - REMY-003 Auto-Research Pipeline
# Checks Dev Backlog and creates Research tickets when low
# Run this every heartbeat (30 min)

set -e

REMY_TRACKER_DIR="$HOME/projects/remy-tracker"
IDEAS_FILE="$HOME/.openclaw/workspace/backlog/ralph-ideas.json"
MIN_DEV_BACKLOG=3
AUTO_CREATE_THRESHOLD=2

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🦞 Ralph Loop - REMY-003 Auto-Research Pipeline"
echo "================================================"

# Check if we're in the right directory
cd "$REMY_TRACKER_DIR" 2>/dev/null || {
  echo "Error: Cannot find remy-tracker directory at $REMY_TRACKER_DIR"
  exit 1
}

# Get current Dev Backlog count
DEV_BACKLOG_COUNT=$(sqlite3 remy.db "SELECT COUNT(*) FROM tickets WHERE status = 'Dev Backlog';" 2>/dev/null || echo "0")
echo "Current Dev Backlog: $DEV_BACKLOG_COUNT tickets"

# Determine action based on count
if [ "$DEV_BACKLOG_COUNT" -ge "$MIN_DEV_BACKLOG" ]; then
  echo -e "${GREEN}✅ Dev Backlog healthy ($DEV_BACKLOG_COUNT ≥ $MIN_DEV_BACKLOG)${NC}"
  echo "No action needed."
  exit 0
fi

if [ "$DEV_BACKLOG_COUNT" -eq "$AUTO_CREATE_THRESHOLD" ]; then
  echo -e "${YELLOW}⚠️ Dev Backlog low ($DEV_BACKLOG_COUNT tickets)${NC}"
  echo "Checking ideas backlog for next Research ticket..."
fi

if [ "$DEV_BACKLOG_COUNT" -le "$CRITICAL_THRESHOLD" ]; then
  echo -e "${RED}🔴 Dev Backlog CRITICAL ($DEV_BACKLOG_COUNT tickets)${NC}"
  echo "Must create Research ticket immediately!"
fi

# Check if ideas file exists
if [ ! -f "$IDEAS_FILE" ]; then
  echo "Error: Ideas file not found at $IDEAS_FILE"
  echo "Creating empty ideas file..."
  mkdir -p "$(dirname "$IDEAS_FILE")"
  echo '{"ideas": []}' > "$IDEAS_FILE"
  echo "No ideas available. Pipeline paused."
  exit 0
fi

# Find next pending idea (highest value_score)
NEXT_IDEA=$(jq -r '.ideas[] | select(.status == "pending") | "\(.value_score)|\(.id)|\(.title)|\(.description)|\(.category)|\(.effort_estimate)"' "$IDEAS_FILE" 2>/dev/null | sort -t'|' -k1 -nr | head -1)

if [ -z "$NEXT_IDEA" ]; then
  echo -e "${YELLOW}⚠️ No pending ideas in backlog${NC}"
  echo "Ideas file exists but all ideas are completed or none available."
  echo "Pipeline paused - add new ideas to $IDEAS_FILE"
  exit 0
fi

# Parse the selected idea
IDEA_VALUE=$(echo "$NEXT_IDEA" | cut -d'|' -f1)
IDEA_ID=$(echo "$NEXT_IDEA" | cut -d'|' -f2)
IDEA_TITLE=$(echo "$NEXT_IDEA" | cut -d'|' -f3)
IDEA_DESC=$(echo "$NEXT_IDEA" | cut -d'|' -f4)
IDEA_CATEGORY=$(echo "$NEXT_IDEA" | cut -d'|' -f5)
IDEA_EFFORT=$(echo "$NEXT_IDEA" | cut -d'|' -f6)

echo ""
echo "Selected Idea: $IDEA_TITLE"
echo "  ID: $IDEA_ID"
echo "  Value Score: $IDEA_VALUE/10"
echo "  Category: $IDEA_CATEGORY"
echo "  Effort: $IDEA_EFFORT"
echo ""

# Determine priority based on value score
if [ "$IDEA_VALUE" -ge 9 ]; then
  PRIORITY="High"
elif [ "$IDEA_VALUE" -ge 6 ]; then
  PRIORITY="Medium"
else
  PRIORITY="Low"
fi

# Generate AC based on category
case "$IDEA_CATEGORY" in
  "Research")
    AC_GIVEN="Research sources and APIs are identified"
    AC_WHEN="investigation is complete"
    AC_THEN="a summary document exists with findings and recommendations"
    ;;
  "Integration")
    AC_GIVEN="API documentation and credentials are available"
    AC_WHEN="integration is implemented"
    AC_THEN="the feature works end-to-end with tests"
    ;;
  "Automation")
    AC_GIVEN="manual process is documented"
    AC_WHEN="automation is deployed"
    AC_THEN="process runs automatically without manual intervention"
    ;;
  *)
    AC_GIVEN="requirements are defined"
    AC_WHEN="implementation is complete"
    AC_THEN="feature is working and documented"
    ;;
esac

# Create the Research ticket
echo "Creating Research ticket..."

# Use remy CLI to create ticket
TICKET_RESULT=$(node cli/src/index.js add "Research: $IDEA_TITLE" \
  --type="Research" \
  --priority="$PRIORITY" \
  --project="General" \
  --description="Auto-generated from Ralph ideas backlog (REMY-003)

**Idea:** $IDEA_TITLE
**Category:** $IDEA_CATEGORY
**Value Score:** $IDEA_VALUE/10
**Effort Estimate:** $IDEA_EFFORT

**Description:**
$IDEA_DESC

**Success Criteria:**
- Research complete with findings documented
- Recommendation on implementation approach
- AC defined for potential Dev Task promotion" 2>&1 || echo "ERROR")

if echo "$TICKET_RESULT" | grep -q "ERROR\|Error"; then
  echo -e "${RED}❌ Failed to create ticket${NC}"
  echo "$TICKET_RESULT"
  exit 1
fi

# Extract ticket number from result
TICKET_NUMBER=$(echo "$TICKET_RESULT" | grep -oE 'REMY-[0-9]+|TASK-[0-9]+' | head -1)

if [ -z "$TICKET_NUMBER" ]; then
  echo -e "${YELLOW}⚠️ Ticket created but could not extract ticket number${NC}"
  echo "Result: $TICKET_RESULT"
  TICKET_NUMBER="UNKNOWN"
else
  echo -e "${GREEN}✅ Created ticket: $TICKET_NUMBER${NC}"
fi

# Add AC to ticket
if [ "$TICKET_NUMBER" != "UNKNOWN" ]; then
  echo "Adding acceptance criteria..."
  node cli/src/index.js ac "$TICKET_NUMBER" \
    --given="$AC_GIVEN" \
    --when="$AC_WHEN" \
    --then="$AC_THEN" \
    --role=pm \
    --agent="Ralph" 2>&1 || echo "Warning: Could not add AC"
fi

# Mark idea as completed in ideas file
jq --arg id "$IDEA_ID" --arg ticket "$TICKET_NUMBER" \
  '.ideas |= map(if .id == $id then .status = "converted" | .converted_to_ticket = $ticket | .completed_at = now | . else . end)' \
  "$IDEAS_FILE" > "${IDEAS_FILE}.tmp" && mv "${IDEAS_FILE}.tmp" "$IDEAS_FILE"

echo -e "${GREEN}✅ Updated idea status: $IDEA_ID → converted to $TICKET_NUMBER${NC}"

# Summary
echo ""
echo "================================================"
echo "🦞 Ralph Loop Complete"
echo "================================================"
echo "Dev Backlog: $DEV_BACKLOG_COUNT → $((DEV_BACKLOG_COUNT + 1)) tickets"
echo "New Ticket: $TICKET_NUMBER"
echo "Idea Used: $IDEA_ID"
echo ""
echo "Next steps:"
echo "1. Planner agent will define detailed AC"
echo "2. Ticket moves through Ralph workflow"
echo "3. When approved, promote to Dev Backlog"
echo ""
echo "Remaining ideas: $(jq '.ideas | map(select(.status == "pending")) | length' "$IDEAS_FILE")"

exit 0
