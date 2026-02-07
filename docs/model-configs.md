---
# LLM Model Configurations

**Last Updated:** 2026-02-06

---

## 🥊 Current Matchup: Match #001

### 🤖 Blue Corner: Kimi K2.5

```json
{
  "model": "ollama/kimi-k2.5:cloud",
  "provider": "ollama",
  "context_window": "128k",
  "strengths": [
    "Strong reasoning",
    "Follows instructions well",
    "Good at complex problem solving"
  ],
  "use_case": "General coding, architecture, debugging",
  "cost_tier": "$20/mo Ollama Cloud Pro",
  "win_rate": "TBD",
  "total_matches": 0
}
```

**Dev Agent Assignment:** Dev 👨‍💻  
**Branch Prefix:** `model-kimi-k2-5/`

---

### ⚡ Red Corner: Qwen3-Coder-Next

```json
{
  "model": "ollama/qwen3-coder-next:cloud",
  "provider": "ollama",
  "context_window": "128k",
  "strengths": [
    "Latest coding-optimized architecture",
    "Claims to beat Claude 3.5 Sonnet",
    "Fast inference",
    "Good at multi-file projects"
  ],
  "use_case": "Coding tasks, technical implementation",
  "cost_tier": "$20/mo Ollama Cloud Pro",
  "release_date": "2026-02-06",
  "win_rate": "TBD",
  "total_matches": 0
}
```

**Dev Agent Assignment:** Dev 👨‍💻  
**Branch Prefix:** `model-qwen3-coder/`

---

## 📝 Model Notes

### Kimi K2.5
- Established model, proven track record
- Good balance of speed and quality
- Handles edge cases well

### Qwen3-Coder-Next ⭐ NEW
- Just released! Fresh from Ollama
- Specifically optimized for code generation
- Claims:
  - Faster than kimi-k2.5
  - Better than Claude 3.5 Sonnet on CodeArena
  - Superior at system design
- **This is its competitive debut!**

---

## 🔮 Future Candidates

To be tested in future matches:

- `claude-3-5-sonnet` (via Anthropic API)
- `gpt-4o` (via OpenAI API)
- `gemini-2-5-pro` (via Google API)
- `deepseek-coder` (via Ollama)
- `phi-4` (via Ollama)
- `codestral` (via Ollama)

---

## ⚙️ OpenClaw Configuration

To add a new model to the testing pool, update `openclaw.json`:

```json
{
  "models": {
    "kimi-k2-5": "ollama/kimi-k2.5:cloud",
    "qwen3-coder": "ollama/qwen3-coder-next:cloud",
    "claude-sonnet": "anthropic/claude-3-5-sonnet-20241022"
  }
}
```

Then Dev agents can be spawned with specific model:

```
sessions_spawn --model=ollama/qwen3-coder-next:cloud "Implement task..."
```

---

**May the best model win! 🦞🥊**
