# TODO: Organize File Structure

**Policy Change:** 2026-02-05  
**Rule:** ~/projects = CODE REPOS ONLY. No planning docs.
**Destination:** All planning docs → ~/openclaw/workspace/ or ~/openclaw/workspace/memory/

---

## Current State

### ✅ Already in Correct Location
- ~/openclaw/workspace/memory/ (all .md files)
- ~/openclaw/workspace/REMY-TODO.md
- ~/projects/awesome-openclaw/ (repo - correct)
- ~/projects/pantry-pal/ (repo - correct)

### ❌ Needs Moving (from ~/projects)
- [ ] REMY-TODO.md → ~/openclaw/workspace/REMY-TODO.md (already done? verify)
- [ ] Any other .md files in ~/projects
- [ ] Any planning docs in ~/projects

### ✅ Keep in ~/projects (Code Repos Only)
- awesome-openclaw/ (GitHub repo)
- pantry-pal/ (code repo)
- remy-finance/ (future code repo)
- Any future app repositories

---

## Cleanup Tasks

### Phase 1: Audit (Today)
- [ ] List all files in ~/projects
- [ ] Identify non-code items
- [ ] Document what needs moving

### Phase 2: Move (Today)
- [ ] Move planning docs to ~/openclaw/workspace/
- [ ] Move todos to ~/openclaw/workspace/memory/
- [ ] Create symlinks if needed for convenience

### Phase 3: Document (Today)
- [ ] Update AGENTS.md with file location rules
- [ ] Create directory structure guide
- [ ] Add to memory for future reference

---

## Directory Structure (Target)

```
~/
├── .openclaw/workspace/          ← BOT HOME
│   ├── AGENTS.md                 ← Bot identity & rules
│   ├── SOUL.md                   ← Who I am
│   ├── MEMORY.md                 ← Long-term memory
│   ├── REMY-TODO.md              ← Main task list
│   ├── memory/                   ← Daily logs & todo files
│   │   ├── 2026-02-05.md
│   │   ├── TODO-*.md
│   │   ├── RESEARCH-*.md
│   │   └── VENTURE-*.md
│   └── projects/                 ← Symlink or quick access
│
~/projects/                       ← CODE ONLY
├── awesome-openclaw/             ← GitHub repo
├── pantry-pal/                   ← Code repo
├── remy-finance/                 ← Future code repo
└── [other repos]
```

---

## Rules Going Forward

| Location | Purpose |
|----------|---------|
| ~/openclaw/workspace/ | Bot configs, main todos, identity |
| ~/openclaw/workspace/memory/ | Daily logs, research, venture docs |
| ~/projects/ | Git repositories ONLY |

**No exceptions.** Planning docs, markdown, todos = workspace. Code = projects.

---

**Status:** In Progress  
**ETA:** Today by 10 AM
