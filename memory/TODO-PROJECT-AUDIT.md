# Project Audit & Cleanup Report

**Date:** 2026-02-05  
**Auditor:** Remy  
**Status:** Cleanup needed

---

## Current State (MESSY)

### 1. ~/projects/ (Code Repos - CORRECT ✅)
- awesome-openclaw/ — Git repo ✅
- pantry-pal/ — Git repo ✅
- pantry-pal-api/ — Git repo ✅
- remy-blog/ — Git repo ✅ (actual code with node_modules, dist)
- remy-finance/ — Git repo ✅ (just docs/ so far)

### 2. ~/.openclaw/workspace/projects/ (CONFUSING ❌)
- AGENT-AD-NETWORK.md — Planning doc (should be in memory/) ❌
- SECURITY-AUDITS.md — Planning doc (should be in memory/) ❌
- remy-blog/ — EARLY SCAFFOLD (not git repo) — has ARCHITECTURE.md, DESIGN.md, MONETIZATION.md, STORE-SETUP.md ❌
- remy-finance/ — EARLY SCAFFOLD (not git repo) — has README.md, TODO.md ❌

### 3. ~/.openclaw/workspace/memory/ (Planning Docs - CORRECT ✅)
- All planning docs, research, TODOs ✅

---

## The Problem

We have **DUPLICATES and MISPLACED files**:

1. **Planning docs in workspace/projects/** that should be in memory/
2. **Early scaffold directories** (workspace/projects/remy-blog/, workspace/projects/remy-finance/) that aren't git repos
3. **Real repos in ~/projects/** that are the actual code

---

## Cleanup Plan

### Phase 1: Remove Confusion (Today)

#### Step 1: Move Planning Docs
```
~/.openclaw/workspace/projects/AGENT-AD-NETWORK.md 
→ ~/.openclaw/workspace/memory/AGENT-AD-NETWORK.md

~/.openclaw/workspace/projects/SECURITY-AUDITS.md
→ ~/.openclaw/workspace/memory/SECURITY-AUDITS.md
```

**Note:** Check if AGENT-AD-NETWORK.md is different from AGENT-AD-NETWORK-VISION.md already in memory/

#### Step 2: Handle Early Scaffolds

**Option A: Delete (Recommended)**
- Delete workspace/projects/remy-blog/ (real repo is in ~/projects/)
- Delete workspace/projects/remy-finance/ (real repo is in ~/projects/)
- The planning docs in those scaffolds: move to memory/ or discard

**Option B: Archive**
- Move entire workspace/projects/remy-blog/ to workspace/archive/remy-blog-OLD/
- Move entire workspace/projects/remy-finance/ to workspace/archive/remy-finance-OLD/

#### Step 3: Clean up workspace/projects/
```
After cleanup:
~/.openclaw/workspace/projects/ 
→ DELETE ENTIRE DIRECTORY (not needed)
```

---

### Phase 2: Single Source of Truth

**New Structure:**

```
~/projects/                    ← CODE ONLY
├── awesome-openclaw/          ← Git repo
├── pantry-pal/                ← Git repo
├── pantry-pal-api/            ← Git repo
├── remy-blog/                 ← Git repo (actual code)
└── remy-finance/              ← Git repo (actual code)

~/.openclaw/workspace/         ← BOT HOME
├── AGENTS.md
├── SOUL.md
├── MEMORY.md
├── REMY-TODO.md
├── memory/                    ← ALL PLANNING
│   ├── BUSINESS-STRATEGY.md
│   ├── INFRASTRUCTURE-PLAN.md
│   ├── AGENT-AD-NETWORK-VISION.md
│   ├── SECURITY-AUDITS.md
│   ├── VENTURE-*.md
│   ├── RESEARCH-*.md
│   ├── TODO-*.md
│   └── 2026-*.md (daily logs)
└── skills/                    ← Skill references
```

**DELETE:** ~/.openclaw/workspace/projects/ entirely

---

### Phase 3: Document Rules

Update MEMORY.md with:
1. Code goes to ~/projects/
2. Planning goes to ~/.openclaw/workspace/memory/
3. No exceptions
4. No duplicates

---

## Action Items

### Today
- [ ] Move AGENT-AD-NETWORK.md to memory/
- [ ] Move SECURITY-AUDITS.md to memory/
- [ ] Review workspace/projects/remy-blog/ — save useful docs to memory/, then delete
- [ ] Review workspace/projects/remy-finance/ — save useful docs to memory/, then delete
- [ ] Delete ~/.openclaw/workspace/projects/ directory entirely
- [ ] Update AGENTS.md with clear file rules
- [ ] Update MEMORY.md with directory structure

### Verify
- [ ] Only git repos in ~/projects/
- [ ] Only planning docs in ~/.openclaw/workspace/memory/
- [ ] No more confusion

---

## Quick Decision Needed

**workspace/projects/remy-blog/ contains planning docs:**
- ARCHITECTURE.md
- DESIGN.md  
- MONETIZATION.md
- STORE-SETUP.md

**Save these or discard?** Real remy-blog is already in ~/projects/

**workspace/projects/remy-finance/ contains:**
- README.md
- TODO.md

**Save these or discard?** Real remy-finance is already in ~/projects/

@thindery — want to keep these early scaffolds or delete?

---

**Status:** ✅ COMPLETED 2026-02-05 9:50 AM CST
**Priority:** Medium — RESOLVED

---

## ✅ Completed Actions

### 1. Planning Docs Moved
- ✅ AGENT-AD-NETWORK.md → memory/
- ✅ SECURITY-AUDITS.md → memory/
- ✅ remy-blog/ early scaffold docs → memory/remy-blog-OLD/
- ✅ remy-finance/ early scaffold docs → memory/remy-finance-OLD/

### 2. Directories Deleted
- ✅ ~/.openclaw/workspace/projects/ — DELETED entirely

### 3. Git Repos Initialized
- ✅ remy-blog/ — Git inited, committed, pushed to GitHub
- ✅ remy-finance/ — Git inited, committed, pushed to GitHub
- ✅ sleep-stories/ — Git inited, committed, pushed to GitHub
- ✅ agentads/ — Git inited, committed, pushed to GitHub

### 4. Final Structure

**~/projects/ (Code Repos Only):**
```
├── awesome-openclaw/     ✅ Git repo, on GitHub
├── pantry-pal/           ✅ Git repo, on GitHub
├── pantry-pal-api/       ✅ Git repo, on GitHub
├── remy-blog/            ✅ Git repo, on GitHub
├── remy-finance/         ✅ Git repo, on GitHub
├── sleep-stories/        ✅ Git repo, on GitHub
└── agentads/             ✅ Git repo, on GitHub
```

**~/.openclaw/workspace/memory/ (Planning Docs):**
```
├── BUSINESS-STRATEGY.md
├── INFRASTRUCTURE-PLAN.md
├── AGENT-AD-NETWORK-VISION.md
├── SECURITY-AUDITS.md
├── TODO-*.md (multiple)
├── RESEARCH-*.md (multiple)
├── 2026-*.md (daily logs)
├── remy-blog-OLD/        (archived docs)
└── remy-finance-OLD/     (archived docs)
```

### 5. Documentation Updated
- ✅ AGENTS.md — File organization rules documented
- ✅ MEMORY.md — Structure reference added
- ✅ TODO-PROJECT-AUDIT.md — This completion record

---

## Rules Enforced

| Rule | Status |
|------|--------|
| ~/projects = code only | ✅ Enforced |
| No planning docs in ~/projects | ✅ Enforced |
| All .md files in workspace/memory | ✅ Enforced |
| All repos have git | ✅ Enforced |
| No duplicate directories | ✅ Enforced |

---

## GitHub Repos Created

- github.com/thindery/remy-blog
- github.com/thindery/remy-finance
- github.com/thindery/sleep-stories
- github.com/thindery/agentads

(Plus existing: awesome-openclaw, pantry-pal, pantry-pal-api)

---

**Organization complete. All ventures have clean, properly-located git repositories. No more confusion! 🦞**
