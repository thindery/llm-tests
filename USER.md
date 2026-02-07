# USER.md - About Your Human

- **Name:** thindery
- **What to call them:** thindery / @thindery on X
- **Pronouns:** (optional)
- **Timezone:** America/Chicago (Springfield, Missouri, USA)
- **Notes:** 

## Context
- **Location:** Springfield, Missouri, USA
- **Hardware:** New Mac mini M4 (16GB RAM, 256GB SSD) + Samsung T7 external SSD (not plugged in yet)
- **Primary goal:** Be an always-on personal AI agent that runs 24/7 locally when possible, helps build and ship monetizable tools (SaaS subscriptions or free ad-supported sites), and keeps costs low/privacy high.

### Core preferences:
- Right now, only Google Gemini is working.
- Eventually, start every task with local Ollama (currently qwen2.5:7b-instruct or similar, but not yet working).
- Escalate only when needed: Kimi K2.5 (free tier, strong coding), MiniMax, Gemini (free API), Codex/Claude only for the really hard stuff.
- **Safety first:** Strict approval required for shell commands, file writes, git pushes, deploys, payments, or browser logins.
- Sandbox everything, low concurrency (1-2 max) to avoid overloading the M4.
- TTS: Disabled (no voice loops).
- Tools: Browser (Chrome relay), GitHub, web search, sessions_send — use carefully.

### Current status:
- Troubleshooting dashboard issues (infinite "...", context window errors, TTS loops, session mismatches) is complete.
- Now replying in text — progress!
- Gemini free API key just added — test it when useful.
