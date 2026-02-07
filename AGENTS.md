# AGENTS.md — File Organization Rules

**Last Updated:** 2026-02-05  
**Applies to:** All Remy operations

---

## 📁 Directory Structure

### ~/.openclaw/workspace/ — BOT HOME BASE
**What goes here:**
- Bot identity files (SOUL.md, IDENTITY.md)
- Main task lists (REMY-TODO.md)
- Configuration guides (AGENTS.md, USER.md)
- Quick access to tools

**Subdirectories:**
- `memory/` — Daily logs, research docs, venture plans, todos
- `skills/` — OpenClaw skill references
- `temp/` — Temporary working files

### ~/.openclaw/workspace/memory/ — KNOWLEDGE BASE
**What goes here:**
- Daily session logs (YYYY-MM-DD.md)
- TODO files (TODO-*.md)
- Research reports (RESEARCH-*.md)
- Venture documentation (VENTURE-*.md)
- Project plans (BUSINESS-STRATEGY.md, INFRASTRUCTURE-PLAN.md, etc.)

### ~/projects/ — CODE REPOSITORIES ONLY
**What goes here:**
- Git repositories
- Source code
- App directories
- README.md (only as part of code repo)

**NO planning docs. NO markdown files outside of repo structure.**

---

## 🚫 Strict Rules

| ❌ Never in ~/projects | ✅ Always in ~/openclaw/workspace/ |
|------------------------|-----------------------------------|
| Planning documents | Planning documents |
| TODO lists | TODO lists |
| Research notes | Research notes |
| Business strategies | Business strategies |
| Standalone .md files | Standalone .md files |

| ✅ OK in ~/projects | Notes |
|---------------------|-------|
| Git repositories | awesome-openclaw/, pantry-pal/, etc. |
| Code files | .py, .js, .ts, etc. |
| Repo README.md | Part of the repository |
| Source directories | src/, app/, etc. |

---

## 🔍 Quick Check

Before creating files:
1. Is this code? → ~/projects/
2. Is this planning/research/todo? → ~/openclaw/workspace/memory/
3. Is this bot config? → ~/openclaw/workspace/

---

## 📝 Examples

**Right:**
- `~/projects/pantry-pal/src/main.py` ← Code in project
- `~/.openclaw/workspace/memory/TODO-DISCORD-FIX.md` ← TODO in memory
- `~/.openclaw/workspace/memory/BUSINESS-STRATEGY.md` ← Plan in memory

**Wrong:**
- `~/projects/BUSINESS-STRATEGY.md` ← Planning doc in projects ❌
- `~/projects/TODO-LIST.md` ← TODO in projects ❌
- `~/.openclaw/workspace/main.py` ← Code in workspace ❌

---

**Enforcement:** Self-check before file operations
**Violations:** Move immediately to correct location
