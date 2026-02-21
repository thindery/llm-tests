# Ralph Workflow Skill

**Purpose:** Guide for using the `remy` CLI with proper Ralph workflow tracking — ensuring tickets move through phases (Planner → Setup → Dev → Verify → Test → Review) with AC tracked in the official table.

---

## 🎯 Quick Reference

**Ralph = The workflow engine that tracks phases and AC for every ticket.**

| Phase | When Complete | Command |
|-------|---------------|---------|
| **Planner** | AC defined in table | Auto-complete via skill |
| **Setup** | Dev environment ready | Auto-complete via skill |
| **Dev** | Implementation done | Dev marks complete |
| **Verify** | Self-verification done | Dev marks complete |
| **Test** | QA testing complete | QA marks complete |
| **Review** | Code review done | Tech Lead marks complete |

---

## 🚀 Usage (One-Line Ticket Creation)

Use this skill when creating tickets — it ensures Ralph workflow is followed.

### Full Workflow Script

```bash
# Source the Ralph helper
source ~/.openclaw/workspace/skills/ralph/ralph-helper.sh

# Create ticket with full Ralph workflow
ralph-create "Ticket Title" "TICKET-123" --ac-file=./ac.json --type="Dev Task" --priority=High --project=General
```

This does:
1. ✅ Creates ticket via `remy add`
2. ✅ Inserts AC into `acceptance_criteria` table
3. ✅ Marks Planner phase complete
4. ✅ Marks Setup phase complete
5. ✅ Adds reference comment
6. ✅ Moves ticket to "In Dev"

---

## 📋 Step-by-Step (Manual)

If you need granular control, follow these steps:

### Step 1: Create Ticket

```bash
remy add "Ticket Title" \
  --type="Dev Task" \
  --priority=High \
  --project=General \
  --status="To Research" \
  --agent="pm" \
  --role="pm"
```

### Step 2: Add AC to Official Table

**Option A: Use ralph-ac helper (recommended)**
```bash
~/.openclaw/workspace/skills/ralph/ralph-ac.sh REMY-018 \
  --given="user is on the board" \
  --when="they click View Table" \
  --then="they see table" \
  --sort=0
```

**Option B: From JSON file**
```bash
~/.openclaw/workspace/skills/ralph/ralph-ac.sh REMY-018 --file=./ac.json
```

**Option C: Raw SQL (if needed)**
```bash
TICKET_ID=$(sqlite3 ~/projects/remy-tracker/remy.db \
  "SELECT id FROM tickets WHERE ticket_number='REMY-018';")

sqlite3 ~/projects/remy-tracker/remy.db <<EOF
INSERT INTO acceptance_criteria (ticket_id, given_text, when_text, then_text, sort_order, created_at)
VALUES ($TICKET_ID, 'given', 'when', 'then', 0, datetime('now'));
EOF
```

### Step 3: Mark Planner Phase Complete

```bash
~/.openclaw/workspace/skills/ralph/ralph-phase.sh REMY-018 --mark=planner
```

This executes:
```sql
UPDATE ralph_workflow_steps 
SET completed=1, completed_at=datetime('now'), completed_by='pm'
WHERE ticket_id=$TICKET_ID AND phase='Planner';
```

### Step 4: Mark Setup Phase Complete

```bash
~/.openclaw/workspace/skills/ralph/ralph-phase.sh REMY-018 --mark=setup
```

### Step 5: Add Reference Comment

```bash
remy comment REMY-018 "AC defined — see official AC tab ✓"
```

### Step 6: Move to Dev Backlog

```bash
remy move REMY-018 --to "In Dev" --role=pm
```

---

## 🔧 Helper Scripts

| Script | Purpose |
|--------|---------|
| `ralph-create.sh` | Full workflow in one command |
| `ralph-ac.sh` | Add AC to table |
| `ralph-phase.sh` | Mark phases complete |
| `ralph-status.sh` | Check ticket status |

---

## 📊 AC JSON Format

Create `ac.json`:
```json
[
  {
    "given": "user is on the Kanban board",
    "when": "they click the View Table link",
    "then": "they are navigated to /table route",
    "sort": 0
  },
  {
    "given": "the table view is displayed",
    "when": "user clicks on a column header",
    "then": "the table sorts by that column",
    "sort": 1
  }
]
```

---

## ✅ Verification

Check ticket status:
```bash
remy show REMY-018
```

View AC in table:
```bash
sqlite3 ~/projects/remy-tracker/remy.db \
  "SELECT sort_order, given_text, status FROM acceptance_criteria WHERE ticket_id=(SELECT id FROM tickets WHERE ticket_number='REMY-018') ORDER BY sort_order;"
```

Check Ralph phases:
```bash
sqlite3 ~/projects/remy-tracker/remy.db \
  "SELECT phase, completed, completed_by FROM ralph_workflow_steps WHERE ticket_id=(SELECT id FROM tickets WHERE ticket_number='REMY-018');"
```

Web UI:
- AC tab: http://localhost:3474/ticket/REMY-018?tab=ac
- Ralph tab: http://localhost:3474/ticket/REMY-018?tab=ralph

---

## 🛑 Common Mistakes

❌ **AC only in comments** — Won't show in AC tab, can't be checked off  
✅ **AC in `acceptance_criteria` table** — Proper checklist UI

❌ **Phases stay pending** — Ralph workflow not tracking progress  
✅ **Mark Planner/Setup complete after AC defined** — Clear phase visibility

❌ **Manual `remy move` skipping phases** — Breaks workflow tracking  
✅ **Let Ralph phases drive status** — Each phase has meaning

❌ **Committing directly to main** — Bypasses code review, pollutes history  
✅ **Use feature/REMY-XXX-* branches with PR** — Proper Git workflow

---

## 🌿 Branch Creation Workflow

**CRITICAL:** Every ticket MUST use a feature branch. Direct commits to `main` are forbidden.

### 1. BEFORE Any Dev Work: Create Feature Branch

```bash
git checkout -b feature/REMY-XXX-short-description
```

**Naming convention:** `feature/REMY-XXX-brief-description`
- Use the ticket number
- Keep description under 5 words
- Use hyphens, not spaces

### 2. BEFORE Any Commit: Verify Branch

```bash
git branch --show-current
```

✅ **Should show:** `feature/REMY-XXX-description`  
❌ **Should NOT show:** `main`

**Safety check (abort commit if on main):**
```bash
if [ "$(git branch --show-current)" = "main" ]; then
  echo "ERROR: You're on main! Create a feature branch first."
  exit 1
fi
```

### 3. Commit and Push to Feature Branch Only

```bash
git add .
git commit -m "REMY-XXX: Description of changes"
git push -u origin feature/REMY-XXX-description
```

### 4. Create PR to Main

```bash
# Create PR (GitHub CLI)
gh pr create --title "REMY-XXX: Ticket title" \
             --body "Implements REMY-XXX\n\nCloses REMY-XXX" \
             --base main
```

### 5. Tech Lead Merges After Review

- PR requires approval from Tech Lead
- All AC must pass before merge
- Squash and merge recommended

---

## ✅ Pre-Dev Checklist

Before writing any code, verify:

- [ ] Branch created: `feature/REMY-XXX-description`
- [ ] Working on feature branch (not main) — run `git branch --show-current`
- [ ] Will commit only to feature branch
- [ ] Plan to create PR when done
- [ ] Ralph ticket is in "In Dev" status

---

## 🎫 For Agent Spawning

When spawning ticket-create agents, instruct them:

1. **Create ticket** with `remy add`
2. **Insert AC** using `ralph-ac.sh` or SQL (NOT just comments)
3. **Mark Planner complete** via `ralph-phase.sh --mark=planner`
4. **Mark Setup complete** via `ralph-phase.sh --mark=setup`
5. **Add reference comment**: "AC set — see official AC tab"
6. **No manual status moves** — Ralph workflow controls progression

**Example agent instruction:**
```
Create ticket REMY-019 following Ralph workflow:
- Use skill: ralph
- Create ticket with remy add
- Add AC via ralph-ac.sh
- Mark phases via ralph-phase.sh
- Reference comment: "AC in official table"
```

---

## 📁 File Locations

```
~/.openclaw/workspace/skills/ralph/
├── SKILL.md              # This file
├── ralph-create.sh     # Full workflow script
├── ralph-ac.sh         # Add AC helper
├── ralph-phase.sh      # Mark phases helper
├── ralph-status.sh     # Check status
├── ralph-helper.sh     # Source-able functions
└── examples/
    └── ac-template.json
```

---

## 🔗 Related

- Remy CLI: `remy --help`
- Ticket table: `acceptance_criteria` in remy.db
- Ralph phases: `ralph_workflow_steps` in remy.db
- Web UI: http://localhost:3474

---

**Last Updated:** 2026-02-21  
**Skill Version:** 1.0

## 🧠 Planner Agent Workflow

**Agent Role:** Architect 🤖  
**Job:** Create official acceptance criteria in the table  
**PM writes description**, **Planner defines "done"**

### Why Planner Agent?

PM shouldn't write detailed AC. Provide:
- Feature description
- User story
- Technical notes
- Suggested AC (high-level bullets)

**Planner** creates testable AC in the official table.

### Workflow

**Step 1: PM Creates Ticket**
```bash
remy add "Feature Title" --type="Dev Task" --priority=High
```
Include: overview, user story, suggested AC, technical notes, questions

**Step 2: PM Spawns Planner**
```bash
sessions_spawn \
  --task="Plan REMY-XXX: Create 5-8 official AC in acceptance_criteria table (Gherkin given/when/then), mark Planner complete" \
  --agent="architect" \
  --label="planner-REMY-XXX"
```

**Step 3: Planner Creates AC**
- Reviews description
- Thinks through implementation
- Adds AC to `acceptance_criteria` table
- Marks Planner phase: `ralph-phase.sh REMY-XXX --mark=planner`
- Reports back

**Step 4: PM Reviews & Advances**
```bash
# Check AC
remy show REMY-XXX
ralph-status.sh REMY-XXX

# Advance phases
ralph-phase.sh REMY-XXX --mark=setup
remy move REMY-XXX --to "In Dev"
sessions_spawn --task="Implement..." --agent="dev" --label="dev-REMY-XXX"
```

### Ralph Workflow Roles

| Phase | Agent | Job |
|-------|-------|-----|
| Create Ticket | PM | Description + suggest AC |
| **Planner** | **Planner** | Official AC in table |
| Setup | PM | Confirm environment |
| Dev | Dev | Implement |
| Verify | Dev | Self-verify |
| Test | QA | Test AC |
| Review | Tech Lead | Code review |

### Good AC Guidelines (for Planner)

| Good | Bad |
|------|-----|
| "Given user on board, when click View Table, then navigate to /table" | "Create table view" |
| Given/when/then format | Vague bullets |
| Pass/fail testable | Subjective |
| Atomic (one thing) | Combined "and also..." |

---

## 🤖 Agent Task Templates

**Planner:**
```
Plan REMY-XXX. Review description, create 5-8 official AC in 
acceptance_criteria table (Gherkin format: given/when/then).
Mark Planner phase complete. Report AC summary.
```

**Dev:**
```
Implement REMY-XXX per official AC in table.

BRANCH WORKFLOW (MANDATORY):
1. Create feature branch: git checkout -b feature/REMY-XXX-short-desc
2. Verify: git branch --show-current (should show feature/*, NOT main)
3. Do all work on feature branch
4. Commit/push to feature branch only
5. Create PR when done — Tech Lead merges

Mark Dev + Verify phases complete. Report blockers.
```

**QA:**
```
Test REMY-XXX against official AC. Mark Test phase complete. 
Report PASS/FAIL for each AC.
```

**Tech Lead:**
```
Review REMY-XXX code. Mark Review phase complete. Merge if approved.
```
