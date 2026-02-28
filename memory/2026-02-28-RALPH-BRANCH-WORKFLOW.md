# Ralph Workflow Update: Branch Discipline Enforcement

**Date:** 2026-02-28  
**Issue:** Agents committing all work to single branch, no PRs visible  
**Fix:** Automated branch creation + workflow enforcement

## The Problem

Dev agents were:
- Working on existing branch `TASK-077-stripe-integration`
- Mixing 4 different features on one branch
- Not creating feature branches per ticket
- Not pushing regularly
- No visible PRs for code review

## The Solution

### 1. Updated `ralph-helper.sh`

**New function: `ralph-branch`**
- Creates properly named feature branches: `feature/TICKET-XXX-description`
- Checks out from origin/main
- Pushes branch to origin immediately
- Auto-adds git hook to prefix commits with ticket number

**Updated function: `ralph-create`**
- Step 7 now automatically creates feature branch
- Agent gets clear warning about branch workflow
- Branch creation is part of ticket setup

### 2. Agent Workflow Requirements

**BEFORE starting work:**
```bash
source ~/.openclaw/workspace/skills/ralph/ralph-helper.sh
ralph-branch TASK-XXX "short-description"
```

**WHILE working:**
```bash
# Commit regularly
git add .
git commit -m "what was done"  # Hook auto-adds TICKET-XXX:

# Push frequently
git push origin feature/TASK-XXX-description
```

**WHEN done:**
- Notify that branch is ready for PR
- Do NOT merge - tech lead handles that

### 3. Branch Naming Convention

Format: `feature/TICKET-XXX-kebab-case-description`

Examples:
- `feature/TASK-078-landing-dashboard`
- `feature/RC-SECURITY-001-rate-limiting`
- `feature/PAIGE-011-chat-mobile-spacing`

### 4. Critical Rules

❌ **FORBIDDEN:**
- Working on main/master
- Working on someone else's branch
- Mixing multiple tickets on one branch
- Committing without ticket reference
- Keeping work local (not pushing)

✅ **REQUIRED:**
- One branch per ticket
- Branch created BEFORE work starts
- Push after every significant commit
- Clear commit messages
- Tech lead merges approved PRs

## Current Status

**Pending PR:** https://github.com/thindery/llm-tests/pull/new/TASK-077-stripe-integration
- Contains 4 mixed features
- Tech lead reviewing now
- Will merge combined PR this time

**Future work:** All agents use proper branch workflow

## Files Modified

1. `/skills/ralph/ralph-helper.sh` - Added branch creation workflow

## Verification

To verify agents are following workflow:
```bash
git branch -r | grep feature
# Should see feature/TASK-XXX-* branches

git log --oneline feature/TASK-XXX-description
# Should see ticket-prefixed commits
```
