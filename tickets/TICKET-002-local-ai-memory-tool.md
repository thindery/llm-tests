# TICKET-002: Local-Only AI Memory Tool (Rewind Alternative)

## Status
📋 **To Research** | Created: 2026-03-15 | Priority: 9/10

---

## Overview
Build an open-source, self-hosted, local-only screen capture + semantic search tool as a privacy-first alternative to Rewind (acquired/pivoted) and Microsoft Recall (privacy disaster).

**Target Experience:** Clean, polished macOS app similar to Ollama's interface on Mac mini — simple, elegant, local-first.

---

## Problem Statement

### User Pain Points
- **Rewind gone:** Rewind was acquired and pivoted away from consumer product
- **Microsoft Recall toxic:** Privacy disaster, cloud concerns, brand damage
- **Cloud tools creepy:** Users don't want their screen content uploaded to servers
- **No good alternatives:** Existing solutions are either cloud-based or too technical

### Market Validation
- Ghost Widget (9th grader's project): 10 demo signups in first week with zero marketing
- "Pensieve" GitHub project gaining traction in r/selfhosted
- Strong latent demand in privacy-conscious communities
- 933-point HN post: "Can I run AI locally?" shows massive interest

---

## Research File
📄 **Source:** `memory/BUSINESS-SCOUT-2026-03-13.md` (Opportunity #8 - Local-Only AI Memory)

---

## Investigation Requirements

The team should produce a comprehensive writeup covering:

### 1. How It Works (Product Design)
- [ ] User flow from installation to first search
- [ ] Screen capture mechanism (continuous vs. triggered)
- [ ] Indexing strategy (what gets captured, what doesn't)
- [ ] Search interface design (natural language vs. keyword)
- [ ] Privacy controls (exclude apps, pause capture, delete history)
- [ ] Export/import functionality

### 2. Technical Architecture
- [ ] Screen capture technology (macOS ScreenCaptureKit vs. alternatives)
- [ ] OCR engine selection (Apple Vision vs. Tesseract vs. custom)
- [ ] Embedding model for semantic search (local vs. API)
- [ ] Database choice (SQLite, Core Data, or specialized vector DB)
- [ ] Storage optimization (compression, deduplication)
- [ ] Indexing pipeline architecture
- [ ] Search implementation (vector similarity + metadata filtering)

### 3. Development Cost & Timeline
- [ ] MVP scope definition (MVP vs. v1.0 vs. full product)
- [ ] Team composition needed (roles, FTE estimates)
- [ ] Development timeline (phases, milestones)
- [ ] Infrastructure costs (CI/CD, testing, signing certificates)
- [ ] Third-party licensing costs (if any)
- [ ] Total cost estimate (conservative, moderate, aggressive scenarios)

### 4. Support & Update Strategy
- [ ] Update mechanism (Sparkle, Mac App Store, or custom)
- [ ] Model update strategy (how to ship new embedding models)
- [ ] Data migration between versions
- [ ] Customer support channels (GitHub issues, Discord, email)
- [ ] Documentation strategy (user docs, API docs if applicable)
- [ ] Community building approach (open source strategy)

### 5. Competitive Analysis
- [ ] Detailed comparison with Pensieve, Microsoft Recall, Rewind
- [ ] Feature gap analysis
- [ ] Pricing strategy (open source, freemium, or paid)
- [ ] Differentiation strategy

### 6. Risk Assessment
- [ ] Technical risks (performance, storage, battery impact)
- [ ] Privacy/legal risks (GDPR, data retention, consent)
- [ ] Market risks (competition, user adoption)
- [ ] Mitigation strategies for each risk

---

## UI/UX Reference

**Target:** Ollama-style clean interface on macOS
- Minimal, native-feeling design
- Menu bar integration
- Simple onboarding
- No clutter, focused on core functionality
- Dark mode support

**Reference Screenshots:**
- Ollama Mac app interface
- Clean system preferences-style settings
- Spotlight-style search overlay

---

## Success Criteria

Research deliverable should enable go/no-go decision on:
1. Technical feasibility
2. Development resource requirements
3. Market opportunity sizing
4. Competitive positioning viability

---

## Next Steps (Post-Research)
- [ ] Review research artifacts
- [ ] Go/No-Go decision
- [ ] If Go: Create architecture ticket
- [ ] If Go: Create MVP dev tickets

---

## Tags
`#AI` `#Privacy` `#Productivity` `#macOS` `#Local-First` `#Open-Source`

---

**Assigned To:** Research Team  
**Due Date:** TBD (suggest 1 week for initial research)  
**Artifacts Location:** `/artifacts/TICKET-002-research/`