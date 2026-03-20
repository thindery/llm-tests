# Ralph Workflow - REQUIRED CHECKPOINTS

## Every Stage Gate - MUST PASS BEFORE PROCEEDING

### 1. PLANNER
- [ ] Ticket created with AC
- [ ] Ticket status: To Dev

### 2. SETUP
- [ ] Branch created: `feature/REMY-XXX`
- [ ] Dependencies installed

### 3. DEV - **VERIFICATION REQUIRED**

**CRITICAL: Agent MUST prove code exists:**

```bash
# Before claiming complete, agent MUST run:
# 1. Check file modified
git status | grep "modified:"

# 2. Check AC in code (example patterns)
grep "settings-form" index.html        # For settings
grep "detail-section" index.html         # For details
grep "function saveSettings" index.html  # For JS functions

# 3. Line count increase
git diff --stat | tail -1                # Should show "+" insertions

# 4. Commit with message
git commit -m "REMY-XXX: Description"
git log --oneline -1                     # Verify commit exists
```

**Agent output MUST include proof:**
- Screenshot of `git log`
- Screenshot of `grep` verification
- Lines changed: `22 insertions(+), 4 deletions(-)`

### 4. TEST - **VERIFICATION REQUIRED**

**Before claiming tested:**

```bash
# Run the service
curl http://localhost:3475/api/test-endpoint | jq .
# Should return expected data, not 404

# Check browser view (if applicable)
# Screenshot required
```

**Test output MUST include:**
- API response
- HTTP status code 200
- Matches AC

### 5. REVIEW - **HUMAN REQUIRED**

**I (human) MUST verify:**
- [ ] `git log` shows commit
- [ ] `grep` finds AC patterns
- [ ] Ticket AC checkbox complete
- [ ] Move ticket: To Dev → Verify → Test → Review → Closed

**NEVER close based on agent claim alone.**

### 6. CLOSE

- [ ] All gates passed
- [ ] Commit hash recorded in ticket
- [ ] Status: Closed/Done

---

## Common Failures & Fixes

| Failure | Fix |
|---------|-----|
| Agent claims done, no commit | Require git log proof in agent output |
| Code written to wrong file | Require file path grep verification |
| AC misunderstood by agent | Require AC pattern grep (specific function names) |
| Code written but not deployed | Require "git status" AND "curl test" |
| Tests pass but feature broken | Require end-to-end curl/browser test |

---

## Updated Subagent Instruction Template

```
REMY-XXX: Title

AC:
1. Specific measurable item
2. Specific measurable item

VERIFICATION REQUIRED - Include in output:
1. git log --oneline -3 (show commits exist)
2. grep "pattern" file.js | wc -l (show AC pattern exists)
3. grep "other_pattern" file.js | wc -l
4. curl http://localhost:3475/api/xxx | head -5 (feature works)

DO NOT say complete until all 4 verifications pass.
```

---

## Tech Lead / QA Responsibility

**Not optional. Check every time:**

```bash
# Quick verify script
cd ~/projects/kalshi-trader
./scripts/verify-ticket.sh REMY-XXX
```

**Output should show:**
- Commit exists: YES
- AC patterns found: YES (3/3)
- API responds: YES
- Ticket can close: YES

**If any NO → DO NOT CLOSE → Send back to Dev**
