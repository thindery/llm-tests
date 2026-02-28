# Remy CLI Skill

Proper command structure for the Remy Ralph ticket tracker CLI.

## Installation

CLI is at: `/opt/homebrew/bin/remy`
Database is at: `~/projects/remy-tracker/remy.db`

## Commands

### Create Ticket
```bash
remy add "Ticket Title" \
  --type="Dev Task|Bug Fix|Research|Admin TODO" \
  --priority="High|Medium|Low|Critical" \
  --project="General|Pantry-Pal|Remy-Finance|etc" \
  --description="Description text - NO QUOTES WITHIN, use single quotes if needed"
```

**⚠️ CRITICAL:** Do NOT use double quotes inside description. Use single quotes or escape carefully.

**Good:**
```bash
remy add "Fix bug" --description="It's broken"
remy add "Fix bug" --description='The "thing" broke'
```

**Bad:**
```bash
remy add "Fix bug" --description="The "thing" broke"  # unmatched
```

### Add Acceptance Criteria
```bash
~/.openclaw/workspace/skills/ralph/ralph-ac.sh TICKET-001 \
  --given="user is on homepage" \
  --when="user clicks button" \
  --then="modal opens" \
  --sort=0
```

### Mark Phase Complete
```bash
~/.openclaw/workspace/skills/ralph/ralph-phase.sh TICKET-001 --mark=planner
```

Phases: planner, setup, dev, verify, test, review

### Update Status
```bash
remy update TICKET-001 --status="Dev Backlog"
remy move TICKET-001 --to="Dev Backlog"
```

### View Ticket
```bash
remy show TICKET-001
remy show TICKET-001 --json
```

## Rules

1. **Simple descriptions first** — Long descriptions with quotes WILL fail
2. **Use ralph-ac.sh** — Don't use `remy ac` (unreliable)
3. **Check activity** — After any change, verify with `remy show`
4. **Raw SQL last resort** — Only if CLI fails completely

## Valid Projects

- General
- Pantry-Pal
- Remy-Finance
- Sleep-Stories
- AgentAds
- Remy-Blog
- RemyCities (will need to be added)
