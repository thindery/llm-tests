# Branching Strategy

**Version:** 1.0  
**Date:** 2026-02-06

---

## 🌿 Branch Structure

```
main
├── model-kimi-k2-5/task-001-todo-app
├── model-qwen3-coder/task-001-todo-app
├── model-kimi-k2-5/task-002-api-client
├── model-qwen3-coder/task-002-api-client
└── ... (future matches)
```

---

## 📝 Naming Convention

### Format
```
model-{model-name}/task-{XXX}-{short-description}
```

### Components

| Component | Format | Example |
|-----------|--------|---------|
| `model` | Static prefix | `model` |
| `{model-name}` | lowercase, hyphens | `kimi-k2-5`, `qwen3-coder` |
| `task` | Static prefix | `task` |
| `{XXX}` | 3-digit number | `001`, `002` |
| `{short-description}` | kebab-case | `todo-app`, `api-client` |

### Examples

✅ **Good:**
- `model-kimi-k2-5/task-001-todo-app`
- `model-qwen3-coder/task-002-api-client`
- `model-kimi-k2-5/task-010-form-validation`

❌ **Bad:**
- `kimi/task-1` (missing model prefix, wrong number format)
- `model-kimi-k2-5/001-todo` (missing task prefix)
- `model-Qwen-Coder/Task-001-API` (wrong case)

---

## 🔄 Workflow

### 1. Challenge Definition
1. Create `challenges/XXX-task-name.md`
2. Define acceptance criteria
3. Commit to `main`

### 2. Branch Creation
```bash
# For each model
git checkout main
git pull origin main
git checkout -b model-{name}/task-XXX-description
```

### 3. Dev Agent Implementation
- Dev agent checks out their branch
- Implements the challenge
- Commits with format: `[task-XXX] Description`
- Pushes to origin

### 4. Tech Lead Review
1. Fetch both branches
2. Run both implementations
3. Score based on criteria
4. Record results in `results/XXX-task-name.md`

### 5. Leaderboard Update
- Update `results/leaderboard.md`
- Commit to `main`

---

## ⚠️ Important Rules

1. **NEVER merge model branches to main** — they're for comparison only
2. **Each model gets clean branch from main** — no cross-contamination
3. **Branch names must follow convention** — for automation/filtering
4. **Delete branches after match** — or archive them (keep for 30 days)
5. **Only `main` has long-term history** — results, leaderboard, docs

---

## 🏷️ Git Tags

After match completion:
```bash
git tag -a match-001-YYYY-MM-DD -m "Match #001: TODO App - Winner: {model}"
git push origin match-001-YYYY-MM-DD
```

This preserves the state at match completion.

---

## 🔄 Conflict Resolution

Since branches never merge, conflicts are rare. If they occur:

1. They're from `main` updates during development
2. Rebase onto latest `main` if needed:
   ```bash
   git checkout model-{name}/task-XXX
   git rebase main
   ```
3. Or accept that branch is from specific `main` commit

---

## 📊 Branch Lifecycle

```
Create → Develop → Review → Record → Archive/Delete
  |         |         |        |          |
  |         |         |        |          └── 30 days later
  |         |         |        └── Immediate
  |         |         └── When both done
  |         └── 1 hour limit
  └── From main at challenge definition
```

---

**Questions?** See `README.md` for overview
