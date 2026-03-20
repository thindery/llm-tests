# MEMORY.md

## User Preferences

### Ticket Workflow
- **Always keep tickets moving** - Never ask before advancing tickets through Ralph workflow
- When tickets complete: mark phases → move to next status immediately
- Don't wait for approval to move tickets forward
- Keep the board flowing - momentum matters

### Notifications

**Health Checks (Remy-Tracker)**
- ✅ Send health check results to **#daily** or the **corresponding project channel**
- ❌ **DO NOT send routine health check updates to #briefings**
- ❌ **DO NOT send routine health check updates to personal/direct channels**
- Only escalate to personal/DM channel if there's an actual problem that needs attention
- The user doesn't need to know "everything is fine" every 30 minutes

### General Communication
- Keep routine status updates in appropriate channels, not direct messages
- Direct/personal channel is for things that actually need the user's attention

## Sleep Stories Video Library

**CRITICAL: Never delete or overwrite video sources destructively**

### Current Count (as of March 16, 2026)
- **Main index:** 258 sources (all committed)
- **Previous confusion:** Agents reported 275/290/360 which were incorrect
- **Actual growth:** 172 → 178 → 216 → 236 → 250 → 258

### Source of Truth
File: `/Users/thindery/projects/sleep-stories/library/video-sources-index.json`
- Always verify `total_sources` field matches actual array length
- Check git status before/after modifications
- Never commit without verifying JSON is valid

### Historical Note
Previous agent reports claiming 275, 290, 360+ sources were **incorrect**. The actual file has grown steadily: 172 → 178 → 216 → 236 → 250. Those inflated numbers were likely aspirational or miscalculated.

### When Adding Sources
1. Append to existing array (never replace)
2. Update `total_sources` to match actual count
3. Update `last_updated` timestamp
4. Verify JSON validity before saving
5. Commit changes with descriptive message including count

---

## Business Investigation Ticket Structure

When creating Remy tickets for full business opportunity investigations, follow the REMY-185 pattern:

### Ticket Creation (remy add)
**Description must include:**
1. **Overview** — What we're building and why
2. **Target Experience** — UI/UX reference (e.g., "Ollama-style clean macOS interface")
3. **Problem Statement** — User pain points and market gap
4. **Validation Evidence** — Concrete data (HN points, demo signups, Reddit demand, etc.)
5. **Research File** — Link to source business scout report (e.g., `memory/BUSINESS-SCOUT-YYYY-MM-DD.md`)
6. **Deliverable Requirements** — Numbered list of expected sections in final report
7. **UI Target** — Specific interface style or reference app
8. **Artifacts Location** — Where deliverables will be saved

### Follow-up Actions
**Always add a comment with:**
- 📁 Research file location
- 📄 Local ticket file location
- 🔬 Research agent status (spawned/completed)
- 📂 Artifacts directory path

**Always add acceptance criteria:**
1. Report completion with all required sections
2. Go/No-Go decision ready for review

### Research Scope Template
Standard investigation sections:
1. Product Design & User Flow
2. Technical Architecture
3. Development Cost & Timeline (3 scenarios: conservative/moderate/aggressive)
4. Support & Update Strategy
5. Competitive Analysis
6. Risk Assessment
7. Recommendations (Go/No-Go with rationale)

### Artifact Linking Process

**Goal:** Make research documents easily accessible from the ticket

**Current Method (Comments):**
Since API artifact linking has issues (REMY-186 follow-up needed), use comprehensive comments:

```
📎 **ARTIFACT LINKED - [Document Title]**

**Artifact:** [Descriptive name]
**File:** `filename.md`
**Location:** `/full/path/to/artifact.md`
**Size:** [X KB]

---

## 📋 Report Contents (Summary)
[Executive summary of key findings]

## 🔗 Related Files
- **Research Source:** `memory/BUSINESS-SCOUT-YYYY-MM-DD.md`
- **Local Ticket:** `tickets/TICKET-XXX-name.md`
- **Full Report:** `artifacts/TICKET-XXX-research/report.md`

---

**Status:** Ready for Review
```

**File Storage Locations:**
- Research reports: `~/.openclaw/workspace/artifacts/TICKET-XXX-research/`
- Business scout reports: `~/.openclaw/workspace/memory/BUSINESS-SCOUT-YYYY-MM-DD.md`
- Local ticket files: `~/.openclaw/workspace/tickets/TICKET-XXX-name.md`

**Note:** API-based artifact linking (`POST /api/artifacts`) currently returns "Invalid file type" error even for valid .md files. Use comment-based linking until resolved.

---

## Service Ports (Fixed)

| Service | Port | Notes |
|---------|------|-------|
| Remy-Tracker | **3474** | Next.js app, API endpoint |
| Kalshi-Trader Dashboard | **3475** | Streamlit dashboard |

**Always verify before stating port numbers.**

---

_This file is yours to evolve. As you learn who you are, update it._
