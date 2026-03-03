#!/bin/bash
# ralph-helper.sh - Source this file to get Ralph workflow functions
# Usage: source ~/.openclaw/workspace/skills/ralph/ralph-helper.sh

RALPH_SKILL_DIR="${HOME}/.openclaw/workspace/skills/ralph"
REMY_DB="${REMY_DB:-$HOME/projects/remy-tracker/remy.db}"

# Function: Create ticket with full Ralph workflow
ralph-create() {
    local title="$1"
    local ticket_num="$2"
    shift 2
    
    local ac_file=""
    local ticket_type="Dev Task"
    local priority="High"
    local project="General"
    
    # Parse args
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --ac-file=*) ac_file="${1#*=}" ;;
            --type=*) ticket_type="${1#*=}" ;;
            --priority=*) priority="${1#*=}" ;;
            --project=*) project="${1#*=}" ;;
        esac
        shift
    done
    
    echo "🦞 Ralph Workflow: Creating $ticket_num"
    
    # Step 1: Create ticket
    echo "   Creating ticket..."
    remy add "$title" --type="$ticket_type" --priority=$priority --project="$project" --status="To Research" --agent="pm" --role="pm" > /dev/null
    
    # Get ticket ID
    local ticket_id=$(sqlite3 "$REMY_DB" "SELECT id FROM tickets WHERE ticket_number='$ticket_num';" 2>/dev/null)
    if [[ -z "$ticket_id" ]]; then
        echo "❌ Failed to get ticket ID"
        return 1
    fi
    echo "   Ticket ID: $ticket_id"
    
    # Step 2: Add AC if file provided
    if [[ -n "$ac_file" && -f "$ac_file" ]]; then
        echo "   Adding AC from $ac_file..."
        "$RALPH_SKILL_DIR/ralph-ac.sh" "$ticket_num" --file="$ac_file" > /dev/null
    fi
    
    # Step 3: Mark Planner complete
    echo "   Marking Planner phase complete..."
    "$RALPH_SKILL_DIR/ralph-phase.sh" "$ticket_num" --mark=planner > /dev/null
    
    # Step 4: Mark Setup complete
    echo "   Marking Setup phase complete..."
    "$RALPH_SKILL_DIR/ralph-phase.sh" "$ticket_num" --mark=setup > /dev/null
    
    # Step 5: Add reference comment
    echo "   Adding reference comment..."
    remy comment "$ticket_num" "AC defined — see official AC tab ✓" --role=pm > /dev/null 2>&1 || true
    
    # Step 6: Move to In Dev
    echo "   Moving to In Dev..."
    remy move "$ticket_num" --to "In Dev" --role=pm > /dev/null 2>&1 || true
    
    echo ""
    echo "✅ $ticket_num created with Ralph workflow!"
    echo "   View: http://localhost:3474/ticket/$ticket_num"
}

# Function: Add AC to ticket
ralph-ac() {
    "$RALPH_SKILL_DIR/ralph-ac.sh" "$@"
}

# Function: Mark phase complete
ralph-phase() {
    "$RALPH_SKILL_DIR/ralph-phase.sh" "$@"
}

# Function: Check status
ralph-status() {
    "$RALPH_SKILL_DIR/ralph-status.sh" "$@"
}

# 🔥 TASK-042: Auto-Phase Advance Functions
# These functions automatically handle phase completion and status advancement

# Function: Auto-advance ticket through current phase
ralph-auto-advance() {
    "$RALPH_SKILL_DIR/auto-phase-advance" advance "$@"
}

# Function: Check ticket phase status
ralph-status-auto() {
    "$RALPH_SKILL_DIR/auto-phase-advance" status "$@"
}

# Function: Dev agent completes work (marks Dev+Verify, advances to In QA)
ralph-dev-complete() {
    echo "🦞 TASK-042: Auto-completing Dev workflow..."
    "$RALPH_SKILL_DIR/auto-phase-advance" dev-complete "$@"
}

# Function: QA completes testing (marks Test, advances to Ready for Review)
ralph-qa-complete() {
    echo "🦞 TASK-042: Auto-completing QA workflow..."
    "$RALPH_SKILL_DIR/auto-phase-advance" qa-complete "$@"
}

# Function: Tech Lead completes review (marks Review, closes ticket)
ralph-review-complete() {
    echo "🦞 TASK-042: Auto-completing Review workflow..."
    "$RALPH_SKILL_DIR/auto-phase-advance" review-complete "$@"
}

export -f ralph-create ralph-ac ralph-phase ralph-status
export -f ralph-auto-advance ralph-status-auto ralph-dev-complete ralph-qa-complete ralph-review-complete
