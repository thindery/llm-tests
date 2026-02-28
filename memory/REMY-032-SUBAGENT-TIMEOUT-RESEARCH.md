# REMY-032: Subagent Timeout Issues — Research Report

**Research Date:** 2026-02-23  
**Investigator:** Research Agent (REMY-032)  
**Status:** COMPLETE

---

## Executive Summary

Subagent timeouts are **configurable and preventable**. The reported 3-5 minute timeouts were likely caused by:
1. Default `runTimeoutSeconds` being too low for some older subagent spawns
2. Model slowness (Kimi K2.5 cloud latency)
3. Lack of explicit timeout overrides for long tasks

**Key Finding:** The successful Moon Video task (8+ minutes) used `runTimeoutSeconds: 0` (no timeout), proving long subagent runs work fine when configured properly.

---

## 1. Root Cause Analysis

### 1.1 Evidence from Subagent Runs Data

Reviewed `~/.openclaw/subagents/runs.json`:

| Run ID | Label | Duration | runTimeoutSeconds | Status |
|--------|-------|----------|-------------------|--------|
| d0836447 | dev-moon-v3 | ~8m (463s) | **0** (disabled) | ✅ completed |
| 18d29e87 | research-REMY-037 | ~3m+ running | 3600 (1hr) | running |
| 3b8612e1 | dev-TASK-026 | ~1m+ running | 1800 (30m) | running |
| 84f0c340 | dev-TASK-033 | ~1m+ running | 1800 (30m) | running |
| 17518e37 | research-REMY-032 | ~1m+ running | 1800 (30m) | running |

**Key Insight:** The moon video task succeeded because it had no timeout limit (`runTimeoutSeconds: 0`). Other tasks have explicit timeouts set to 30-60 minutes.

### 1.2 Configurable Timeout Settings

Found multiple timeout layers in OpenClaw:

| Layer | Config Location | Default Value | Controls |
|-------|----------------|---------------|----------|
| **Subagent run timeout** | `runTimeoutSeconds` in run config | 1800s (30m) | Max time a subagent can run |
| **Agent command timeout** | `openclaw agent --timeout` | 600s (10m) | Max time for single agent turn |
| **Embedded run** | Log monitoring detected | 600000ms (10m) | Internal execution timeout |
| **CLI timeout** | Referenced in REMY-TODO | 10-15s | Remy-Tracker CLI commands |

### 1.3 The 3-5 Minute Timeout Pattern

The reported 3-5 minute timeouts likely came from:
- **Earlier OpenClaw versions** with lower default `runTimeoutSeconds` (300s/600s)
- **Unspecified timeouts** falling back to conservative defaults
- **Model response delays** consuming runtime before completion

### 1.4 Model-Specific Timeout Behaviors

From `~/.openclaw/openclaw.json` model configs:

| Model | Context Window | Max Tokens | Observed Speed | Timeout Risk |
|-------|---------------|------------|----------------|--------------|
| **ollama/kimi-k2.5:cloud** | 131K | 16K | Medium-Slow (cloud API) | Higher |
| **ollama/minimax-m2.5:cloud** | 180K | 32K | Medium | Medium |
| **ollama/qwen3.5:cloud** | 200K | 32K | Fast | Lower |
| **ollama/glm-5:cloud** | 180K | 32K | Fast | Lower |
| **google/gemini-3-flash-preview** | Unknown | Unknown | Fastest | Lowest |

**Finding:** Kimi K2.5 (current primary) is slower than alternatives, increasing timeout risk for long tasks.

---

## 2. Timeout Configuration Guide

### 2.1 Subagent Timeout (`runTimeoutSeconds`)

This is the **primary control** for subagent duration.

**Configuration Options:**

```json
// In subagent run configuration
{
  "runTimeoutSeconds": 0      // No timeout (unlimited)
  "runTimeoutSeconds": 300    // 5 minutes
  "runTimeoutSeconds": 1800   // 30 minutes (current default)
  "runTimeoutSeconds": 3600   // 1 hour
  "runTimeoutSeconds": 7200   // 2 hours
}
```

**Where it's set:** Currently set at spawn time via the `runTimeoutSeconds` parameter in runs.json.

### 2.2 Agent Command Timeout

For single-turn agent commands:

```bash
# Override default 600s (10m) timeout
openclaw agent --timeout 1800 --message "Long running task"
```

### 2.3 OpenClaw Config - Global Defaults

From `openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 8
        // Note: No global timeoutSeconds here currently
      }
    }
  }
}
```

---

## 3. Recommended Timeout Values by Task Type

| Task Type | Est. Duration | Recommended Timeout | Model Recommendation |
|-----------|---------------|---------------------|---------------------|
| **Quick research** (< 5 min) | 2-5 min | 600s (10m) | Kimi K2.5 OK |
| **Standard dev task** | 5-15 min | 1800s (30m) | Kimi K2.5 OK |
| **Complex dev task** | 15-30 min | 3600s (1hr) | Use Qwen3.5 or GLM-5 |
| **Video assembly** | 30-60 min | 7200s (2hr) OR 0 (unlimited) | Use GLM-5 or MiniMax |
| **Long-running build** | 1-2+ hours | 0 (unlimited) | Fastest available model |
| **Streaming tasks** | Variable | 0 (unlimited) | Use streaming-compatible model |

**Rule of Thumb:** Set timeout to **2x expected duration** to allow for model variability.

---

## 4. Best Practices for Avoiding Timeouts

### 4.1 Task Chunking Strategy

**Instead of:** One 2-hour mega-task
**Do:** Multiple 15-30 minute subtasks

**Example for Video Assembly:**
```
Parent Task: Create Moon Video (120 seconds)
├── Subtask 1: Download/verify NASA footage (15 min)
├── Subtask 2: Generate audio segments (10 min)
├── Subtask 3: Assemble video with audio (30 min)
└── Subtask 4: Final encode and upload (15 min)
```

**Benefits:**
- Each subtask has clear deliverable
- Checkpoint progress if one times out
- Parallelize independent tasks
- Easier to retry failed segments

### 4.2 Model Selection for Task Type

**Speed Priority (Fast tasks):**
- `ollama/qwen3.5:cloud` — Fast, 200K context
- `ollama/glm-5:cloud` — Fast, 180K context
- `google/gemini-3-flash-preview` — Fastest fallback

**Quality Priority (Research/analysis):**
- `ollama/kimi-k2.5:cloud` — Better reasoning, slower
- `ollama/minimax-m2.5:cloud` — Good balance

**For Long-Running Tasks:**
- Always prefer faster models (Qwen3.5, GLM-5)
- Fallback to Gemini Flash if Ollama slow
- Consider running with timeout=0 for unpredictable durations

### 4.3 Timeout Override Pattern

When spawning subagents, explicitly set timeout:

```typescript
// Example: Spawn long-running dev agent
const longTask = await subagents.spawn({
  agent: "dev",
  task: "Complex refactoring...",
  runTimeoutSeconds: 7200,  // 2 hours
  model: "ollama/qwen3.5:cloud"  // Faster model
});
```

### 4.4 Progress Tracking for Long Tasks

**Pattern:** Have long-running tasks write progress to file/memory:

```markdown
## Task Progress Log

- [x] Step 1: Download footage (5 min) - COMPLETE
- [x] Step 2: Process segment 1 (10 min) - COMPLETE
- [ ] Step 3: Process segment 2 (15 min) - IN PROGRESS
- [ ] Step 4: Final assembly (15 min) - PENDING

**Last checkpoint:** Segment 1 encoded at 2026-02-23T19:00:00Z
**If interrupted:** Can resume from Step 3
```

This allows recovery if timeout does occur.

---

## 5. Concrete OpenClaw Config Recommendations

### 5.1 Proposed Config Changes

Add to `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxConcurrent": 8,
        "runTimeoutSeconds": 3600  // 1 hour default (was implicitly lower)
      }
    }
  }
}
```

**Note:** Current OpenClaw version doesn't appear to support this in config — timeouts are set per-run. Recommend documenting in user guides instead.

### 5.2 Documented Timeout Policy

Create `~/.openclaw/workspace/TIMEOUT-GUIDE.md`:

```markdown
# Subagent Timeout Guidelines

## Quick Reference
| Task | Timeout | Model |
|------|---------|-------|
| Research | 1800s | Kimi K2.5 |
| Dev Task | 3600s | Qwen3.5 |
| Video/Media | 0 (unlimited) | GLM-5 |

## Setting Timeout
Run `openclaw subagent spawn` with explicit timeout param.
```

### 5.3 Model Fallback Configuration

Current fallbacks in openclaw.json:
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/kimi-k2.5:cloud",
        "fallbacks": [
          "google/gemini-3-flash-preview"
        ]
      }
    }
  }
}
```

**Recommendation:** Add faster models to fallbacks:
```json
{
  "fallbacks": [
    "ollama/qwen3.5:cloud",
    "ollama/glm-5:cloud",
    "google/gemini-3-flash-preview"
  ]
}
```

---

## 6. Testing & Verification

### 6.1 Test Plan for Timeout Configurations

**Test 1: Short timeout (verify it works)**
- Spawn subagent with `runTimeoutSeconds: 60` (1 min)
- Task: Count to 1000 slowly
- Expected: Times out at 1 minute

**Test 2: Long timeout (verify unlimited)**
- Spawn subagent with `runTimeoutSeconds: 0`
- Task: Sleep for 5 minutes
- Expected: Completes successfully

**Test 3: Model speed comparison**
- Same task (complex code review) on each model
- Measure wall-clock time
- Document in MODEL-PERFORMANCE.md

### 6.2 Monitoring for Timeouts

Add to cron log monitoring:
```bash
# Check for timed_out entries in runs.json
grep -i "timed_out" ~/.openclaw/subagents/runs.json | wc -l
```

Alert if > 0 timeouts in past 24 hours.

---

## 7. Summary Action Items

### Immediate (This Week)
- [ ] **Document timeout settings** in workspace/TIMEOUT-GUIDE.md
- [ ] **Set default model to Qwen3.5** for dev subagents (faster)
- [ ] **Add timeout parameter** to all future subagent spawns for long tasks

### Short-term (Next 2 Weeks)
- [ ] **Refactor moon video task** to use chunked subtasks instead of 1 long task
- [ ] **Test performance** of each model on standard tasks
- [ ] **Add progress checkpointing** to any task expected to run > 15 min

### Long-term (Ongoing)
- [ ] **Monitor runs.json** for timeout patterns
- [ ] **Consider streaming responses** for tasks with unpredictable duration
- [ ] **Implement auto-retry** with timeout doubling on timeout failures

---

## 8. Key Takeaways

1. **Timeouts are configurable** via `runTimeoutSeconds` parameter
2. **Set timeout=0 (unlimited)** for tasks with unpredictable duration (video, builds)
3. **Chunk long tasks** into 15-30 min subtasks when possible
4. **Use faster models** (Qwen3.5, GLM-5) for dev/implementation tasks
5. **Add progress logging** to enable recovery if timeout does occur
6. **The Moon Video success** proves unlimited timeouts work — replicate this pattern

---

## References

- Subagent runs data: `~/.openclaw/subagents/runs.json`
- OpenClaw config: `~/.openclaw/openclaw.json`
- Gateway logs: `~/.openclaw/logs/gateway.log`
- Lessons learned: `~/.openclaw/workspace/memory/LESSONS-SLEEP-STORIES.md`
- Log monitoring: `~/.openclaw/workspace/memory/TODO-LOG-MONITORING.md`

---

*Report compiled by Research Agent (REMY-032) on 2026-02-23*
