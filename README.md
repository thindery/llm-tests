# LLM-Tests — Competitive Model Evaluation Framework

**Purpose:** A/B test coding capabilities between different LLM models on identical tasks

**Current Matchup:**
- 🤖 **Blue Corner:** `ollama/kimi-k2.5:cloud`
- ⚡ **Red Corner:** `ollama/qwen3-coder-next:cloud` (NEW!)

---

## 🎯 How It Works

### 1. The Challenge
- Each coding challenge is defined in `challenges/`
- Task description + acceptance criteria + test cases
- Example: "Build a React TODO app with localStorage persistence"

### 2. The Contenders
- **Each model gets its own branch** named: `model-{name}/task-{id}`
- Branches are completely isolated
- Same challenge, different model, same time limit

### 3. The Dev Agents
- **Dev A:** Assigned to kimi-k2.5 model
- **Dev B:** Assigned to qwen3-coder-next model
- Each implements the same task independently

### 4. The Review
- **Tech Lead** reviews both branches
- Compares: code quality, performance, readability, best practices
- **Declares a winner** with reasoning

### 5. The Record
- Results stored in `results.md`
- Track win/loss per model
- Build leaderboard over time

---

## 🏗️ Repository Structure

```
llm-tests/
├── README.md                 # This file
├── challenges/               # Coding challenge definitions
│   ├── 001-todo-app.md
│   ├── 002-api-client.md
│   └── 003-form-validation.md
├── src/                      # React app skeleton (main branch)
│   ├── main.tsx
│   ├── App.tsx
│   └── components/
├── results/                  # Match results & analysis
│   ├── 001-todo-app.md
│   └── leaderboard.md
├── branches/                 # Branch documentation
│   ├── model-kimi-k2-5/
│   │   └── README.md
│   └── model-qwen3-coder/
│       └── README.md
└── docs/                     # Process documentation
    ├── branching-strategy.md
    ├── review-criteria.md
    └── model-configs.md
```

---

## 🌿 Branch Naming Convention

Format: `model-{model-name}/task-{task-id}-{short-desc}`

**Examples:**
- `model-kimi-k2-5/task-001-todo-app`
- `model-qwen3-coder/task-001-todo-app`
- `model-kimi-k2-5/task-002-api-client`
- `model-qwen3-coder/task-002-api-client`

**Never merge these branches to main** — they're for comparison only.

---

## 🥊 Current Matchup: Match #001

| Blue Corner | Red Corner |
|-------------|------------|
| **Model:** ollama/kimi-k2.5:cloud | **Model:** ollama/qwen3-coder-next:cloud |
| **Branch:** `model-kimi-k2-5/task-001-todo-app` | **Branch:** `model-qwen3-coder/task-001-todo-app` |
| **Status:** 🟡 Pending | **Status:** 🟡 Pending |
| **Dev Agent:** Dev 👨‍💻 | **Dev Agent:** Dev 👨‍💻 |

**Challenge:** #001 — React TODO App with Persistence  
**Test Criteria:**
- ✅ Add TODO items
- ✅ Mark complete/incomplete
- ✅ Delete items
- ✅ Persist to localStorage
- ✅ Clean UI with Tailwind
- ⚡ Bonus: Animations

---

## 📝 Process

### Step 1: Define Challenge
Create `challenges/001-task-name.md` with:
- Task description
- Acceptance criteria (bullet list)
- Bonus points
- Time limit (default: 1 hour)

### Step 2: Spawn Dev Agents
```
Spawn Dev A → model=kimi-k2.5:cloud → branch=model-kimi-k2-5/task-001
Spawn Dev B → model=qwen3-coder-next:cloud → branch=model-qwen3-coder/task-001
```

### Step 3: Review
Spawn Tech Lead to:
- Check out both branches
- Run both implementations
- Score on: correctness, code quality, UX, performance
- Declare winner with reasoning

### Step 4: Record
Update `results/001-task-name.md` with:
- Winner
- Scores (1-10 scale)
- Notable differences
- Learning for next match

---

## 🏆 Leaderboard

Track cumulative wins:

| Model | Wins | Losses | Win Rate |
|-------|------|--------|----------|
| ollama/kimi-k2.5:cloud | 0 | 0 | — |
| ollama/qwen3-coder-next:cloud | 0 | 0 | — |

---

## 🔮 Future Matchups

Potential future candidates:
- Claude 3.5 Sonnet (via API)
- GPT-4o (via API)
- Gemini 2.5 Pro (via API)
- DeepSeek Coder (via Ollama)
- Phi-4 (via Ollama)
- Codestral (via Ollama)

Expand as we test more models!

---

## ⚙️ Model Configuration

### Current Models

**kimi-k2.5:cloud**
- Provider: Ollama Cloud
- Strengths: Strong reasoning, follows instructions
- Cost: $20/mo plan
- Context: Large

**qwen3-coder-next:cloud** ⭐ NEW
- Provider: Ollama Cloud
- Strengths: Latest coding-optimized model
- Cost: $20/mo plan (same)
- Notes: "Next-gen coder model" — claims better than Claude 3.5 Sonnet

---

**Created:** 2026-02-06  
**Next Match:** #001 — React TODO App  
**Status:** Ready to rumble! 🥊🦞
