# Ralph-Remy AC Enforcement Guide

## Build Verification AC (Frontend/TypeScript Projects)

**CRITICAL REQUIREMENT:** Every frontend ticket MUST include production build verification as the final AC item.

### Required AC Template

```markdown
## FINAL AC: Production Build Verification
- [ ] `npm run build` completes without errors
- [ ] No TypeScript compilation errors
- [ ] No build-time errors in output
- [ ] ESLint warnings only (no blocking errors)
```

### Why This Matters

**Real World Failure:** Test ticket added 76 passing tests, but:
- Test files included Vitest globals (`afterEach`, `vi`)
- These aren't available in production builds
- Next.js TypeScript compiler picked up test files
- Production build failed: `Cannot find name 'afterEach'`
- All development testing passed, but deployment failed

### The Fix

**AC must include:**
1. Unit/integration tests pass (`npm test`)
2. **AND** production build succeeds (`npm run build`)

### Verification Commands

```bash
# Before marking ticket complete:
npm run build         # Must exit 0
npm run lint          # Must have no errors
```

### TypeScript Configuration

Ensure `tsconfig.json` excludes test files:
```json
{
  "exclude": ["node_modules", "test/**/*", "**/*.test.ts", "**/*.test.tsx"]
}
```

---

## The Problem We Had

**Old Broken Flow:**
```
Planner creates AC → Dev does work → Dev checks off own AC → ??? → AC not actually done
```

**Problem:** Dev marking their own homework. No independent verification.

## The Fix: Separation of Duties

**New Proper Flow:**
```
Planner creates AC → Dev does work (leaves AC unchecked) → QA verifies → QA checks off AC → Review approves → Done
    [ ]                    [ ]                                        [x]                           [x]
```

## Who Does What

| Phase | Role | Can Check AC? | Responsibility |
|-------|------|---------------|----------------|
| **planner** | PM/Tech Lead | ✅ Creates AC | Define what "done" means |
| **setup** | Dev | ❌ NO | Prepare environment |
| **dev** | Dev | ❌ **NO** | **Implement work, leave AC unchecked** |
| **verify** | QA | ✅ **YES** | **Verify AC against artifacts, check off** |
| **test** | QA | ✅ **YES** | **Verify functionality, check off AC** |
| **review** | Tech Lead | ✅ Confirms | Approve QA verification |
| **done** | System | ✅ Marks ticket | Final closure |

## Critical Rules

### For Dev Agents
**❌ NEVER check off your own AC**
```
WRONG: Dev implements → Dev marks AC done

RIGHT: Dev implements → Dev leaves AC unchecked → QA verifies → QA marks AC done
```

**Dev Task Instructions:**
```
Implement all AC items
Create artifacts
LEAVE AC CHECKBOXES UNCHECKED
QA will verify and check them off
```

### For QA/Verify Agents
**✅ YOU check off AC after verifying**
```
Verify each AC item against work done
For items that pass: Change '- [ ]' to '- [x]'
For items that fail: Leave unchecked, document why
```

**QA Task Instructions:**
```
Review plan
Check artifacts created by dev
Verify each AC item is actually complete
Check off verified items: '- [ ]' → '- [x]'
Block if AC not met
```

## Scripts

### Old Script (Dev checks AC - WRONG)
```bash
ralph-remy-simple.sh  # Dev marks AC
```

### New Script (QA verifies AC - RIGHT)
```bash
ralph-remy-qa.sh  # Dev leaves AC unchecked, QA verifies
```

## Usage

```bash
export REMY_TICKET=REMY-XXX
cd ~/projects/my-project

# Use the QA-verified version
~/.openclaw/workspace/scripts/ralph-remy-qa.sh plan.orch.json
```

## What Happens Now

### Dev Phase
- Dev agent gets task
- **Explicit instruction:** "DO NOT check off AC items"
- Dev implements, leaves AC unchecked
- **Enforcement:** If dev checks AC, script FAILS

### Verify/Test Phase  
- QA agent gets task
- **Explicit instruction:** "Verify AC and check off items"
- QA checks artifacts, verifies AC
- QA checks off verified items: `- [ ]` → `- [x]`
- **Requirement:** Must verify AC to proceed

### Review Phase
- Tech lead confirms QA verified
- Only then can ticket move to Done

## Enforcement

The script enforces this at each phase:

**Dev Phase:**
```
⚠️  CRITICAL INSTRUCTION:
- Implement the work
- LEAVE AC CHECKBOXES UNCHECKED
- QA will verify and check off

❌ If dev checks AC items → FAIL and restart
```

**QA Phase:**
```
🔍 QA VERIFICATION REQUIRED:
- Review the plan
- Check artifacts
- Verify each AC item
- Check off verified: '- [ ]' → '- [x]'

❌ If QA doesn't check any AC → FAIL
```

## Remy Integration

- Comments added at each phase
- AC verifiedBy tracked
- Can't progress without QA signoff

## Example Plan File

### Backend/General
```markdown
## Acceptance Criteria
- [ ] AC1: Function X returns correct value
- [ ] AC2: Error handling covers edge cases  
- [ ] AC3: Tests cover 80% of code

## Instructions by Phase

### Dev Phase
Implement AC1, AC2, AC3. **DO NOT check off.**

### QA Phase  
Verify AC1, AC2, AC3. **Check off each verified item.**
```

### Frontend/TypeScript (Next.js, React, etc.)
```markdown
## Acceptance Criteria
- [ ] AC1: Component renders correctly
- [ ] AC2: Tests pass (npm test)
- [ ] AC3: No console errors
- [ ] AC4: Production build succeeds (npm run build)

## Instructions by Phase

### Dev Phase
Implement AC1, AC2, AC3. **DO NOT check off.**
**CRITICAL:** Run `npm run build` and fix any errors before QA.

### QA Phase  
Verify AC1, AC2, AC3, AC4. **Check off each verified item.**
**REQUIRED:** Confirm `npm run build` exits 0 with no errors.
```

## Benefits

- ✅ Independent verification of work
- ✅ No self-review
- ✅ Accountability for QA
- ✅ Clear separation of duties
- ✅ AC actually means something

## Migration

All future tickets use `ralph-remy-qa.sh`.

Old tickets may need AC re-verification if dev marked their own.