#!/bin/bash
#
# Ralph Orchestrator v3 - Full automation with OpenClaw integration
# SPAWN MODE: Creates agent task and exits
# RESUME MODE: Continues workflow when agent reports completion
#
# Usage:
#   ./ralph-orchestrator-v3.sh --spawn TICKET    # Start ticket processing
#   ./ralph-orchestrator-v3.sh --resume TICKET   # Continue after agent done
#   ./ralph-orchestrator-v3.sh --loop            # Continuous processing
#

set -euo pipefail

REMY_CLI="${HOME}/projects/remy-tracker/cli"
Ralph_DIR="${HOME}/.openclaw/workspace"
RALPH_STATE_DIR="${Ralph_DIR}/ralph-state"

# ═══════════════════════════════════════════════════════════
# PROJECT AND AGENT MAPPING
# ═══════════════════════════════════════════════════════════

# Project to repo mapping
get_project_repo() {
    case "$1" in
        "Remy-Finance") echo "${HOME}/projects/kalshi-trader" ;;
        "Sleep-Stories") echo "${HOME}/projects/sleep-stories" ;;
        "Pantry-Pal") echo "${HOME}/projects/pantry-pal" ;;
        *) echo "${HOME}/projects/viralsocialstar" ;;
    esac
}

# Project to agent mapping
get_project_agent() {
    case "$1" in
        "Remy-Finance") echo "api-dev" ;;
        "Sleep-Stories") echo "api-dev" ;;
        "Pantry-Pal") echo "api-dev" ;;
        *) echo "godot-dev" ;;
    esac
}

# Working variables (set after project detection)
VSS_REPO=""  # Kept for compatibility, will be set to REPO_PATH
REPO_PATH=""
AGENT_ID=""

color() {
    if [[ -t 1 ]]; then
        case "$1" in
            r) echo '\033[31m' ;;
            g) echo '\033[32m' ;;
            y) echo '\033[33m' ;;
            b) echo '\033[34m' ;;
            bold) echo '\033[1m' ;;
            reset) echo '\033[0m' ;;
        esac
    fi
}

log() { echo -e "$(color b)[$(date +%H:%M:%S)]$(color reset) $*"; }
success() { echo -e "$(color g)✓$(color reset) $*"; }
error() { echo -e "$(color r)$(color bold)✗$(color reset) $(color r)$*$(color reset)" >&2; }
warn() { echo -e "$(color y)⚠$(color reset) $*"; }
stage() { echo ""; echo "$(color b)$(color bold)▶ $*$(color reset)"; echo ""; }

# Initialize
init_state() {
    mkdir -p "${RALPH_STATE_DIR}/tickets"
    mkdir -p "${RALPH_STATE_DIR}/pending"
    mkdir -p "${RALPH_STATE_DIR}/completed"
    mkdir -p "${RALPH_STATE_DIR}/triggers"
}

# Remy helpers
get_ticket_details() {
    cd "$REMY_CLI"
    node src/index.js show "$1" --json 2>/dev/null || echo '{}'
}

# Get project name from ticket
detect_project() {
    local ticket="$1"
    local details
    details=$(get_ticket_details "$ticket")
    echo "$details" | jq -r '.project // "default"'
}

# Set up project-specific variables
setup_project_vars() {
    local ticket="$1"
    local project
    project=$(detect_project "$ticket")
    
    # Get repo path and agent from maps
    REPO_PATH=$(get_project_repo "$project")
    VSS_REPO="$REPO_PATH"  # For backward compatibility
    AGENT_ID=$(get_project_agent "$project")
    
    log "Project: $project"
    log "Repo: $REPO_PATH"
    log "Agent: $AGENT_ID"
}

complete_remy_step() {
    cd "$REMY_CLI"
    node src/index.js step-complete "$1" "$2" --role="$3" --agent="ralph" 2>/dev/null || true
}

move_ticket() {
    cd "$REMY_CLI"
    node src/index.js move "$1" --to="$2" --role="tech_lead" --agent="ralph" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════
# TICKET STATE MANAGEMENT
# ═══════════════════════════════════════════════════════════

STATE_DIR="${RALPH_STATE_DIR}/tickets"

# Load ticket state from JSON file
# Usage: load_ticket_state TICKET KEY
# Returns: value or empty string
load_ticket_state() {
    local ticket="$1"
    local key="$2"
    local file="${STATE_DIR}/${ticket}.json"
    
    if [[ -f "$file" ]]; then
        jq -r "$key // empty" "$file" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Save ticket state to JSON file
# Usage: save_ticket_state TICKET KEY VALUE
save_ticket_state() {
    local ticket="$1"
    local key="$2"
    local value="$3"
    local file="${STATE_DIR}/${ticket}.json"
    
    # Ensure file exists
    if [[ ! -f "$file" ]]; then
        return 1
    fi
    
    # Update the JSON file
    jq --arg key "$key" --arg val "$value" '.[$key] = $val' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

# Mark agent as spawned
# Usage: mark_agent_spawned TICKET PHASE AGENT_SESSION_ID
mark_agent_spawned() {
    local ticket="$1"
    local phase="$2"
    local session_id="$3"
    local file="${STATE_DIR}/${ticket}.json"
    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    jq --arg phase "$phase" --arg sid "$session_id" --arg now "$now" \
        '.agents[$phase].spawned = true | .agents[$phase].session_id = $sid | .agents[$phase].spawned_at = $now' \
        "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

# Check if agent was already spawned
# Usage: is_agent_spawned TICKET PHASE
# Returns: "true" or "false"
is_agent_spawned() {
    local ticket="$1"
    local phase="$2"
    
    jq -r ".agents.${phase}.spawned // false" "${STATE_DIR}/${ticket}.json" 2>/dev/null || echo "false"
}

# State management
create_state() {
    local ticket="$1" title="$2"
    cat > "${RALPH_STATE_DIR}/tickets/${ticket}.json" << EOF
{
  "ticket": "$ticket",
  "title": "$title",
  "status": "running",
  "current_stage": "planner",
  "stages": {
    "planner": {"status": "pending", "started_at": null, "completed_at": null},
    "setup": {"status": "pending", "started_at": null, "completed_at": null},
    "dev": {"status": "pending", "started_at": null, "completed_at": null, "spawned": false},
    "verify": {"status": "pending", "started_at": null, "completed_at": null},
    "qa": {"status": "pending", "started_at": null, "completed_at": null},
    "merge": {"status": "pending", "started_at": null, "completed_at": null}
  },
  "agents": {
    "verify": {"spawned": false, "session_id": null, "spawned_at": null, "completed": false, "completed_at": null},
    "qa": {"spawned": false, "session_id": null, "spawned_at": null, "completed": false, "completed_at": null},
    "tech_lead": {"spawned": false, "session_id": null, "spawned_at": null, "completed": false, "completed_at": null}
  },
  "pr": {"number": null, "url": null, "created_at": null},
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "feature/${ticket}"
}
EOF
}

update_state() {
    local ticket="$1" stage="$2" status="$3"
    local file="${RALPH_STATE_DIR}/tickets/${ticket}.json"
    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    jq --arg stage "$stage" --arg status "$status" --arg now "$now" \
        '.stages[$stage].status = $status | 
         if $status == "running" then .stages[$stage].started_at = $now else . end |
         if $status == "completed" then .stages[$stage].completed_at = $now else . end |
         if $status == "running" then .current_stage = $stage else . end' \
        "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

get_current_stage() {
    jq -r '.current_stage' "${RALPH_STATE_DIR}/tickets/${1}.json" 2>/dev/null || echo "none"
}

get_stage_status() {
    jq -r ".stages.${2}.status" "${RALPH_STATE_DIR}/tickets/${1}.json" 2>/dev/null || echo "none"
}

# ═══════════════════════════════════════════════════════════
# STAGE IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════

stage_planner() {
    local ticket="$1" title="$2"
    stage "STAGE 1/6: Planner"
    update_state "$ticket" "planner" "running"
    
    local status
    status=$(cd "$REMY_CLI" && node src/index.js show "$ticket" --json 2>/dev/null | jq -r '.status')
    
    if [[ "$status" == "Dev Backlog" ]]; then
        move_ticket "$ticket" "To Research"
    fi
    
    complete_remy_step "$ticket" "Requirements & Planning" "pm"
    move_ticket "$ticket" "Dev Backlog"
    
    update_state "$ticket" "planner" "completed"
    success "Planner complete"
}

stage_setup() {
    local ticket="$1" title="$2"
    stage "STAGE 2/6: Setup"
    update_state "$ticket" "setup" "running"
    
    local branch="feature/${ticket}"
    
    cd "$REPO_PATH"
    git checkout main 2>/dev/null || true
    git pull origin main 2>/dev/null || true
    
    # Clean branch
    if git show-ref --verify --quiet "refs/heads/$branch" 2>/dev/null; then
        git branch -D "$branch" 2>/dev/null || true
    fi
    
    git checkout -b "$branch"
    git push -u origin "$branch" 2>/dev/null || true
    
    complete_remy_step "$ticket" "Environment Setup" "tech_lead"
    move_ticket "$ticket" "In Dev"
    
    update_state "$ticket" "setup" "completed"
    success "Branch $branch ready"
}

stage_dev_spawn() {
    local ticket="$1" title="$2"
    stage "STAGE 3/6: Dev - Spawning Agent"
    update_state "$ticket" "dev" "running"
    
    local branch="feature/${ticket}"
    local trigger_file="${RALPH_STATE_DIR}/triggers/${ticket}-dev-complete"
    local task_file="${RALPH_STATE_DIR}/pending/${ticket}-task.md"
    local agent_script="${RALPH_STATE_DIR}/pending/${ticket}-agent.sh"
    
    # Mark as spawned
    jq '.stages.dev.spawned = true' "${RALPH_STATE_DIR}/tickets/${ticket}.json" > "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" && \
        mv "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" "${RALPH_STATE_DIR}/tickets/${ticket}.json"
    
    # Create agent task
    cat > "$task_file" << 'TASK_EOF'
DEVELOPMENT TASK: REPLACE_TICKET

Repository: REPLACE_REPO
Branch: REPLACE_BRANCH

YOUR MISSION:
Implement: REPLACE_TITLE

INSTRUCTIONS:
1. cd REPLACE_REPO
2. git checkout REPLACE_BRANCH
3. Implement requirements
4. Test locally (Godot or other)
5. git add -A
6. git commit -m "REPLACE_TICKET: [description]"
7. git push origin REPLACE_BRANCH
8. **CRITICAL:** Signal completion by creating this file:
   touch "REPLACE_TRIGGER"

DEFINITION OF DONE:
- Code compiles/builds
- Tests pass
- Commits pushed
- Trigger file created

DO NOT:
- Merge to main
- Close the ticket

The orchestrator will auto-detect completion and continue.
TASK_EOF

    # Replace placeholders
    sed -i.bak \
        -e "s|REPLACE_TICKET|$ticket|g" \
        -e "s|REPLACE_REPO|$REPO_PATH|g" \
        -e "s|REPLACE_BRANCH|$branch|g" \
        -e "s|REPLACE_TITLE|$title|g" \
        -e "s|REPLACE_TRIGGER|$trigger_file|g" \
        "$task_file"
    rm -f "${task_file}.bak"
    
    # Create agent completion script
    # This script runs inside the agent to signal completion back to orchestrator
    cat > "$agent_script" << AGENT_EOF
#!/bin/bash
# Agent completion script for $ticket
# Run this when done: bash $agent_script

echo "Marking $ticket as complete..."
touch "$trigger_file"
echo "✓ Done! Orchestrator will auto-resume."
AGENT_EOF
    chmod +x "$agent_script"
    
    # Output the spawn command for OpenClaw
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  AGENT READY TO SPAWN"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Ticket: $ticket"
    echo "Stage: Dev"
    echo "Branch: $branch"
    echo ""
    echo "--- AGENT TASK ---"
    cat "$task_file"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "SPAWN COMMAND:"
    echo ""
    echo "sessions_spawn agentId='$AGENT_ID' mode='run' task='$(cat "$task_file")'"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "AGENT COMPLETION SCRIPT:"
    echo "$agent_script"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    # Write spawn metadata for external tools
    cat > "${RALPH_STATE_DIR}/pending/${ticket}-spawn-meta.json" << EOF
{
  "ticket": "$ticket",
  "title": "$title",
  "branch": "$branch",
  "task_file": "$task_file",
  "agent_script": "$agent_script",
  "trigger_file": "$trigger_file",
  "agent_id": "$AGENT_ID",
  "repo_path": "$REPO_PATH",
  "spawned_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    log "Agent spawn prepared. Exiting for OpenClaw to spawn..."
    log "Run this script with --resume $ticket after agent completes."
    
    exit 0  # Exit here - OpenClaw spawns agent separately
}

stage_dev_wait() {
    local ticket="$1" title="$2"
    local trigger_file="${RALPH_STATE_DIR}/triggers/${ticket}-dev-complete"
    
    stage "STAGE 3/6: Dev - Waiting for Agent"
    
    log "Polling for completion: $trigger_file"
    log "Timeout: None (waiting indefinitely)"
    
    local dots=0
    while [[ ! -f "$trigger_file" ]]; do
        sleep 30
        dots=$(( (dots + 1) % 4 ))
        printf "\rWaiting%s" "$(printf '%*s' $dots | tr ' ' '.')"
    done
    printf "\r"
    
    success "Agent completed $ticket!"
    
    # Verify commits
    cd "$REPO_PATH"
    git fetch origin "feature/${ticket}" 2>/dev/null || true
    local commits
    commits=$(git log --oneline main.."origin/feature/${ticket}" 2>/dev/null | wc -l | tr -d ' ')
    
    if [[ "$commits" -eq 0 ]]; then
        commits=$(git log --oneline main.."feature/${ticket}" 2>/dev/null | wc -l | tr -d ' ')
    fi
    
    if [[ "$commits" -gt 0 ]]; then
        success "Verified: $commits commits"
    else
        warn "No commits found"
    fi
    
    # Cleanup
    rm -f "$trigger_file"
    
    complete_remy_step "$ticket" "Development" "dev"
    update_state "$ticket" "dev" "completed"
}

stage_verify() {
    local ticket="$1" title="$2"
    local branch="feature/${ticket}"
    local trigger_file="${RALPH_STATE_DIR}/triggers/${ticket}-verify-complete"
    local template="${RALPH_STATE_DIR}/pending/verify-agent-task.md"
    local task_file="${RALPH_STATE_DIR}/pending/${ticket}-verify-task.md"
    
    stage "STAGE 4/6: Verify"
    
    # Check if verify agent already spawned
    if [[ "$(is_agent_spawned "$ticket" "verify")" == "true" ]]; then
        log "Verify agent already spawned. Waiting for completion..."
        
        # Wait for completion trigger
        local dots=0
        while [[ ! -f "$trigger_file" ]]; do
            sleep 30
            dots=$(( (dots + 1) % 4 ))
            printf "\rWaiting for verify agent%s" "$(printf '%*s' $dots | tr ' ' '.')"
        done
        printf "\r"
        
        success "Verify agent completed!"
        rm -f "$trigger_file"
        
        # Mark phase complete
        jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.agents.verify.completed = true | .agents.verify.completed_at = $now | .stages.verify.status = "completed"' \
            "${RALPH_STATE_DIR}/tickets/${ticket}.json" > "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" && \
            mv "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" "${RALPH_STATE_DIR}/tickets/${ticket}.json"
        
        complete_remy_step "$ticket" "Self-Verification" "dev"
        return 0
    fi
    
    update_state "$ticket" "verify" "running"
    
    # Check template exists
    if [[ ! -f "$template" ]]; then
        error "Verify agent template not found: $template"
        return 1
    fi
    
    # Prepare verify task file from template
    cp "$template" "$task_file"
    sed -i.bak \
        -e "s|REPLACE_TICKET|$ticket|g" \
        -e "s|REPLACE_TITLE|$title|g" \
        -e "s|REPLACE_REPO|$REPO_PATH|g" \
        -e "s|REPLACE_BRANCH|$branch|g" \
        -e "s|REPLACE_TRIGGER|$trigger_file|g" \
        "$task_file"
    rm -f "${task_file}.bak"
    
    # Mark verify agent as spawned (without session_id since user spawns manually)
    mark_agent_spawned "$ticket" "verify" "USER_MANUAL"
    
    # Update stage to show we're waiting
    update_state "$ticket" "verify" "waiting"
    
    # Output instructions for user
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  VERIFY AGENT TASK PREPARED"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Ticket: $ticket"
    echo "Phase: Verify"
    echo "Task file: $task_file"
    echo ""
    echo "--- AGENT TASK ---"
    cat "$task_file"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "SPAWN COMMAND:"
    echo ""
    echo "sessions_spawn agentId='qa-agent' mode='run' taskFile='${task_file}'"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    exit 0
}

stage_qa() {
    local ticket="$1" title="$2"
    local branch="feature/${ticket}"
    local trigger_file="${RALPH_STATE_DIR}/triggers/${ticket}-qa-complete"
    local template="${RALPH_STATE_DIR}/pending/qa-agent-task.md"
    local task_file="${RALPH_STATE_DIR}/pending/${ticket}-qa-task.md"
    
    stage "STAGE 5/6: QA"
    
    # Check if QA agent already spawned
    if [[ "$(is_agent_spawned "$ticket" "qa")" == "true" ]]; then
        log "QA agent already spawned. Waiting for completion..."
        
        # Wait for completion trigger
        local dots=0
        while [[ ! -f "$trigger_file" ]]; do
            sleep 30
            dots=$(( (dots + 1) % 4 ))
            printf "\rWaiting for QA agent%s" "$(printf '%*s' $dots | tr ' ' '.')"
        done
        printf "\r"
        
        success "QA agent completed!"
        rm -f "$trigger_file"
        
        # Mark phase complete
        jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.agents.qa.completed = true | .agents.qa.completed_at = $now | .stages.qa.status = "completed"' \
            "${RALPH_STATE_DIR}/tickets/${ticket}.json" > "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" && \
            mv "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" "${RALPH_STATE_DIR}/tickets/${ticket}.json"
        
        complete_remy_step "$ticket" "Testing" "qa"
        move_ticket "$ticket" "In QA"
        return 0
    fi
    
    update_state "$ticket" "qa" "running"
    
    # Check template exists
    if [[ ! -f "$template" ]]; then
        error "QA agent template not found: $template"
        return 1
    fi
    
    # Prepare QA task file from template
    cp "$template" "$task_file"
    sed -i.bak \
        -e "s|REPLACE_TICKET|$ticket|g" \
        -e "s|REPLACE_TITLE|$title|g" \
        -e "s|REPLACE_REPO|$REPO_PATH|g" \
        -e "s|REPLACE_BRANCH|$branch|g" \
        -e "s|REPLACE_TRIGGER|$trigger_file|g" \
        "$task_file"
    rm -f "${task_file}.bak"
    
    # Mark QA agent as spawned
    mark_agent_spawned "$ticket" "qa" "USER_MANUAL"
    
    # Update stage to show we're waiting
    update_state "$ticket" "qa" "waiting"
    
    # Output instructions for user
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  QA AGENT TASK PREPARED"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Ticket: $ticket"
    echo "Phase: QA"
    echo "Task file: $task_file"
    echo ""
    echo "--- AGENT TASK ---"
    cat "$task_file"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "SPAWN COMMAND:"
    echo ""
    echo "sessions_spawn agentId='qa-agent' mode='run' taskFile='${task_file}'"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    exit 0
}

stage_merge() {
    local ticket="$1" title="$2"
    local branch="feature/${ticket}"
    local trigger_file="${RALPH_STATE_DIR}/triggers/${ticket}-tech-lead-complete"
    local template="${RALPH_STATE_DIR}/pending/tech-lead-agent-task.md"
    local task_file="${RALPH_STATE_DIR}/pending/${ticket}-tech-lead-task.md"
    
    stage "STAGE 6/6: Merge"
    
    # Check if tech-lead agent already spawned
    if [[ "$(is_agent_spawned "$ticket" "tech_lead")" == "true" ]]; then
        log "Tech-lead agent already spawned. Waiting for completion..."
        
        # Wait for completion trigger
        local dots=0
        while [[ ! -f "$trigger_file" ]]; do
            sleep 30
            dots=$(( (dots + 1) % 4 ))
            printf "\rWaiting for tech-lead agent%s" "$(printf '%*s' $dots | tr ' ' '.')"
        done
        printf "\r"
        
        success "Tech-lead agent completed!"
        rm -f "$trigger_file"
        
        # Mark phase complete
        jq --arg now "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            '.agents.tech_lead.completed = true | .agents.tech_lead.completed_at = $now | .stages.merge.status = "completed"' \
            "${RALPH_STATE_DIR}/tickets/${ticket}.json" > "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" && \
            mv "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" "${RALPH_STATE_DIR}/tickets/${ticket}.json"
        
        complete_remy_step "$ticket" "Code Review & Merge" "tech_lead"
        move_ticket "$ticket" "Closed/Done"
        
        # Finalize
        jq '.status = "completed" | .completed_at = "'"$(date -u +%Y-%m-%dT%H:%M:%S)Z"'"' \
            "${RALPH_STATE_DIR}/tickets/${ticket}.json" > "${RALPH_STATE_DIR}/completed/${ticket}.json"
        rm -f "${RALPH_STATE_DIR}/tickets/${ticket}.json"
        
        success "$ticket COMPLETE - PR merged and ticket closed!"
        return 0
    fi
    
    update_state "$ticket" "merge" "running"
    
    cd "$REPO_PATH"
    
    # Check if PR already exists
    local existing_pr
    existing_pr=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || echo "null")
    
    local pr_number=""
    
    if [[ -n "$existing_pr" && "$existing_pr" != "null" ]]; then
        pr_number="$existing_pr"
        log "Existing PR found: #$pr_number"
    else
        # Create PR
        log "Creating PR for $ticket..."
        local pr_url
        pr_url=$(gh pr create --title "${ticket}: ${title}" --body "Closes ${ticket}

## Summary
${title}

## Changes
- Implementation complete
- Tests passing
- Code reviewed" --base main --head "$branch" 2>/dev/null || echo "")
        
        if [[ -z "$pr_url" ]]; then
            error "Failed to create PR"
            return 1
        fi
        
        # Extract PR number from URL
        pr_number=$(echo "$pr_url" | sed 's/.*\/pull\/\([0-9]*\)$/\1/')
        log "Created PR #$pr_number: $pr_url"
    fi
    
    # Save PR to ticket state
    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    jq --arg num "$pr_number" --arg url "${REPO_PATH}/pull/${pr_number}" --arg now "$now" \
        '.pr.number = $num | .pr.url = $url | .pr.created_at = $now' \
        "${RALPH_STATE_DIR}/tickets/${ticket}.json" > "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" && \
        mv "${RALPH_STATE_DIR}/tickets/${ticket}.json.tmp" "${RALPH_STATE_DIR}/tickets/${ticket}.json"
    
    # Link PR to ticket via Remy API
    if [[ -d "$REMY_CLI" ]]; then
        log "Linking PR #$pr_number to ticket $ticket..."
        # Get ticket ID from ticket number
        local ticket_id
        ticket_id=$(cd "$REMY_CLI" && node src/index.js show "$ticket" --json 2>/dev/null | jq -r '.id // empty')
        if [[ -n "$ticket_id" ]]; then
            curl -s -X POST "${REMY_API_URL:-http://localhost:3000}/api/tickets/${ticket_id}/links" \
                -H "Content-Type: application/json" \
                -d "{\"type\":\"pr\",\"url\":\"${REPO_PATH}/pull/${pr_number}\",\"title\":\"PR #${pr_number}\"}" 2>/dev/null || true
        fi
    fi
    
    # Check template exists
    if [[ ! -f "$template" ]]; then
        error "Tech-lead agent template not found: $template"
        return 1
    fi
    
    # Prepare tech-lead task file from template
    cp "$template" "$task_file"
    sed -i.bak \
        -e "s|REPLACE_TICKET|$ticket|g" \
        -e "s|REPLACE_TITLE|$title|g" \
        -e "s|REPLACE_REPO|$REPO_PATH|g" \
        -e "s|REPLACE_BRANCH|$branch|g" \
        -e "s|REPLACE_PR|$pr_number|g" \
        -e "s|REPLACE_TRIGGER|$trigger_file|g" \
        "$task_file"
    rm -f "${task_file}.bak"
    
    # Mark tech-lead agent as spawned
    mark_agent_spawned "$ticket" "tech_lead" "USER_MANUAL"
    
    # Update stage to show we're waiting
    update_state "$ticket" "merge" "waiting"
    
    # Output instructions for user
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  TECH-LEAD AGENT TASK PREPARED"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Ticket: $ticket"
    echo "PR: #$pr_number"
    echo "Phase: Merge (Tech Lead Review)"
    echo "Task file: $task_file"
    echo ""
    echo "--- AGENT TASK ---"
    cat "$task_file"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "SPAWN COMMAND:"
    echo ""
    echo "sessions_spawn agentId='tech-lead-agent' mode='run' taskFile='${task_file}'"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    exit 0
}

# ═══════════════════════════════════════════════════════════
# MAIN WORKFLOW
# ═══════════════════════════════════════════════════════════

run_stages() {
    local ticket="$1"
    local details title stage
    
    # Detect project and set up variables
    init_state
    setup_project_vars "$ticket"
    
    details=$(get_ticket_details "$ticket")
    title=$(echo "$details" | jq -r '.title // "Unknown"')
    
    log ""
    log "╔═══════════════════════════════════════════════════════════╗"
    log "║  RALPH ORCHESTRATOR v3                                    ║"
    log "║  Ticket: $ticket"
    log "║  Title: $title"
    log "╚═══════════════════════════════════════════════════════════╝"
    log ""
    
    # Create state if new
    if [[ ! -f "${RALPH_STATE_DIR}/tickets/${ticket}.json" ]]; then
        create_state "$ticket" "$title"
    fi
    
    # Resume from current stage
    stage=$(get_current_stage "$ticket")
    
    case "$stage" in
        planner)
            stage_planner "$ticket" "$title"
            stage_setup "$ticket" "$title"
            stage_dev_spawn "$ticket" "$title"  # Exits here
            ;;
        setup)
            stage_setup "$ticket" "$title"
            stage_dev_spawn "$ticket" "$title"  # Exits here
            ;;
        dev)
            # Check if we need to spawn or wait
            if [[ "$(get_stage_status "$ticket" dev)" == "running" ]]; then
                local spawned
                spawned=$(jq -r '.stages.dev.spawned // false' "${RALPH_STATE_DIR}/tickets/${ticket}.json")
                if [[ "$spawned" == "true" ]]; then
                    stage_dev_wait "$ticket" "$title"  # Wait for completion
                else
                    stage_dev_spawn "$ticket" "$title"  # Spawn and exit
                fi
            fi
            stage_verify "$ticket" "$title"
            stage_qa "$ticket" "$title"
            stage_merge "$ticket" "$title"
            ;;
        verify)
            stage_verify "$ticket" "$title"
            stage_qa "$ticket" "$title"
            stage_merge "$ticket" "$title"
            ;;
        qa)
            stage_qa "$ticket" "$title"
            stage_merge "$ticket" "$title"
            ;;
        merge)
            stage_merge "$ticket" "$title"
            ;;
        completed)
            log "Ticket $ticket already complete!"
            ;;
        *)
            error "Unknown stage: $stage"
            return 1
            ;;
    esac
    
    log ""
    log "╔═══════════════════════════════════════════════════════════╗"
    log "║  ✅ TICKET $ticket COMPLETE"
    log "╚═══════════════════════════════════════════════════════════╝"
    log ""
}

# ═══════════════════════════════════════════════════════════
# COMMAND HANDLING
# ═══════════════════════════════════════════════════════════

case "${1:-}" in
    --spawn|-s)
        [[ -z "${2:-}" ]] && { error "Usage: $0 --spawn TICKET"; exit 1; }
        init_state
        run_stages "$2"
        ;;
    --resume|-r)
        [[ -z "${2:-}" ]] && { error "Usage: $0 --resume TICKET"; exit 1; }
        init_state
        run_stages "$2"
        ;;
    --loop|-l)
        init_state
        log "Starting Ralph Loop..."
        while true; do
            local ticket
            ticket=$(cd "$REMY_CLI" && node src/index.js list --status "Dev Backlog" --json 2>/dev/null | \
                jq -r '.[0] | select(. != null) | .ticket_number' 2>/dev/null || echo "")
            
            if [[ -z "$ticket" ]]; then
                log "No tickets. Sleeping 5m..."
                sleep 300
                continue
            fi
            
            log "Processing: $ticket"
            if run_stages "$ticket"; then
                log "✓ $ticket done"
            else
                error "$ticket failed, continuing..."
                sleep 60
            fi
        done
        ;;
    --status)
        init_state
        log "Ralph Orchestrator v3 - Status"
        log "=============================="
        local ticket_files
        ticket_files=$(find "${RALPH_STATE_DIR}/tickets" -name "*.json" 2>/dev/null 2>/dev/null || true)
        for f in $ticket_files; do
            [[ -f "$f" ]] || continue
            local t s
            t=$(jq -r '.ticket' "$f")
            s=$(jq -r '.current_stage' "$f")
            echo "  $t: $s"
        done
        ;;
    --help|-h|*)
        echo "Ralph Orchestrator v3"
        echo ""
        echo "Commands:"
        echo "  --spawn TICKET    Start processing a ticket (spawns agent, exits)"
        echo "  --resume TICKET   Continue after agent completes"
        echo "  --loop            Continuous processing"
        echo "  --status          Show active tickets"
        echo ""
        echo "Workflow: Planner → Setup → Dev (spawn) → [wait] → Verify → QA → Merge"
        ;;
esac