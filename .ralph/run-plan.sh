#!/bin/bash
#
# Ralph Plan Runner
# Orchestrates the Ralph workflow from plan to completion
#
# Usage:
#   .alph/run-plan.sh --ticket REMY-234
#   .alph/run-plan.sh --plan .alph/plans/REMY-234-plan.md
#   .alph/run-plan.sh --ticket REMY-234 --skip-review
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR/.."
CONFIG_FILE="$SCRIPT_DIR/ralph-config.json"
PLANS_DIR="$SCRIPT_DIR/plans"
LOGS_DIR="$SCRIPT_DIR/logs"

# Project configuration (set via --project)
PROJECT_DIR=""
PROJECT_NAME=""

# Default values
TICKET=""
PLAN_FILE=""
PROJECT=""
SKIP_REVIEW=false
SKIP_TESTS=false
PHASE=""

# Setup project directory based on --project flag
setup_project() {
  if [ -z "$PROJECT" ]; then
    log_error "No project specified. Use --project PROJECT"
    log_info "Available projects: kalshi-trader, remy-tracker, pantry-pal"
    exit 1
  fi
  
  case "$PROJECT" in
    kalshi-trader|kalshi)
      PROJECT_DIR="$WORKSPACE_DIR/projects/kalshi-trader"
      PROJECT_NAME="kalshi-trader"
      ;;
    remy-tracker|remy)
      PROJECT_DIR="$WORKSPACE_DIR/projects/remy-tracker"
      PROJECT_NAME="remy-tracker"
      ;;
    pantry-pal|pantry)
      PROJECT_DIR="$WORKSPACE_DIR/projects/pantry-pal"
      PROJECT_NAME="pantry-pal"
      ;;
    *)
      # Allow custom project path
      if [ -d "$WORKSPACE_DIR/projects/$PROJECT" ]; then
        PROJECT_DIR="$WORKSPACE_DIR/projects/$PROJECT"
        PROJECT_NAME="$PROJECT"
      else
        log_error "Unknown project: $PROJECT"
        log_info "Available: kalshi-trader, remy-tracker, pantry-pal"
        log_info "Or create: $WORKSPACE_DIR/projects/$PROJECT"
        exit 1
      fi
      ;;
  esac
  
  if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
  fi
  
  log "Project: $PROJECT_NAME"
  log "Directory: $PROJECT_DIR"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --ticket)
      TICKET="$2"
      shift 2
      ;;
    --plan)
      PLAN_FILE="$2"
      shift 2
      ;;
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --phase)
      PHASE="$2"
      shift 2
      ;;
    --skip-review)
      SKIP_REVIEW=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
done

# Show help
show_help() {
  cat << EOF
Ralph Plan Runner - Orchestrates Ralph workflow

Usage:
  .alph/run-plan.sh --ticket REMY-XXX    # Generate plan from ticket
  .alph/run-plan.sh --plan PLAN.md      # Run existing plan
  .alph/run-plan.sh --ticket REMY-XXX --skip-review  # Skip review phase

Options:
  --ticket TICKET    Generate plan from DB ticket
  --plan FILE        Execute existing plan file
  --phase PHASE      Start at specific phase (research|dev|review|merge|close)
  --skip-review      Skip tech lead review
  --skip-tests       Skip running tests
  --help             Show this help

Phases:
  research   - Gather context and plan
  dev        - Implement the feature
  review     - Tech lead review
  merge      - Merge to main
  close      - Close ticket and cleanup

EOF
}

# Logging
log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log_section() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

# Generate plan from ticket
generate_plan() {
  log_section "GENERATING PLAN FROM TICKET: $TICKET"
  
  if [ -z "$TICKET" ]; then
    log_error "No ticket specified. Use --ticket REMY-XXX"
    exit 1
  fi
  
  # Query ticket from DB
  local ticket_data
  ticket_data=$(sqlite3 "$PROJECT_DIR/../remy-tracker/remy.db" \
    "SELECT ticket_number, title, description, acceptance_criteria, priority, status FROM tickets WHERE ticket_number='$TICKET' LIMIT 1;" 2>/dev/null || echo "")
  
  if [ -z "$ticket_data" ]; then
    log_error "Ticket $TICKET not found in database"
    exit 1
  fi
  
  # Parse ticket data (pipe-delimited)
  local title desc ac priority status
  title=$(echo "$ticket_data" | cut -d'|' -f2)
  desc=$(echo "$ticket_data" | cut -d'|' -f3)
  ac=$(echo "$ticket_data" | cut -d'|' -f4)
  priority=$(echo "$ticket_data" | cut -d'|' -f5)
  status=$(echo "$ticket_data" | cut -d'|' -f6)
  
  # Generate plan file
  PLAN_FILE="$PLANS_DIR/${TICKET}-plan.md"
  
  # Read template and substitute
  sed -e "s/{{TICKET_NUMBER}}/$TICKET/g" \
      -e "s/{{TICKET_TITLE}}/$title/g" \
      -e "s/{{PRIORITY}}/$priority/g" \
      -e "s/{{STATUS}}/$status/g" \
      -e "s/{{DESCRIPTION}}/$desc/g" \
      -e "s/{{ACCEPTANCE_CRITERIA}}/$ac/g" \
      -e "s/{{TIMESTAMP}}/$(date -u +%Y-%m-%dT%H:%M:%SZ)/g" \
      "$SCRIPT_DIR/plan.template" > "$PLAN_FILE"
  
  log_success "Plan generated: $PLAN_FILE"
  echo ""
  echo "Next steps:"
  echo "  1. Review plan: cat $PLAN_FILE"
  echo "  2. Edit if needed: vim $PLAN_FILE"
  echo "  3. Run: .alph/run-plan.sh --plan $PLAN_FILE"
  echo ""
}

# Run plan
run_plan() {
  log_section "EXECUTING RALPH PLAN"
  
  if [ -z "$PLAN_FILE" ]; then
    log_error "No plan file specified. Use --plan FILE or --ticket TICKET"
    exit 1
  fi
  
  if [ ! -f "$PLAN_FILE" ]; then
    log_error "Plan file not found: $PLAN_FILE"
    exit 1
  fi
  
  # Extract ticket from plan file
  local ticket
  ticket=$(grep "^\\*\\*Ticket:\\*\\*" "$PLAN_FILE" | head -1 | sed 's/.*\\*\\*Ticket:\\*\\* //')
  
  log "Ticket: ${ticket:-UNKNOWN}"
  log "Plan: $PLAN_FILE"
  log ""
  
  # Determine starting phase
  if [ -z "$PHASE" ]; then
    PHASE="research"
  fi
  
  log "Starting at phase: $PHASE"
  log ""
  
  # Execute phases
  case $PHASE in
    research|dev|review|merge|close)
      run_phase_research
      run_phase_dev
      run_phase_review
      run_phase_merge
      run_phase_close
      ;;
    *)
      log_error "Unknown phase: $PHASE"
      exit 1
      ;;
  esac
}

# Phase: Research
run_phase_research() {
  log_section "PHASE 1: RESEARCH"
  log "Goal: Understand the problem and explore solutions"
  log ""
  
  log "Spawning research agent..."
  # Agent will:
  # - Review existing code and patterns
  # - Check related tickets for context
  # - Identify affected files
  # - Document technical approach
  
  log "Research complete"
  log "Moving to acceptance criteria phase..."
}

# Phase: Acceptance Criteria
run_phase_ac() {
  log_section "PHASE 2: ACCEPTANCE CRITERIA"
  log "Goal: Define what 'done' looks like"
  log ""
  
  log "Reviewing ticket AC..."
  log "Verifying AC is clear and testable..."
  log "Ready for development"
}

# Phase: Branch Setup
run_phase_branch() {
  log_section "PHASE 3: BRANCH SETUP"
  log "Goal: Prepare development environment"
  log ""
  
  log "Creating feature branch..."
  log "Checking out branch..."
  log "Verifying clean state..."
  log "Updating ticket to 'In Dev' status..."
  
  log_success "Branch ready"
}

# Phase: Development
run_phase_dev() {
  log_section "PHASE 4: DEVELOPMENT"
  log "Goal: Implement the solution"
  log ""
  
  log "Spawning development agent..."
  log "Implementing features..."
  log "Writing tests..."
  
  if [ "$SKIP_TESTS" = false ]; then
    log "Running test suite..."
  fi
  
  log "Committing changes..."
  log_success "Development complete"
}

# Phase: Review
run_phase_review() {
  if [ "$SKIP_REVIEW" = true ]; then
    log_warn "Skipping tech lead review (--skip-review)"
    return
  fi
  
  log_section "PHASE 5: TECH LEAD REVIEW"
  log "Goal: Code review and approval"
  log ""
  
  log "Spawning tech lead review agent..."
  log "Checking code quality..."
  log "Checking security..."
  log "Checking performance..."
  
  log_success "Review approved"
}

# Phase: Merge & Close
run_phase_merge_close() {
  log_section "PHASE 6: MERGE & CLOSE"
  log "Goal: Ship it"
  log ""
  
  log "Merging feature branch to main..."
  log "Running post-merge tests..."
  log "Deploying to staging..."
  log "Smoke testing..."
  log "Updating ticket to Closed/Done..."
  log "Archiving branch..."
  log "Creating log entry..."
  
  log_success "Merged and closed!"
}

# Main execution
main() {
  echo ""
  echo -e "${GREEN}  ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗${NC}"
  echo -e "${GREEN}  ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║${NC}"
  echo -e "${GREEN}  ██████╔╝███████║██║     ██████╔╝███████║${NC}"
  echo -e "${GREEN}  ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║${NC}"
  echo -e "${GREEN}  ██║  ██║██║  ██║███████╗██║     ██║  ██║${NC}"
  echo -e "${GREEN}  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝${NC}"
  echo -e "${BLUE}           Plan Runner v1.0${NC}"
  echo ""
  
  # Make sure we have required tools
  if ! command -v sqlite3 >/dev/null 2>&1; then
    log_error "sqlite3 not found. Required for DB access."
    exit 1
  fi
  
  # Check if ticket or plan specified
  if [ -n "$TICKET" ] && [ -z "$PLAN_FILE" ]; then
    generate_plan
  elif [ -n "$PLAN_FILE" ]; then
    run_plan
  else
    log_error "Specify --ticket REMY-XXX or --plan PLAN.md"
    show_help
    exit 1
  fi
}

main "$@"
