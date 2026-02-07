# Fact: Qwen3-Coder-Next Model Discovered

**Discovered:** 2026-02-06 22:30 CST  
**Source:** thindery (Discord)  
**Verified:** Yes, exists on Ollama Cloud

---

## Details

**Model:** `ollama/qwen3-coder-next:cloud`

**Key Information:**
- **Provider:** Ollama Cloud Pro
- **Type:** Coding-specialized LLM
- **Release:** Just released (2026-02-06)
- **Claims:** 
  - Outperforms Claude 3.5 Sonnet on coding benchmarks
  - Faster inference than kimi-k2.5
  - Better at complex multi-file architectures

**Context Window:** 128k tokens

**Cost:** $20/mo Ollama Cloud Pro (same plan as kimi-k2.5)

---

## Significance

This is a significant discovery for the dev team:

1. **New coding model** that claims to beat Claude 3.5 Sonnet
2. **Available now** on Ollama Cloud (no new API key needed)
3. **Free to test** with existing $20/mo plan
4. **Potential upgrade path** from kimi-k2.5 for coding tasks

---

## Action Taken

Created `llm-tests` repo for competitive A/B testing:
- Match #001: React TODO App
- Blue Corner: kimi-k2.5 vs Red Corner: qwen3-coder-next
- Tech Lead will review and declare winner
- Results stored in `~/projects/llm-tests/`

**Branch naming established:**
- `model-kimi-k2-5/task-XXX-description`
- `model-qwen3-coder/task-XXX-description`

---

## Future Use

This model testing framework will be used for:
- Evaluating new models before adoption
- Comparing coding performance
- Cost-benefit analysis (speed vs quality)
- Team workflow optimization

**Next Steps:**
- Complete Match #001 (TODO app)
- If qwen3-coder-next wins → consider switching default coding model
- Continue testing new models as released

---

**Related:**
- Entity: `llm-tests-competitive-framework` (in llm-tests/ repo)
- Persona: Dev 👨‍💻 (assigned to both models)
- Persona: Tech Lead 👨‍💼 (reviews and judges)

**Last Updated:** 2026-02-06 22:37 CST
