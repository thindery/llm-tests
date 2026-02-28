# Ralph Loop + Remy-Tracker System

**Complete orchestration system for managing AI agent workflows with ticket tracking.**

---

## 🎯 What This Is

This system combines:
- **Ralph Loop**: Event-driven agent workflow with structured reporting
- **Remy-Tracker**: SQLite-based ticket system with CLI
- **Ralph Orchestrator**: JavaScript module that coordinates everything

**Result:** Agents work on tickets, report progress automatically, and you see everything in one place.

---

## 📁 Files Created

```
~/.openclaw/workspace/memory/
├── AGENT_TICKET_CONTEXT.md    # Template injected to every agent spawn
└── AGENT_ROLES.md             # Role definitions (Tech Lead, API Arch, etc.)

~/.openclaw/workspace/scripts/
├── ralph-orchestrator.js      # Main orchestration module
├── update-ticket.js           # Auto-updates tickets from agent messages
└── README.md                  # This file
```

---

## 🔄 How It Works (The Full Flow)

### Step 1: You Request Work
```
thindery: "Add OAuth to Pantry-Pal"
```

### Step 2: Remy Creates Ticket + Spawns Agent
```javascript
// Remy runs this internally
const spawn = await createAndSpawn(
  "Add OAuth login flow",
  "api-architect",  // API Arch designs first
  "Pantry-Pal",
  {
    priority: "High",
    acceptanceCriteria: [
      "User can login with Google OAuth",
      "Session persists across reloads",
      "Logout clears session"
    ]
  }
);

// Then spawns the agent with full context
sessions_spawn({
  agentId: "api-architect",
  task: spawn.spawnPrompt  // Includes ticket context + git protocol + reporting rules
});
```

### Step 3: Agent Reports Progress (via sessions_send)
```
api-architect → sessions_send(
  sessionKey: "main",
  message: `
🎫 REMY-043 | 🔌 API Architect Update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Action: Designed OAuth flow with Google Provider
📊 Progress: Design complete, ready for implementation
🌿 Branch: Not yet created (in design phase)
💾 Commits: N/A (design phase)
🚧 Blockers: None
🎯 Next: Need Tech Lead review before spawning Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
)
```

### Step 4: Remy Auto-Updates Ticket
```javascript
// This happens automatically when I receive the message
processAgentMessage(sessionKey, message);

// Result:
// 1. Adds comment to REMY-043
// 2. Detects no status change needed (still in design)
// 3. Logs the progress
```

### Step 5: Handoff to Next Agent
```javascript
// When agent signals ready for review:
// "Status: In QA" OR "Ready for Dev"

handleStatusChange("REMY-043", "Dev Backlog", "api-architect");
// → Spawns Dev agent for implementation
```

### Step 6: Dev Implements (Same Flow)
```
dev → Implements OAuth
     → Reports every 15 mins via sessions_send
     → Remy updates ticket comments
     → Commits with prefix "REMY-043: ..."
     → Moves to "In QA" when ready
     → QA spawns, validates
     → Tech Lead merges
     → Ticket Closed/Done
```

---

## 🎫 Ticket Context Template

Every agent receives this when spawned:

```markdown
## 🎫 Your Ticket
**Ticket ID:** REMY-043
**Title:** Add OAuth login flow
**Status:** To Dev
**Project:** Pantry-Pal

## 🎯 Your Role
**You are: API Architect** (api-architect)
**Specialization:** Backend specialist...
**Responsibilities:** API design, database schema...
**You DON'T Do:** Frontend UI, code review...

## 📁 Codebase
**Repository:** ~/projects/pantry-pal
**Main Branch:** main (ALWAYS branch from here)
**Your Branch:** feature/REMY-043-oauth-login-flow
**Tech Stack:** React, TypeScript, Node.js, Express, SQLite

## ✅ Acceptance Criteria
- [ ] User can login with Google OAuth
- [ ] Session persists across reloads
- [ ] Logout clears session

## 🔄 Ralph Loop Protocol

### Git Protocol (MANDATORY)
```
# ALWAYS start from main
git checkout main
git pull origin main
git checkout -b feature/REMY-043-oauth-login-flow

# Commit format (ALWAYS include ticket ID)
git commit -m "REMY-043: descriptive message"
```

### Reporting Protocol (MANDATORY)
Every 15 mins OR after meaningful progress:

Use `sessions_send` to Remy with this format...
```

---

## 🛠️ Usage

### From Remy's Code (Internal)

```javascript
// When you ask me to start work
import { createAndSpawn, processAgentMessage } from './ralph-orchestrator.js';

// Create ticket and prepare spawn
const result = await createAndSpawn(
  "Fix login bug",
  "dev",                    // Which agent
  "Pantry-Pal",             // Which project
  {
    priority: "High",
    type: "Bug Fix",
    acceptanceCriteria: ["AC1", "AC2"],
    relatedFiles: ["src/auth.tsx"]
  }
);

// Actually spawn the agent
// (I do this via sessions_spawn)
```

### Manual Testing

```bash
# Test creating a ticket + spawn prep
cd ~/.openclaw/workspace/scripts
node ralph-orchestrator.js create "Test feature" dev --project="Pantry-Pal" --priority="High"

# Test processing an agent message
node update-ticket.js --message "🎫 REMY-001 | 🛠️ Dev Update..."
```

### Remy CLI Commands (Direct)

```bash
# List tickets
cd ~/projects/remy-tracker/cli
node src/index.js list

# Create ticket
node src/index.js add "Fix bug" --type="Bug Fix" --priority=High --project=Pantry-Pal --assignee=dev

# Update status
node src/index.js update REMY-001 --status="In Dev"

# Add comment
node src/index.js comment REMY-001 --text="Working on this" --agent=dev --role=dev

# Show ticket
node src/index.js show REMY-001
```

---

## 👥 Agent Roles & When to Use Them

| Agent | Spawn When... | Typical Tickets |
|-------|---------------|-----------------|
| **tech-lead** | Architecture review, code review, merge approval | Review PRs, approve designs |
| **api-architect** | Need API design, database schema | Design endpoints, migrations |
| **api-dev** | Need backend implementation | Build APIs, write queries |
| **fe-dev** | Need React/UI implementation | Build components, pages |
| **frontend-architect** | Need frontend architecture | Component design, state mgmt |
| **dev** | General feature implementation | Implement features, fix bugs |
| **qa** | Need testing/validation | Review code, write tests |
| **designer** | Need UI/CSS work | Styles, responsive, a11y |
| **security-architect** | Security concerns | Audits, auth review |
| **researcher** | Need market/competitive research | Evaluate services, reports |
| **business-analyst** | Need specs/AC written | Requirements, documentation |

---

## 📊 Status Workflow

```
To Research → Dev Backlog → To Dev → In Dev → In QA → Closed/Done
     ↑                                              ↑
     └────────── BLOCKED ←──────────────────────────┘
```

**Who can change status:**
- Agents signal status changes via `sessions_send`
- **I (Remy) actually update the ticket** via CLI
- **Only Tech Lead** can mark Closed/Done

---

## 🔔 Agent Reporting Format

Agents MUST use this format in `sessions_send`:

```
🎫 {TICKET_ID} | {EMOJI} {ROLE_NAME} Update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Action: [What just completed]
📊 Progress: [X of Y AC complete]
🌿 Branch: feature/{TICKET_ID}-{slug}
💾 Commits: [Recent commits]
🚧 Blockers: [None | Description]
🎯 Next: [What doing next]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**I parse this and:**
1. Extract ticket ID
2. Add as comment to ticket
3. Detect status changes
4. Handle blockers
5. Trigger handoffs if needed

---

## 🆘 Handling Blockers

When agent sends:
```
🎫 REMY-043 | 🚨 BLOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚧 Blocker: Google OAuth callback URL unclear
❓ Tried: Read docs, unclear what URL to register
🤔 Need: Decision on production domain
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**I (Remy) do:**
1. Update ticket with blocker comment
2. Change status to appropriate state
3. Message you (thindery) with blocker context
4. Await your decision

---

## ⚙️ How I Process Agent Messages

```javascript
// When I receive sessions_send from agent:

1. Parse message with processAgentMessage()
   → Extract ticket ID
   → Extract agent info
   → Extract status (if any)
   → Build comment text

2. Update ticket via CLI
   remy comment {TICKET_ID} --text="..." --agent={AGENT}
   
3. If status change detected
   remy update {TICKET_ID} --status="{NEW_STATUS}"
   
4. If status requires handoff
   handleStatusChange() → spawn next agent

5. Report to Discord
   "REMY-043 | 🔌 API Architect: OAuth flow designed, ready for review"
```

---

## 🧪 Testing the System

```bash
# Test the orchestrator
cd ~/.openclaw/workspace/scripts
node ralph-orchestrator.js create "Test ticket" dev --project="General" --priority="Low"

# Test message processing
node update-ticket.js --message '🎫 REMY-001 | 🛠️ Dev Update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Action: Created branch feature/REMY-001-test
📊 Progress: 1 of 3 AC complete
🌿 Branch: feature/REMY-001-test
💾 Commits: REMY-001: Initial setup
🚧 Blockers: None
🎯 Next: Implement feature
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

# Check ticket was updated
node ~/projects/remy-tracker/cli/src/index.js show REMY-001
```

---

## 🎓 Planning Phase vs Building Phase

### PLANNING Phase (Status: "To Research")
- Spawn: `tech-lead` or `api-architect`
- Output: Architecture doc, AC list
- Next: Moves to "Dev Backlog"

### BUILDING Phase (Status: "To Dev" → "In Dev")  
- Spawn: `dev`, `api-dev`, or `fe-dev`
- Output: Implementation, commits
- Next: Moves to "In QA"

### REVIEW Phase (Status: "In QA")
- Spawn: `qa` or `tech-lead`
- Output: Review comments
- Next: "Closed/Done" or back to "To Dev"

---

## 🔗 Integration Points

| System | How It Connects |
|--------|-----------------|
| **Remy-Tracker DB** | CLI calls to `remy.db` (SQLite) |
| **Agent Spawns** | `sessions_spawn()` with `AGENT_TICKET_CONTEXT.md` |
| **Agent Reports** | `sessions_send()` to Remy → parsed → CLI update |
| **Discord Updates** | I post summaries after ticket updates |
| **Git Integration** | Agents create branches with ticket ID prefix |

---

## ✅ What's Implemented

- ✅ Agent ticket context template
- ✅ Role definitions (all 12 agents)
- ✅ Ralph orchestrator module
- ✅ Auto-update ticket from agent messages
- ✅ Status transition handling
- ✅ Git protocol enforcement

## 🚧 Next Steps

1. **Test with real ticket** - Create REMY-XXX and spawn an agent
2. **Verify CLI works** - Make sure remy-tracker CLI is accessible
3. **Add Discord posting** - After ticket updates, post to #daily
4. **Agent testing** - Spawn dev agent, verify they can report back
5. **Handoff automation** - Test status change → spawn next agent

---

## 📞 Support

If something breaks:
1. Check remy-tracker CLI: `node ~/projects/remy-tracker/cli/src/index.js list`
2. Check orchestrator logs
3. Verify agent received context in spawn
4. Check if sessions_send messages are parsing correctly

---

*Built for the 🦞 dev team. Let's ship.*
