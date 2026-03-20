# TICKET-001: Local-First AI Meeting Assistant

## Status
📋 **To Architect** | Created: 2026-03-03 | Priority: High

---

## Overview
Build a privacy-first, local macOS meeting assistant that captures system audio + microphone directly—no meeting bot required.

## Context
From Business Scout Report - March 3, 2026 (Opportunity #1, Option 2)

**Why Local?** 
- Privacy: Audio never leaves machine
- Works on any call (even platforms that block bots)
- No "unknown bot" permission issues
- Compliance-friendly for sensitive industries

---

## Requirements

### Core Features
- [ ] macOS menu bar app
- [ ] Capture system audio + mic locally
- [ ] Transcribe via Whisper (local or API)
- [ ] Extract action items via LLM
- [ ] Export to Todoist/Notion/Slack
- [ ] Zero external dependencies until export step

### Constraints
- Must work on Apple Silicon (M-series)
- Must handle multiple audio sources
- Must not require kernel extensions (if possible)

---

## Technical Decisions Needed

- [ ] **Audio Capture**: BlackHole vs virtual audio driver vs ScreenCaptureKit vs CA Virtual Audio
- [ ] **Transcription**: Local (whisper.cpp) vs API (OpenAI Whisper) - latency vs cost
- [ ] **App Framework**: SwiftUI (native) vs Tauri (fast) vs Electron (familiar)
- [ ] **LLM for Actions**: Local model (Ollama) vs API (Claude/GPT4)
- [ ] **Meeting Detection**: Calendar integration vs manual toggle
- [ ] **Data Storage**: SQLite vs JSON vs Core Data

---

## Deliverable

Architecture document with:
1. Component diagram
2. Data flow architecture
3. Tech stack recommendations (with tradeoffs)
4. MVP scope vs v2 scope
5. Risk/mitigation strategies
6. Cost estimates (if using APIs)

---

## Next Steps
- [ ] Architect planning (assigned)
- [ ] Elon review (pending)
- [ ] Dev ticket creation (after review)

---

## References
- Business Scout Report: `memory/BUSINESS-SCOUT-2026-03-03.md`
- Opportunity #1 in `#business-scout` channel
