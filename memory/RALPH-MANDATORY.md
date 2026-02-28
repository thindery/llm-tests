# Reminder: Ralph Workflow is MANDATORY

**Rule:** EVERY ticket goes through Ralph. NO exceptions. EVER.

**What I keep doing wrong:**
- Skipping Planner phase → jumping straight to Dev
- Creating tickets but not running Planner agent first
- Spawning Dev before Setup is complete
- Not marking Ralph phases properly

**Correct Flow:**
1. PM creates ticket (description + suggested AC)
2. ⬅️ PLANNINER AGENT creates official AC in `acceptance_criteria` table
3. ⬅️ Mark Planner phase complete
4. ⬅️ PM confirms Setup → mark complete
5. ⬅️ Move to "In Dev" → THEN spawn Dev
6. ⬅️ Dev marks Verify complete after self-check
7. ⬅️ QA runs tests → marks Test complete (or fails back to Dev)
8. ⬅️ Tech Lead reviews → marks Review complete
9. ⬅️ Merge → Closed/Done

**CRITICAL:** Do NOT spawn Dev until:
- Planner phase ✅
- Setup phase ✅
- Status = "In Dev"

**Check before EVERY ticket:**
- Did Planner run?
- Are phases marked in `ralph_workflow_steps`?
- Is ticket in correct status?

**Consequence of skipping:** Broken workflow, missing AC, untracked tickets, frustrated thindery.

**Created:** 2026-02-21
**Applies to:** All tickets, all variants, all sizes
