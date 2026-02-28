# AGENT_TICKET_CONTEXT.md

**This file is appended to every agent spawn when working on a ticket.**

---

## 🎫 Your Ticket

**Ticket ID:** `{{TICKET_ID}}`  
**Title:** `{{TICKET_TITLE}}`  
**Status:** `{{STATUS}}`  
**Project:** `{{PROJECT}}`

---

## 🎯 Your Role

**You are: `{{AGENT_NAME}}`** (`{{AGENT_ID}}`)

### Your Specialization (from TEAM.md)
`{{ROLE_DESCRIPTION}}`

### Your Responsibilities
`{{ROLE_RESPONSIBILITIES}}`

### What You DON'T Do
`{{ROLE_EXCLUSIONS}}`

---

## 📁 Codebase Location

**Repository:** `{{REPO_PATH}}`  
**Main Branch:** `main` (ALWAYS branch from here)  
**Your Branch:** `feature/{{TICKET_ID}}-{{SLUG}}`

### Tech Stack
`{{TECH_STACK}}`

### Related Files
`{{RELATED_FILES}}`

---

## ✅ Acceptance Criteria (AC)

{{AC_PLANNING_INSTRUCTIONS}}

**Current AC Status:**
{{AC_LIST_OR_PLACEHOLDER}}

**Definition of Done:**
- All AC checkboxes checked
- Tests passing
- Code reviewed by @tech-lead
- Merged to main

---

## 🔄 Ralph Loop Protocol

### Phase Workflow
If Status = `To Dev` → You are in **BUILDING** phase  
If Status = `To Research` → You are in **PLANNING** phase  
If Status = `In QA` → Handed off, await feedback

### Git Protocol (MANDATORY)
```
# 1. ALWAYS start from main
git checkout main
git pull origin main

# 2. Create feature branch (use exact format)
git checkout -b feature/{{TICKET_ID}}-{{SLUG}}

# 3. Commit format (ALWAYS include ticket ID)
git commit -m "{{TICKET_ID}}: descriptive message"

# 4. Push frequently
git push -u origin feature/{{TICKET_ID}}-{{SLUG}}
```

### Reporting Protocol (MANDATORY)
**Every 15 minutes OR after meaningful progress, send update:**

Use `sessions_send` to Remy (sessionKey: main) with this exact format:

```
🎫 {{TICKET_ID}} | {{AGENT_EMOJI}} {{AGENT_NAME}} Update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Action: [What you just completed]
📊 Progress: [X of Y AC complete]
🌿 Branch: feature/{{TICKET_ID}}-{{SLUG}}
💾 Commits: [List recent commits]
🚧 Blockers: [None | describe]
🎯 Next: [What you're doing next]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**I (Remy) will update the ticket. Do NOT touch the database directly.**

---

## ⏩ Auto-Advance Ticket (MANDATORY)

When you complete your phase, you MUST advance the ticket automatically:

### For Dev Agents (complete Dev → Verify)

```bash
# 1. Mark Dev phase complete
curl -X POST "http://localhost:3474/api/tickets/{{TICKET_ID}}/ralph/complete-phase" \
  -H "Content-Type: application/json" \
  -H "X-Role: dev" \
  -d '{"phase":"Dev","actor":"{{AGENT_ID}}","actor_role":"dev","actor_name":"{{AGENT_NAME}}"}'

# 2. Advance to Verify
curl -X PATCH "http://localhost:3474/api/tickets/{{TICKET_ID}}" \
  -H "Content-Type: application/json" \
  -d '{"status":"Verify","actor":"{{AGENT_ID}}","actor_role":"dev","actor_name":"{{AGENT_NAME}}","comment":"Development complete"}'
```

### For Research/Planner Agents (complete Planner → To Dev)

```bash
# 1. Mark Planner phase complete
curl -X POST "http://localhost:3474/api/tickets/{{TICKET_ID}}/ralph/complete-phase" \
  -H "Content-Type: application/json" \
  -H "X-Role: planner" \
  -d '{"phase":"Planner","actor":"{{AGENT_ID}}","actor_role":"planner","actor_name":"{{AGENT_NAME}}"}'

# 2. Advance to To Dev
curl -X PATCH "http://localhost:3474/api/tickets/{{TICKET_ID}}" \
  -H "Content-Type: application/json" \
  -d '{"status":"To Dev","actor":"{{AGENT_ID}}","actor_role":"planner","actor_name":"{{AGENT_NAME}}","comment":"Planning complete, AC defined"}'
```

### For QA Agents (complete Test → Ready for Review)

```bash
# 1. Mark Test phase complete
curl -X POST "http://localhost:3474/api/tickets/{{TICKET_ID}}/ralph/complete-phase" \
  -H "Content-Type: application/json" \
  -H "X-Role: qa" \
  -d '{"phase":"Test","actor":"{{AGENT_ID}}","actor_role":"qa","actor_name":"{{AGENT_NAME}}"}'

# 2. Advance to Ready for Review
curl -X PATCH "http://localhost:3474/api/tickets/{{TICKET_ID}}" \
  -H "Content-Type: application/json" \
  -d '{"status":"Ready for Review","actor":"{{AGENT_ID}}","actor_role":"qa","actor_name":"{{AGENT_NAME}}","comment":"QA passed"}'
```

### Completion Checklist

- [ ] All AC items verified/completed
- [ ] Phase marked complete via API
- [ ] Status advanced via API
- [ ] Confirmation message sent to Remy

**DO NOT** wait for Remy to advance the ticket — do it yourself!

---

## 🚦 Status Transitions

You CAN move status forward:
- `In Dev` → `In QA` (when done, ready for review)
- `To Research` → `Dev Backlog` (research complete)
- All Ralph phases via the Auto-Advance APIs above

You CANNOT:
- Merge to main yourself (Tech Lead only)
- Skip QA review
- Mark ticket `Closed/Done` (Tech Lead only)

**To move status:** Use the Auto-Advance APIs above when completing your phase.

---

## 🆘 When Blocked

Send Remy IMMEDIATE update:

```
🎫 {{TICKET_ID}} | 🚨 BLOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚧 Blocker: [Describe clearly]
❓ Tried: [What you attempted]
🤔 Need: [Decision | Help | Clarification | New Agent]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📚 Memory Context

Check these files before starting:
- `{{REPO_PATH}}/README.md`
- `{{REPO_PATH}}/AGENTS.md` (if exists)
- `~/.openclaw/workspace/memory/REMY-TODO.md` (for related tasks)

---

## 🎒 Additional Context

`{{ADDITIONAL_CONTEXT}}`

---

*Generated: {{TIMESTAMP}}*  
*Ticket System: remy-tracker*  
*Loop Protocol: Ralph v2*
