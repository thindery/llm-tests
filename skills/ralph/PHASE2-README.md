# Phase Tracker v2 - TASK-040 Implementation

Phase 2 improvements for the Ralph workflow phase detection and auto-completion system.

## 🎯 Goals Achieved

### 1. Auto-Detection Improvements ✅
- **Detection of dev work completion** (not just commits)
  - Runs tests (`npm test`)
  - Checks build success (`npm run build`)
  - Validates linting (`npm run lint`)
  - Verifies AC completion status
  - Checks git work status (uncommitted/pushed changes)

- **Auto-verify logic**
  - Configurable verification pipeline
  - Test output capture and analysis
  - Build artifact validation
  - Coverage threshold checks (configurable)

- **Auto-review triggers**
  - Automatic queue for review when Test phase passes
  - Configurable auto-advance rules
  - Webhook-style triggers via watch mode

### 2. Phase State Recovery ✅
- **Crash detection**
  - Monitors stale phase transitions (5+ min old)
  - Tracks agent heartbeats via state file
  - Identifies incomplete phases on restart

- **Persistent storage**
  - JSON state file: `~/.openclaw/workspace/.phase-state.json`
  - Atomic writes with temp-file-then-rename
  - Version tracking for migrations

- **Reconciliation on restart**
  - `recover` command reconciles phase state with API
  - Reports crashed phases for manual review
  - Comments on tickets for visibility

### 3. Parallel Phase Safety ✅
- **Lock mechanism**
  - File-based distributed locking
  - Lock tokens for ownership verification
  - Automatic lock expiration (5 min default)
  - Lock extension capability

- **Conflict resolution**
  - Detects duplicate phase assignments
  - Returns lock owner for visibility
  - Prevents concurrent phase transitions
  - Stale lock cleanup

## 📁 Files Created

```
skills/ralph/
├── phase-tracker.ts          # Core TypeScript module (main implementation)
├── run-phase-tracker.sh      # CLI wrapper for TypeScript
├── ralph-auto-complete.sh    # Auto-completion trigger script
├── ralph-recovery.sh         # Crash recovery script
├── ralph-watch.sh            # Daemon/watch mode script
└── PHASE2-README.md          # This file
```

## 🚀 Usage

### Starting a Phase

```bash
# Acquire lock and start tracking
./run-phase-tracker.sh start REMY-042 Dev

# Or via auto-complete (one-shot)
./ralph-auto-complete.sh --ticket=REMY-042
```

### Running Verification

```bash
# Verify dev completion (tests, build, AC)
./run-phase-tracker.sh verify REMY-042 ~/projects/my-repo

# With specific repo path
./run-phase-tracker.sh verify REMY-042 /path/to/repo
```

### Completing a Phase

```bash
# Complete Dev phase, advance to In QA
./run-phase-tracker.sh complete REMY-042 Dev "In QA"
```

### Watch/Monitor Mode

```bash
# Start daemon watching for completion
./ralph-watch.sh --ticket=REMY-042 --repo=~/projects/my-repo

# Check status
./ralph-watch.sh --status

# Stop
./ralph-watch.sh --stop
```

### Recovery

```bash
# Check and recover crashed phases
./ralph-recovery.sh --max-age=10

# Auto-fix mode
./ralph-recovery.sh --auto-fix
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REMY_API` | `http://localhost:3474/api` | Remy-Tracker API endpoint |
| `PHASE_STATE_FILE` | `~/.openclaw/workspace/.phase-state.json` | State persistence path |
| `PHASE_LOCK_DIR` | `~/.openclaw/workspace/.phase-locks` | Lock directory |
| `AGENT_ID` | Random UUID | Unique agent identifier |
| `PHASE_TRACKER_VERBOSE` | `false` | Enable verbose logging |

### Auto-Trigger Configuration

```typescript
const tracker = new PhaseTracker({
  onTestPass: true,        // Complete phase on test pass
  onBuildSuccess: true,    // Require build success
  onAllACPass: true,       // Require all AC passing
  autoQueueForReview: true, // Auto-queue when Test phase passes
  minimumCoverage: 80       // Minimum test coverage %
});
```

## 🔧 Integration with Ralph Orchestrator

The `PhaseTracker` class can be integrated into `ralph-orchestrator.js`:

```javascript
const { PhaseTracker } = require('./skills/ralph/phase-tracker.ts');

// During ticket creation
const tracker = new PhaseTracker();
await tracker.startPhase(ticketId, 'Dev');

// During verification
const result = await tracker.checkDevCompletion(ticketId, repoPath);
if (result.complete) {
  await tracker.completePhase(ticketId, 'Dev', { nextStatus: 'In QA' });
}

// Recovery on startup
await tracker.recoverCrashedPhases();
```

## 🛡️ Safety Features

### Distributed Locking
- File-based locks prevent concurrent phase operations
- Lock timeout prevents permanent deadlock
- Lock tokens verify ownership
- Automatic cleanup on timeout

### State Recovery
- Tracks phase transitions in persistent storage
- Detects agent crashes (stale locks/transitions)
- Reconciles state on restart
- Manual intervention for incomplete phases

### Verification Pipeline
- Multiple verification checks before allowing completion
- Configurable strictness
- Detailed failure reporting
- Git work verification

## 📊 API Integration

The phase-tracker uses Remy-Tracker API endpoints:

```
GET  /api/tickets/{id}                           - Get ticket info
GET  /api/tickets/{id}/ac                        - Get acceptance criteria
POST /api/tickets/{id}/ralph/complete-phase      - Mark phase complete
PATCH /api/tickets/{id}                          - Update status
POST /api/tickets/{id}/ralph/queue-review      - Queue for review
```

## 🧪 Testing

```bash
# Test verification
./run-phase-tracker.sh verify REMY-TEST . --verbose

# Test locking
./run-phase-tracker.sh start REMY-TEST Dev
./run-phase-tracker.sh status REMY-TEST
./run-phase-tracker.sh extend REMY-TEST Dev

# Test recovery
./run-phase-tracker.sh recover 5
./run-phase-tracker.sh cleanup
```

## 📝 State File Format

```json
{
  "version": "2.0",
  "updatedAt": "2025-02-27T13:00:00.000Z",
  "agentId": "agent-uuid",
  "tickets": {
    "REMY-042": {
      "ticketId": "123",
      "ticketNumber": "REMY-042",
      "currentPhase": "Dev",
      "phaseStatus": "in_progress",
      "startedAt": "2025-02-27T12:00:00.000Z",
      "lastActivity": "2025-02-27T12:30:00.000Z",
      "agentId": "agent-uuid",
      "verificationResults": [
        {
          "type": "test",
          "status": "pass",
          "startedAt": "2025-02-27T12:25:00.000Z",
          "completedAt": "2025-02-27T12:30:00.000Z"
        }
      ],
      "lockToken": "lock-uuid"
    }
  }
}
```

## 🔒 Lock File Format

```json
{
  "ticketId": "123",
  "phase": "Dev",
  "agentId": "agent-uuid",
  "acquiredAt": "2025-02-27T12:00:00.000Z",
  "expiresAt": "2025-02-27T12:05:00.000Z",
  "token": "lock-uuid"
}
```