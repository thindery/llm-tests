# TASK-042: Ralph Phase Automation

**Status:** ✅ Complete  
**Goal:** Automate ticket phase advancement without manual intervention  
**Solution:** TypeScript-based automation with API integration

---

## Overview

This implementation automatically advances tickets through Ralph workflow phases based on agent completion events. Agents no longer need to manually run `ralph-phase.sh` or execute curl commands.

### Problem Solved

**Before TASK-042:**
- Agents had to manually run `ralph-phase.sh` to mark phases complete
- Required manual curl commands to advance ticket status
- Delays and gaps in activity tracking
- Manual intervention required at each transition

**After TASK-042:**
- ✅ Automatic phase completion detection
- ✅ Auto-advance through workflow: Dev → Verify → Review → Done
- ✅ Activity tracking preserved automatically
- ✅ Only moves forward, never backward
- ✅ Shell functions available via `source ralph-helper.sh`

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `auto-phase-advance.ts` | TypeScript utility with full automation API |
| `auto-phase-advance` | Shell wrapper for CLI usage |

### Modified Files
| File | Changes |
|------|---------|
| `ralph-helper.sh` | Added auto-advance functions |
| `skills/dev-agent/SKILL.md` | Updated with automated workflow |

---

## Usage

### 1. Command Line

```bash
# Add to your PATH or source helper
source ~/.openclaw/workspace/skills/ralph/ralph-helper.sh

# Complete Dev work (Dev → Verify → In QA)
ralph-dev-complete REMY-042

# Complete QA testing (Test → Ready for Review)
ralph-qa-complete REMY-042

# Complete Review (Review → Closed)
ralph-review-complete REMY-042

# Check status
ralph-status-auto REMY-042

# Auto-detect and advance current phase
ralph-auto-advance REMY-042
```

### 2. Via TypeScript Import

```typescript
import {
  completeDevPhase,
  completeQAPhase,
  completeReviewPhase,
  detectCurrentPhase,
  advanceTicketPhase,
  getPhaseStates
} from './auto-phase-advance.ts';

// Complete dev work
await completeDevPhase('REMY-042', {
  actor: 'dev-agent',
  comment: 'Implementation complete, all tests passing'
});

// Check current phase
const { phase, allPhases } = await detectCurrentPhase('REMY-042');
console.log(`Current: ${phase}, total phases: ${allPhases.length}`);
```

---

## API Reference

### Core Functions

#### `completeDevPhase(ticketNumber, options?)`
Automatically handles the Dev → Verify → In QA transition:
1. Marks Dev phase complete
2. Marks Verify phase complete (self-verification)
3. Advances ticket to "In QA"

```typescript
await completeDevPhase('REMY-042', {
  actor: 'dev-agent',
  actorRole: 'dev',
  actorName: 'Dev Agent',
  comment: 'Feature implementation complete'
});
```

#### `completeQAPhase(ticketNumber, options?)`
Handles Test → Ready for Review:
1. Marks Test phase complete
2. Advances to "Ready for Review"

```typescript
await completeQAPhase('REMY-042', {
  actor: 'qa-agent',
  actorRole: 'qa',
  actorName: 'QA Agent'
});
```

#### `completeReviewPhase(ticketNumber, options?)`
Handles Review → Closed:
1. Marks Review phase complete
2. Closes ticket

```typescript
await completeReviewPhase('REMY-042', {
  actor: 'tech-lead-agent',
  actorRole: 'tech_lead'
});
```

#### `detectCurrentPhase(ticketNumber)`
Returns the first incomplete phase in sequence:

```typescript
const { ticketId, phase, allPhases } = await detectCurrentPhase('REMY-042');
// phase = 'Dev' | 'Verify' | 'Test' | 'Review' | null (all complete)
```

---

## Phase Map

| From Phase | To Phase | Target Status | Role |
|------------|----------|---------------|------|
| Planner | Setup | (no change) | pm |
| Setup | Dev | To Dev | pm |
| Dev | Verify | In QA | dev |
| Verify | Test | In QA | dev |
| Test | Review | Ready for Review | qa |
| Review | Done | Closed | tech_lead |

---

## API Endpoints Used

The automation uses Ralph API at `http://localhost:3474/api`:

```
GET  /api/tickets?search={ticket_number}
GET  /api/tickets/{id}/ralph/phases
POST /api/tickets/{id}/ralph/complete-phase
PATCH /api/tickets/{id}
```

---

## Error Handling

The utility includes comprehensive error handling:

- **TICKET_NOT_FOUND**: Ticket number doesn't exist
- **MISSING_ACCEPTANCE_CRITERIA**: AC not defined (phase-blocked)
- **RALPH_PHASE_INCOMPLETE**: Previous phase not complete
- **PHASE_ALREADY_COMPLETE**: Phase already marked (idempotent)

All errors include actionable context including URLs to fix issues.

---

## Activity Tracking

Each action preserves proper activity tracking:

```json
{
  "phase": "Dev",
  "actor": "dev-agent",
  "actor_role": "dev",
  "actor_name": "Dev Agent",
  "completed_at": "2025-02-27T13:20:00Z",
  "comment": "Development complete, moving to In QA"
}
```

---

## Integration Points

### Dev Agent Workflow

The dev-agent SKILL.md is updated to use automation:

```bash
# OLD (manual):
curl -X POST .../complete-phase
curl -X PATCH .../tickets/{id}

# NEW (automatic):
~/.openclaw/workspace/skills/ralph/auto-phase-advance dev-complete REMY-042
```

### For Sub-agents

Sub-agents can use the automation:

```typescript
// In TypeScript agent task
const { completeDevPhase } = await import(
  '/Users/thindery/.openclaw/workspace/skills/ralph/auto-phase-advance.ts'
);

await completeDevPhase(context.ticketNumber);
```

---

## Environment Variables

```bash
# Ralph API URL (optional, defaults to localhost)
export RALPH_API_URL="http://localhost:3474/api"

# Delay between API calls for rate limiting (optional, default 100ms)
export RALPH_ADVANCE_DELAY_MS=100
```

---

## Testing

Quick test commands:

```bash
# Check if automation loads
cd ~/.openclaw/workspace/skills/ralph
./auto-phase-advance status REMY-042

# Test dev workflow (dry run - add later)
./auto-phase-advance dev-complete REMY-042
```

---

## Migration Guide

For existing agents/scripts using manual phase advancement:

### Old Pattern (Ralph Phase Manual)
```bash
ralph-phase.sh REMY-042 --mark=dev
ralph-phase.sh REMY-042 --mark=verify
curl -X PATCH ... # advance status
```

### New Pattern (Auto-Phase)
```bash
source ~/.openclaw/workspace/skills/ralph/ralph-helper.sh
ralph-dev-complete REMY-042
```

---

## Security Notes

- Only advances forward, never backward
- Requires valid Ralph API
- Respects existing phase constraints
- Fails safe (requires fixing AC before proceeding)
- All actions logged as `<role>-agent`

---

## Acceptance Criteria Verification

✅ - Tickets auto-advance through phases after agent completion  
✅ - No manual `ralph-phase.sh` calls needed by agents  
✅ - Activity tracking preserved in Ralph API  
✅ - Only moves forward, never backward  
✅ - Uses Ralph API calls (not direct SQL)  

---

## Future Enhancements

Potential improvements:

1. **WebSocket integration**: Real-time phase tracking
2. **Batch operations**: Process multiple tickets
3. **Conditional logic**: Skip phases based on ticket type
4. **Notification hooks**: Slack/Discord on phase completion
5. **Rollback capability**: (admin only) Revert phase advancement