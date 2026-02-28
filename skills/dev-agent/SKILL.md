# Dev Agent Skill

## ⚠️ PRE-FLIGHT CHECK (MANDATORY)

Every dev task MUST begin with this repository verification:

```bash
# PRE-FLIGHT CHECK (MANDATORY)
if [[ "$PWD" != *"/projects/remy-tracker"* ]]; then
  echo "ERROR: Must run from ~/projects/remy-tracker/"
  echo "Current: $PWD"
  exit 1
fi
```

## 🚨 CRITICAL: BRANCH WORKFLOW (MANDATORY)

**ONE TICKET = ONE BRANCH. NO EXCEPTIONS.**

### Dev Task Startup Protocol

1. **Navigate to repo:** `cd ~/projects/remy-tracker`
2. **Verify location:** Run `pwd` and confirm output includes `/projects/remy-tracker`
3. **Check git status:** Run `git status` to verify it's a valid git repo
4. **CREATE FEATURE BRANCH (REQUIRED):**
   ```bash
   # Source Ralph helpers
   source ~/.openclaw/workspace/skills/ralph/ralph-helper.sh
   
   # Create and checkout feature branch
   ralph-branch TICKET-XXX "short-description"
   # Example: ralph-branch TASK-078 "landing-dashboard"
   ```
5. **Verify branch:** Run `git branch` and confirm you're on `feature/TICKET-XXX-*`
6. **Do ALL work on this branch**
7. **Commit and push regularly**

### Branch Rules (ENFORCED)

❌ **FORBIDDEN - Will be rejected:**
- Working directly on `main` or `master`
- Working on existing/old branches
- Working on `TASK-077-stripe-integration` (mixing features)
- Mixing multiple tickets on one branch
- Keeping work local for extended periods

✅ **REQUIRED:**
- Branch name format: `feature/TICKET-XXX-kebab-description`
- Branch created BEFORE any code changes
- Push to origin after every commit: `git push origin feature/TICKET-XXX-*`
- Commit messages prefixed with ticket: `TICKET-XXX: what was changed`
- Only ONE ticket per branch

**DO NOT PROCEED** if branch creation fails. Abort and report the issue.

---

## Role

You are a Development Agent focused on writing code, implementing features, and fixing bugs.

## Responsibilities

- Write clean, maintainable code based on specifications
- Follow existing code patterns and conventions
- Add tests where appropriate
- Document significant changes

## Workflow

### At Task Start

1. **Create feature branch (REQUIRED):** Use `ralph-branch` helper
2. Read relevant code context from the codebase
3. Understand the existing architecture
4. Clarify any ambiguities before starting work

### During Work - Commit & Push Protocol

**Commit frequently (every 30-60 minutes of work):**
```bash
git add .
git commit -m "TICKET-XXX: what was changed"
```

**Push to origin after EVERY commit:**
```bash
git push origin feature/TICKET-XXX-description
```

**Why push frequently:**
- User can see progress in GitHub
- Work is backed up
- Enables code review during development
- Shows visible PR branches

1. Write the minimal code needed to solve the problem
2. Follow existing patterns in the codebase
3. Add comments explaining complex logic
4. Test your changes when possible
5. **Commit and push after every logical chunk of work**

### AFTER WORK: Auto-Advance Phase (MANDATORY)

**✨ NEW: Automated Phase Advancement (TASK-042)**

After finishing implementation, automatically advance the ticket using the new automation:

**Option 1: Shell Command**
```bash
# Auto-complete Dev + Verify, advance to In QA
~/.openclaw/workspace/skills/ralph/auto-phase-advance dev-complete REMY-XXX
```

**Option 2: Via TypeScript API**
```typescript
import { completeDevPhase } from './auto-phase-advance.ts';

await completeDevPhase('REMY-XXX');
// Automatically:
// - Marks Dev phase complete
// - Marks Verify phase complete (self-verification)
// - Advances ticket to "In QA"
// - Preserves activity tracking
```

**Option 3: Check Status First**
```bash
# See current phase status
~/.openclaw/workspace/skills/ralph/auto-phase-advance status REMY-XXX

# Example output:
# 🦞 REMY-042 Phase Status:
#   ✅ Planner: complete
#   ✅ Setup: complete
#   ✅ Dev: complete
#   ⏳ Verify: pending
#   ⏳ Test: pending
```

**What Happens Automatically:**
1. ✅ Marks Dev phase complete with "dev-agent" actor
2. ✅ Marks Verify phase complete (self-verification)
3. ✅ Advances ticket status to "In QA"
4. 📝 Activity tracking preserved in system logs

**Confirmation:**
```
Ticket {number} auto-advanced: Dev → In QA ✅
```

**DO NOT wait for Remy** — the automation handles it!

## Tools

- Use `read` to examine existing code
- Use `write` to create new files
- Use `edit` to modify existing files
- Use `exec` to run tests or build commands
