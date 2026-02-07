# TODO: Fix Discord Channel Posting Issues

**Status:** CRITICAL — Daily standups not posting to venture channels  
**Reported:** 2026-02-05 7:35 AM CST  
**Error:** "Unexpected non-whitespace character after JSON at position 391 (line 1 column 392)"  
**Impact:** Team channels not receiving updates

---

## Symptoms

- [ ] Posts to #pantry-pal-team not appearing
- [ ] Posts to #remy-finance-team not appearing  
- [ ] Posts to #sleep-stories-team not appearing
- [ ] Posts to #agentads-team not appearing
- [x] JSON parsing error in tool response — **FIXED: Simple text works**
- [x] File not found: REMY-TODO.md — **FIXED: Created file**

## Root Cause Identified

**Issue:** Tool was looking for `REMY-TODO.md` in workspace root, but it only existed in `memory/`  
**Fix:** Created `~/projects/REMY-TODO.md` (symlink or duplicate of memory version)

**Discord posting:** Simple text works. Complex messages with certain special characters (smart quotes, em-dashes, etc.) may cause JSON parsing errors.

## Solution ✅ APPLIED

For 7am standups:
1. ✅ Use simple text formatting
2. ✅ Avoid smart quotes — use straight quotes " 
3. ✅ Avoid fancy dashes — use simple hyphens -
4. ✅ Post one channel at a time for reliability
5. ✅ All posts confirmed working 2026-02-05 9:15 AM

## 7am Daily Ritual (LOCKED IN)

**Every day at 7am CST:**
1. Post to #pantry-pal-team
2. Post to #remy-finance-team
3. Post to #sleep-stories-team  
4. Post to #agentads-team
5. Post consolidated summary to #briefings

**Format:** Simple text, no fancy characters
**Status:** WORKING — 2026-02-05 ✅

## Memory Update

Added to daily checklist. Will not forget again.

---

## Investigation Tasks

### Phase 1: Diagnose (Today)
- [ ] Try posting to ONE channel (not multiple at once)
- [ ] Check if channel IDs are valid/cached correctly
- [ ] Verify Discord bot permissions haven't changed
- [ ] Check for malformed JSON in message content
- [ ] Review gateway logs for errors

### Phase 2: Isolate (Today)
- [ ] Test #pantry-pal-team alone with simple message
- [ ] Test #remy-finance-team alone with simple message
- [ ] Identify which channel(s) are failing
- [ ] Check message content for special characters causing JSON issues

### Phase 3: Fix (Today)
- [ ] Clean any cached/corrupted channel data
- [ ] Escape special characters in message content properly
- [ ] Simplify message format (remove complex formatting if needed)
- [ ] Update posting script to be more resilient

### Phase 4: Test (Today)
- [ ] Post to all 4 venture channels successfully
- [ ] Verify messages appear correctly
- [ ] Update daily standup automation to use fixed method
- [ ] Add to MEMORY.md so this doesn't repeat

---

## Potential Causes

1. **Special characters in message** — emojis, markdown, or symbols breaking JSON
2. **Channel ID cache issue** — stale/wrong channel IDs
3. **Bot permissions** — bot lost access to some channels
4. **Rate limiting** — hitting Discord API limits
5. **Message length** — exceeding Discord's 2000 character limit

---

## Testing Plan

```
Step 1: Post "Test 1" to #pantry-pal-team only
Step 2: If works, test #remy-finance-team only  
Step 3: If works, test all 4 with simple text
Step 4: Once working, restore full formatting
```

---

## 7am Daily Standup Ritual (Fix & Document)

After fixing, ensure:
- [ ] Single post per channel (not batch)
- [ ] Simple format that won't break JSON
- [ ] Error handling if one channel fails
- [ ] Memory update: REMEMBER THE DAILY 7am POSTS

---

**Priority:** HIGH — Blocking team communication  
**ETA Fix:** Today by 9 AM  
**Owner:** Remy (with Dev help if needed)
