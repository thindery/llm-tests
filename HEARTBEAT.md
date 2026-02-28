# HEARTBEAT.md - Periodic Checks

## Every Heartbeat (30 min)

### Ticket Board Health Check
1. Query Remy-Tracker API for stuck tickets:
   - `To Dev` > 2 days old → Move to `In Dev`
   - `Dev Backlog` > 3 days old → Spawn dev agent
   - `In Dev` > 4 days old → Escalate to user
   - `To Research` > 5 days old → Review and close or prioritize

2. If tickets need moving:
   - Use `ralph-phase.sh` or `remy move` commands
   - Never use raw SQL for ticket operations

3. Spawn agents for active work:
   - Pick highest priority ticket from Dev Backlog/To Dev
   - Create feature branch with `ralph-ac.sh`
   - Assign task to dev agent

### Criteria for Action
- Dev Backlog > 3 days → Spawn agent immediately  
- To Dev > 2 days → Move to In Dev
- In Dev > 4 days → Report to user

### Stats to Track
- Total active tickets
- Tickets stuck > threshold
- Agents currently running

---

## On Startup (read MEMORY.md first)
- Check MEMORY.md for today's priorities
- Review HEARTBEAT-STATE.json for last check results
- Resume any interrupted work
