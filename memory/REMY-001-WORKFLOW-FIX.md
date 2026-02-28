# REMY-001 Ticket Workflow Fix

## Root Cause

**Option D: Agent handoff completion doesn't populate AC properly**

The workflow enforced acceptance criteria (AC) completion before allowing Planner phase steps to complete, but there was **no automatic AC generation** implemented for the "Researcher Agent" and "Planner Agent" mentioned in the requirements.

### Key Issues Found:

1. **Tickets created directly with 'Dev Backlog' status** - Skipping discovery/triage phases where AC should be populated
2. **No Researcher Agent implementation** - AC not auto-generated from ticket descriptions during creation
3. **No Planner Agent implementation** - AC not refined when completing planning phase
4. **Nudge blocked on missing AC** - But couldn't auto-generate it

## Changes Made

### 1. Fixed Ticket Creation Flow (`src/app/api/tickets/route.ts`)

- **Changed initial status** from `'Dev Backlog'` to `'To Research'` for Dev Tasks and Bug Fixes
- **Added Researcher Agent AC auto-generation** during ticket creation
- AC is parsed from description using keyword analysis
- Logs Researcher Agent activity

### 2. Created AC Generator Library (`src/lib/ac-generator.ts`)

- `generateACFromDescription()`: Analyzes description keywords to generate Gherkin-formatted AC
- `refineAC()`: Planner Agent behavior to normalize AC format
- Detects: user actions, CRUD operations, validation, auth, API, bug fixes
- Caps at 6 AC items to prevent overload

### 3. Enhanced Nudge Logic (`src/lib/nudge.ts`)

- **Auto-generates AC on nudge** if missing when in 'To Research' or 'Tylor Decision'
- Falls back to blocking message only if generation fails or no description
- Researcher Agent activity logged

### 4. Added Planner Agent Refinement (`src/app/api/tickets/[id]/ralph/steps/[stepId]/complete/route.ts`)

- **Auto-refines AC** when completing a Planner phase step
- Adds Given/When/Then prefixes if missing
- Logs Planner Agent activity
- Doesn't block completion if refinement fails

## Test Plan

### 1. Create New Ticket Test

```bash
# Create a Dev Task ticket
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add user login form",
    "description": "Create a login form with email validation and password requirements. Users should see validation errors.",
    "type": "Dev Task",
    "priority": "High"
  }'
```

**Expected:**
- Ticket created with status `'To Research'`
- AC auto-populated (2-4 items based on description)
- Activity log shows "Researcher Agent auto-populated acceptance criteria"

### 2. Nudge Ticket Test

```bash
# Nudge the ticket
curl -X POST http://localhost:3000/api/tickets/1/nudge \
  -H "Content-Type: application/json"
```

**Expected:**
- If AC missing: Researcher Agent generates AC, completes Planner step, suggests moving to Dev Backlog
- If AC exists: Completes next Planner step

### 3. Complete Planner Step Test

```bash
# Complete the Requirements & Planning step
curl -X POST http://localhost:3000/api/tickets/1/ralph/steps/1/complete \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

**Expected:**
- Step completes successfully (AC exists check passes)
- AC is refined by Planner Agent (Given/When/Then prefixes added)
- Activity log shows "Planner Agent refined acceptance criteria"

### 4. Existing Ticket Backfill Test

For tickets REMY-001 and others created before this fix:

1. Move ticket to 'To Research' status
2. Run nudge
3. Researcher Agent should auto-generate AC
4. Ticket can now proceed

## Verification Checklist

- [ ] New Dev Task/Bug Fix tickets start at 'To Research' status
- [ ] New tickets have AC auto-populated without manual entry
- [ ] Nudging a ticket in 'To Research' auto-generates AC if missing
- [ ] Completing Planner phase refines AC format
- [ ] Activity feed shows Researcher/Planner Agent actions
- [ ] REMY-001 can now be nudged successfully

## Rollback Plan

If issues occur:

1. Revert `src/app/api/tickets/route.ts` changes
2. Revert `src/lib/nudge.ts` changes  
3. Revert `src/app/api/tickets/[id]/ralph/steps/[stepId]/complete/route.ts` changes
4. Remove `src/lib/ac-generator.ts`

AC can still be manually added via the AC tab as before.
