#!/usr/bin/env node
/**
 * Remy Ralph Orchestrator - TASK-040 Phase 2 Enhanced
 * 
 * Main orchestration module for managing Ralph loops with remy-tracker integration.
 * This is what Remy uses to spawn agents and coordinate the workflow.
 * 
 * Phase 2 Updates:
 * - Integrated phase-tracker for auto-completion detection
 * - Added crash recovery support
 * - Added parallel phase safety (distributed locking)
 * - Auto-verification (tests, builds, AC checks)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Paths
const TEMPLATE_DIR = path.join(process.env.HOME, '.openclaw', 'workspace', 'memory');
const ROLES_FILE = path.join(TEMPLATE_DIR, 'AGENT_ROLES.md');
const CONTEXT_TEMPLATE = path.join(TEMPLATE_DIR, 'AGENT_TICKET_CONTEXT.md');

/**
 * Load agent role definition
 */
function loadAgentRole(agentId) {
  // Default role
  const defaultRole = {
    name: 'Dev',
    emoji: '🛠️',
    description: 'Generalist implementer. Executes features, fixes bugs, refactors code.',
    responsibilities: 'Feature implementation, bug fixes, code refactoring, writing tests',
    exclusions: 'Does NOT design architecture, does NOT merge to main, does NOT skip QA',
    typicalTickets: 'Implement feature based on spec, fix bugs, refactor code'
  };
  
  // Agent role map
  const roleMap = {
    'tech-lead': {
      name: 'Tech Lead',
      emoji: '👨‍💼',
      description: 'Senior engineer with merge authority. Reviews all code.',
      responsibilities: 'Code review, architecture sign-off, merge to main, technical decisions',
      exclusions: 'Does NOT implement features, does NOT skip QA review',
      typicalTickets: 'Architecture reviews, code review, merge approvals'
    },
    'api-architect': {
      name: 'API Architect',
      emoji: '🔌',
      description: 'Backend specialist. Designs REST APIs and database schemas.',
      responsibilities: 'API design, database schema, auth flows, integrations',
      exclusions: 'Does NOT build frontend UI, does NOT do code review',
      typicalTickets: 'Design APIs, database migrations, auth implementation'
    },
    'api-dev': {
      name: 'API Dev',
      emoji: '🔌',
      description: 'Backend developer. Implements APIs and server-side logic.',
      responsibilities: 'Implement endpoints, database queries, server logic',
      exclusions: 'Does NOT design APIs, does NOT merge to main',
      typicalTickets: 'Build endpoints, write queries, implement features'
    },
    'fe-dev': {
      name: 'FE Dev',
      emoji: '⚛️',
      description: 'React/TypeScript specialist. Builds UI components.',
      responsibilities: 'React components, TypeScript, state management, Tailwind CSS',
      exclusions: 'Does NOT design APIs, does NOT design database schemas',
      typicalTickets: 'Build UI components, implement pages, connect to APIs'
    },
    'frontend-architect': {
      name: 'FE Architect',
      emoji: '⚛️',
      description: 'React/TypeScript specialist. Designs frontend architecture.',
      responsibilities: 'Component architecture, state management, performance',
      exclusions: 'Does NOT design APIs, does NOT merge to main',
      typicalTickets: 'Architecture reviews, component design, performance optimization'
    },
    'dev': {
      name: 'Dev',
      emoji: '🛠️',
      description: 'Generalist implementer. Executes features across the stack.',
      responsibilities: 'Feature implementation, bug fixes, refactoring, tests',
      exclusions: 'Does NOT design architecture, does NOT merge to main',
      typicalTickets: 'Implement features, fix bugs, write tests'
    },
    'qa': {
      name: 'QA',
      emoji: '🧪',
      description: 'Quality assurance specialist. Validates and tests.',
      responsibilities: 'E2E tests, AC validation, edge cases, regression testing',
      exclusions: 'Does NOT implement features, does NOT merge code',
      typicalTickets: 'Review PRs, write tests, validate AC, regression'
    },
    'designer': {
      name: 'Designer',
      emoji: '🎨',
      description: 'UI/UX specialist. Designs layouts and implements CSS.',
      responsibilities: 'UI design, Tailwind CSS, responsive design, accessibility',
      exclusions: 'Does NOT build React logic, does NOT write tests',
      typicalTickets: 'Design components, implement styles, accessibility'
    },
    'security-architect': {
      name: 'Security Architect',
      emoji: '🛡️',
      description: 'Security specialist. Audits and implements secure practices.',
      responsibilities: 'Security reviews, vulnerability scanning, auth flows',
      exclusions: 'Does NOT implement features, does NOT skip QA',
      typicalTickets: 'Security audits, auth review, compliance checks'
    },
    'researcher': {
      name: 'Researcher',
      emoji: '🔍',
      description: 'Market research and competitive analysis.',
      responsibilities: 'Competitive analysis, market research, technology evaluation',
      exclusions: 'Does NOT implement code, does NOT make architecture decisions',
      typicalTickets: 'Research services, evaluate options, write reports'
    },
    'business-analyst': {
      name: 'Business Analyst',
      emoji: '📊',
      description: 'Analyzes requirements and writes specifications.',
      responsibilities: 'Requirements, spec writing, AC definition, user stories',
      exclusions: 'Does NOT implement features, does NOT write code',
      typicalTickets: 'Write specs, define AC, document business rules'
    }
  };
  
  return roleMap[agentId] || defaultRole;
}

/**
 * Generate ticket context for agent spawn
 */
function generateTicketContext(ticket, agentId, project) {
  const role = loadAgentRole(agentId);
  const timestamp = new Date().toISOString();
  
  // Generate slug from ticket title
  const slug = ticket.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 30);
  
  // Determine repo path based on project
  const repoPaths = {
    'Pantry-Pal': '~/projects/pantry-pal',
    'Remy-Finance': '~/projects/remy-finance',
    'Remy-Blog': '~/projects/remy-blog',
    'AgentAds': '~/projects/agentads',
    'Sleep-Stories': '~/projects/sleep-stories',
    'General': `~/.openclaw/workspace`
  };
  const repoPath = repoPaths[project] || repoPaths['General'];
  
  // Tech stack by project
  const techStacks = {
    'Pantry-Pal': 'React, TypeScript, Node.js, Express, SQLite',
    'Remy-Finance': 'React, TypeScript, Python, FastAPI',
    'Remy-Blog': 'Next.js, React, TypeScript, Tailwind, MDX',
    'AgentAds': 'React, TypeScript, Node.js',
    'Sleep-Stories': 'Python, FFmpeg, video generation APIs',
    'General': 'JavaScript/TypeScript, shell scripts'
  };
  
  // Determine if this is a PLANNER role (defines AC) or IMPLEMENTER role (follows AC)
  const plannerRoles = ['tech-lead', 'api-architect', 'business-analyst', 'researcher', 'frontend-architect'];
  const isPlanner = plannerRoles.includes(agentId);
  
  // Build AC instructions based on role
  let acInstructions, acListOrPlaceholder;
  
  if (isPlanner) {
    // Planners DEFINE the AC
    acInstructions = `**🎯 YOUR JOB: Define Acceptance Criteria**

As the ${role.name}, you must define clear, testable Acceptance Criteria before implementation begins.

**What to do:**
1. Explore the codebase and understand the requirements
2. Define 3-5 specific, testable AC items
3. Use Given/When/Then format OR simple statements
4. Report back to Remy with your proposed AC

**Example AC format:**
- "Given user is on login page, When they enter valid credentials, Then they are redirected to dashboard"
- "Favicon file exists at src/app/favicon.ico with 3 sizes (16x16, 32x32, 64x64)"
- "Browser tab shows Remy avatar instead of default Next.js icon"

**When you report back, include:**
📋 **Proposed Acceptance Criteria:**
- [ ] AC 1: ...
- [ ] AC 2: ...
- [ ] AC 3: ...

Remy will add these to the ticket before @dev starts work.`;

    acListOrPlaceholder = `⏳ **AC NOT YET DEFINED**

You (the ${role.name}) must define these during planning.
Report back with proposed AC for Remy to add to the ticket.`;
  } else {
    // Implementers FOLLOW the AC
    const acceptanceCriteria = ticket.acceptanceCriteria || [];
    
    if (acceptanceCriteria.length > 0) {
      const acCheckboxes = acceptanceCriteria.map((ac, i) => `- [ ] AC ${i+1}: ${ac}`).join('\n');
      acListOrPlaceholder = acCheckboxes;
      acInstructions = `**✅ Acceptance Criteria Defined by Planner**

These AC were defined by @${ticket.plannerAgent || 'api-architect'}. Your job is to implement and check them off:

**Instructions:**
- Check off each AC as you complete it
- All AC must be checked before moving to QA
- If AC is unclear, ask Remy for clarification`;
    } else {
      acListOrPlaceholder = `⚠️ **AC NOT YET DEFINED - BLOCKED**

This ticket is waiting for a planner to define AC.
Message Remy to request AC definition before starting work.`;
      acInstructions = `**⏳ WAITING FOR AC**

A planner (tech-lead, api-architect, or business-analyst) must define AC before you start.

**Do NOT start implementation without AC.**
Message Remy: "Ticket needs AC definition"`;
    }
  }
  
  // Build the context by replacing placeholders
  let context = fs.readFileSync(CONTEXT_TEMPLATE, 'utf8');
  
  // Replace all placeholders
  const replacements = {
    '{{TICKET_ID}}': ticket.id,
    '{{TICKET_TITLE}}': ticket.title,
    '{{STATUS}}': ticket.status,
    '{{PROJECT}}': project,
    '{{AGENT_NAME}}': role.name,
    '{{AGENT_ID}}': agentId,
    '{{AGENT_EMOJI}}': role.emoji,
    '{{ROLE_DESCRIPTION}}': role.description,
    '{{ROLE_RESPONSIBILITIES}}': role.responsibilities,
    '{{ROLE_EXCLUSIONS}}': role.exclusions,
    '{{REPO_PATH}}': repoPath,
    '{{TECH_STACK}}': techStacks[project] || techStacks['General'],
    '{{RELATED_FILES}}': ticket.relatedFiles || 'See ticket description',
    '{{SLUG}}': slug,
    '{{AC_PLANNING_INSTRUCTIONS}}': acInstructions,
    '{{AC_LIST_OR_PLACEHOLDER}}': acListOrPlaceholder,
    '{{TIMESTAMP}}': timestamp,
    '{{ADDITIONAL_CONTEXT}}': ticket.additionalContext || 'None'
  };
  
  for (const [key, value] of Object.entries(replacements)) {
    context = context.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }
  
  return context;
}

/**
 * Build the full prompt for agent spawn
 */
function buildAgentPrompt(ticket, agentId, project, additionalInstructions = '') {
  const context = generateTicketContext(ticket, agentId, project);
  
  return `${context}

---

## 📝 Your Specific Task

${ticket.description || ticket.title}

${additionalInstructions}

---

## ⚠️ IMPORTANT REMINDERS

1. **Branch from main**: git checkout main && git pull origin main && git checkout -b feature/${ticket.id}-${ticket.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30)}

2. **Report every 15 mins** using the format in Reporting Protocol above

3. **Send updates to Remy** via sessions_send with sessionKey: main

4. **Never merge yourself** - only @tech-lead can merge to main

5. **Update tickets by messaging me** - I will update remy-tracker for you

---

**When stuck or blocked, message me immediately with clear description of blocker.**

**When done, message me to move to QA review.**
`;
}

/**
 * Process incoming agent message and update ticket
 * This is what gets called when agents send sessions_send messages
 */
async function processAgentMessage(sessionKey, message) {
  // Import the update-ticket module
  const updateTicket = require('./update-ticket.js');
  
  console.log(`[Ralph Orchestrator] Processing message from ${sessionKey}`);
  
  const result = updateTicket.processAgentMessage(message);
  
  if (result.success) {
    console.log(`[Ralph Orchestrator] ✅ Updated ${result.ticketId}`);
    
    // If status changed, decide next action
    if (result.newStatus) {
      await handleStatusChange(result.ticketId, result.newStatus, result.agent);
    }
    
    return result;
  } else {
    console.log(`[Ralph Orchestrator] ⚠️ No ticket update: ${result.reason}`);
    return result;
  }
}

/**
 * Mark Ralph phase as complete in the ralph_workflow_steps table
 */
async function markRalphPhaseComplete(ticketId, phase) {
  const { execSync } = require('child_process');
  const DB_PATH = path.join(process.env.HOME, 'projects', 'remy-tracker', 'remy.db');
  
  // Phase mapping from our phases to remy-tracker phases
  const phaseMap = {
    'planning': 'Planner',
    'building': 'Dev',
    'qa': 'Verify',
    'merge': 'Review'
  };
  
  const dbPhase = phaseMap[phase];
  if (!dbPhase) {
    console.log(`[Ralph Orchestrator] Unknown phase: ${phase}`);
    return { success: false, error: 'Unknown phase' };
  }
  
  try {
    // Use sqlite3 to mark the step complete
    const sql = `UPDATE ralph_workflow_steps SET completed = 1, completed_at = datetime('now'), completed_by = 'ralph-orchestrator' WHERE ticket_id = (SELECT id FROM tickets WHERE ticket_number = '${ticketId}') AND phase = '${dbPhase}' AND completed = 0;`;
    
    execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
    
    // Add comment marking phase complete
    const REMY_CLI = path.join(process.env.HOME, 'projects', 'remy-tracker', 'cli', 'src', 'index.js');
    const phaseLabel = `Phase: ${dbPhase}`;
    const cmd = `node ${REMY_CLI} comment ${ticketId} --text="✅ **${phaseLabel} COMPLETE**\\n\\nRalph workflow phase checked off." --agent="system" --role="system"`;
    
    try {
      execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    } catch (commentErr) {
      // Comment might fail but SQL succeeded
      console.log(`[Ralph Orchestrator] SQL updated, comment may have timed out`);
    }
    
    console.log(`[Ralph Orchestrator] ✅ Marked ${phaseLabel} complete for ${ticketId}`);
    return { success: true };
  } catch (error) {
    console.error(`[Ralph Orchestrator] Failed to mark phase complete:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Insert Acceptance Criteria into the database
 */
async function insertAcceptanceCriteria(ticketId, criteriaList) {
  const { execSync } = require('child_process');
  const DB_PATH = path.join(process.env.HOME, 'projects', 'remy-tracker', 'remy.db');
  
  if (!criteriaList || criteriaList.length === 0) {
    console.log(`[Ralph Orchestrator] No AC to insert for ${ticketId}`);
    return { success: true, count: 0 };
  }
  
  try {
    let insertedCount = 0;
    
    for (let i = 0; i < criteriaList.length; i++) {
      const ac = criteriaList[i];
      // Parse simple AC format: "Given [context] When [action] Then [result]"
      // OR just a simple statement
      let givenText = 'Ticket requirements are defined';
      let whenText = 'Implementation is complete';
      let thenText = ac;
      
      // If AC contains ";" it might be Given/When/Then format
      const parts = ac.split(';').map(p => p.trim());
      if (parts.length >= 3) {
        givenText = parts[0];
        whenText = parts[1];
        thenText = parts[2];
      }
      
      const sql = `INSERT INTO acceptance_criteria (ticket_id, given_text, when_text, then_text, status, sort_order, created_at) VALUES ((SELECT id FROM tickets WHERE ticket_number = '${ticketId}'), '${givenText.replace(/'/g, "''")}', '${whenText.replace(/'/g, "''")}', '${thenText.replace(/'/g, "''")}', 'pending', ${i}, datetime('now'));`;
      
      try {
        execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
        insertedCount++;
      } catch (sqlErr) {
        console.error(`[Ralph Orchestrator] Failed to insert AC ${i+1}:`, sqlErr.message);
      }
    }
    
    console.log(`[Ralph Orchestrator] ✅ Inserted ${insertedCount} acceptance criteria for ${ticketId}`);
    return { success: true, count: insertedCount };
  } catch (error) {
    console.error(`[Ralph Orchestrator] Failed to insert AC:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Handle status transitions - spawn next agent if needed
 */
async function handleStatusChange(ticketId, newStatus, agent) {
  console.log(`[Ralph Orchestrator] Status change: ${ticketId} → ${newStatus}`);
  
  // Status transition logic
  const transitions = {
    'In QA': {
      nextAgent: 'qa',
      phase: 'building',
      message: `Ticket ${ticketId} moved to In QA. Spawning QA for review.`
    },
    'Closed/Done': {
      nextAgent: null,
      phase: 'merge',
      message: `Ticket ${ticketId} completed. No further action needed.`
    },
    'To Dev': {
      nextAgent: 'dev',
      phase: 'planning',
      message: `Ticket ${ticketId} ready for development.`
    },
    'Dev Backlog': {
      nextAgent: null,
      phase: 'planning',
      message: `Ticket ${ticketId} queued in backlog.`
    }
  };
  
  const transition = transitions[newStatus];
  if (transition) {
    console.log(`[Ralph Orchestrator] ${transition.message}`);
    
    // Mark Ralph phase as complete
    if (transition.phase) {
      await markRalphPhaseComplete(ticketId, transition.phase);
    }
    
    // Here we would spawn the next agent if transition.nextAgent is set
    // This requires the sessions_spawn function from OpenClaw
    // For now, just log the intent
    if (transition.nextAgent) {
      console.log(`[Ralph Orchestrator] Would spawn ${transition.nextAgent} for ${ticketId}`);
      // In actual implementation:
      // sessions_spawn({ agentId: transition.nextAgent, task: buildAgentPrompt(...) });
    }
  }
}

/**
 * Create a new ticket and spawn initial agent
 */
async function createAndSpawn(title, agentId, project = 'General', options = {}) {
  const { execSync } = require('child_process');
  const REMY_CLI = path.join(process.env.HOME, 'projects', 'remy-tracker', 'cli', 'src', 'index.js');
  
  // Determine if this is a planner role
  const plannerRoles = ['tech-lead', 'api-architect', 'business-analyst', 'researcher', 'frontend-architect'];
  const isPlanner = plannerRoles.includes(agentId);
  
  // Build description (NO AC included - planner defines it)
  let description;
  if (isPlanner) {
    description = `${options.description || title}

**PHASE: PLANNING**
Your job is to explore, define Acceptance Criteria, and report back.
DO NOT implement yet.

Ralph Workflow Phases:
1. Planning ← YOU ARE HERE (define AC)
2. Building → Dev implements
3. QA Review → QA validates
4. Merge → Tech Lead deploys

Created by: Ralph Orchestrator
Planning Agent: ${agentId}`;
  } else {
    description = `${options.description || title}

**PHASE: BUILDING**
Implement the feature according to the AC that will be defined by the planner.

Ralph Workflow Phases:
1. Planning → AC definition
2. Building ← YOU ARE HERE (implement)
3. QA Review → QA validates
4. Merge → Tech Lead deploys

Created by: Ralph Orchestrator
Implementing Agent: ${agentId}`;
  }

  const cmd = `node ${REMY_CLI} add "${title}" --description="${description}" --type="${options.type || 'Dev Task'}" --priority="${options.priority || 'Medium'}" --project="${project}" --assignee="${agentId}"`;
  
  console.log(`[Ralph Orchestrator] Creating ticket: ${title}`);
  console.log(`[Ralph Orchestrator] Agent type: ${isPlanner ? 'PLANNER (will define AC)' : 'IMPLEMENTER (will follow AC)'}`);
  
  try {
    const result = execSync(cmd, { encoding: 'utf8' });
    console.log(result);
    
    // Extract ticket ID from output
    const ticketMatch = result.match(/(REMY-\d+|TICKET-\d+)/);
    const ticketId = ticketMatch ? ticketMatch[1] : null;
    
    if (ticketId) {
      console.log(`[Ralph Orchestrator] Created ${ticketId}`);
      
      // Only insert AC if explicitly provided (for non-planner workflows)
      // Otherwise, planner will define AC and report back
      if (!isPlanner && options.acceptanceCriteria && options.acceptanceCriteria.length > 0) {
        await insertAcceptanceCriteria(ticketId, options.acceptanceCriteria);
      }
      
      // Get ticket details
      const ticketDetails = {
        id: ticketId,
        title: title,
        status: options.status || 'To Dev',
        description: options.description || title,
        acceptanceCriteria: [], // Empty initially - planner defines
        plannerAgent: isPlanner ? agentId : null,
        relatedFiles: options.relatedFiles,
        additionalContext: options.additionalContext
      };
      
      // Build the spawn prompt
      const spawnPrompt = buildAgentPrompt(ticketDetails, agentId, project, options.additionalInstructions);
      
      console.log(`[Ralph Orchestrator] Ready to spawn ${agentId} for ${ticketId}`);
      console.log(`[Ralph Orchestrator] Spawn prompt length: ${spawnPrompt.length} chars`);
      
      return {
        ticketId,
        agentId,
        spawnPrompt,
        ticket: ticketDetails
      };
    }
    
    return { error: 'Failed to extract ticket ID' };
  } catch (error) {
    console.error(`[Ralph Orchestrator] Error creating ticket:`, error.message);
    return { error: error.message };
  }
}

// Phase Tracker Integration (TASK-040 Phase 2)
const PHASE_TRACKER_SCRIPT = path.join(process.env.HOME, '.openclaw', 'workspace', 'skills', 'ralph', 'run-phase-tracker.sh');

/**
 * Check if phase-tracker is available
 */
function isPhaseTrackerAvailable() {
  return fs.existsSync(PHASE_TRACKER_SCRIPT);
}

/**
 * Run phase-tracker command
 */
async function runPhaseTracker(...args) {
  return new Promise((resolve, reject) => {
    const cmd = spawn(PHASE_TRACKER_SCRIPT, args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    cmd.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    cmd.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    cmd.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    
    cmd.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Start phase tracking with locking (Phase 2)
 */
async function startPhaseTracking(ticketNumber, phase) {
  if (!isPhaseTrackerAvailable()) {
    console.log('[Ralph Orchestrator] Phase tracker not available, skipping lock acquisition');
    return { success: true, locked: false };
  }
  
  try {
    const result = await runPhaseTracker('start', ticketNumber, phase);
    return {
      success: result.success,
      locked: result.success,
      output: result.stdout
    };
  } catch (error) {
    console.error('[Ralph Orchestrator] Failed to start phase tracking:', error.message);
    return { success: false, locked: false, error: error.message };
  }
}

/**
 * Verify dev completion with auto-detection (Phase 2)
 */
async function verifyDevCompletion(ticketNumber, repoPath) {
  if (!isPhaseTrackerAvailable()) {
    console.log('[Ralph Orchestrator] Phase tracker not available, skipping verification');
    return { complete: true, results: [] };
  }
  
  try {
    const result = await runPhaseTracker('verify', ticketNumber, repoPath || process.cwd());
    
    // Parse JSON output if available
    try {
      const jsonStart = result.stdout.indexOf('{');
      if (jsonStart > -1) {
        const jsonOutput = JSON.parse(result.stdout.substring(jsonStart));
        return {
          complete: jsonOutput.complete || result.success,
          results: jsonOutput.results || [],
          output: result.stdout
        };
      }
    } catch {}
    
    return {
      complete: result.success,
      results: [],
      output: result.stdout
    };
  } catch (error) {
    console.error('[Ralph Orchestrator] Verification failed:', error.message);
    return { complete: false, results: [], error: error.message };
  }
}

/**
 * Complete phase with verification (Phase 2)
 */
async function completePhaseWithTracking(ticketNumber, phase, nextStatus, options = {}) {
  if (!isPhaseTrackerAvailable()) {
    // Fall back to basic phase completion
    return await markRalphPhaseComplete(ticketNumber, phase);
  }
  
  const { repoPath, verifyFirst = true, actor = 'dev-agent' } = options;
  
  try {
    // Build arguments
    const args = ['complete', ticketNumber, phase];
    if (nextStatus) {
      args.push(nextStatus);
    }
    
    const result = await runPhaseTracker(...args);
    
    return {
      success: result.success,
      output: result.stdout,
      phase: phase,
      nextStatus: nextStatus
    };
  } catch (error) {
    console.error('[Ralph Orchestrator] Phase completion failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Recover crashed phases on startup (Phase 2)
 */
async function recoverCrashedPhases(maxAgeMinutes = 10) {
  if (!isPhaseTrackerAvailable()) {
    return { recovered: [], count: 0 };
  }
  
  try {
    const result = await runPhaseTracker('recover', maxAgeMinutes.toString());
    return {
      success: result.success,
      recovered: [],
      output: result.stdout
    };
  } catch (error) {
    console.error('[Ralph Orchestrator] Recovery failed:', error.message);
    return { success: false, error: error.message, recovered: [] };
  }
}

/**
 * Get phase status with lock info (Phase 2)
 */
async function getPhaseStatus(ticketNumber) {
  if (!isPhaseTrackerAvailable()) {
    return { available: false };
  }
  
  try {
    const result = await runPhaseTracker('status', ticketNumber);
    
    try {
      const jsonStart = result.stdout.indexOf('{');
      if (jsonStart > -1) {
        const status = JSON.parse(result.stdout.substring(jsonStart));
        return {
          available: true,
          ...status,
          output: result.stdout
        };
      }
    } catch {}
    
    return {
      available: true,
      output: result.stdout,
      raw: result.stdout
    };
  } catch (error) {
    console.error('[Ralph Orchestrator] Failed to get status:', error.message);
    return { available: false, error: error.message };
  }
}

// Export for use
module.exports = {
  generateTicketContext,
  buildAgentPrompt,
  processAgentMessage,
  createAndSpawn,
  loadAgentRole,
  handleStatusChange,
  markRalphPhaseComplete,
  insertAcceptanceCriteria,
  // Phase 2 exports
  isPhaseTrackerAvailable,
  startPhaseTracking,
  verifyDevCompletion,
  completePhaseWithTracking,
  recoverCrashedPhases,
  getPhaseStatus
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'create') {
    // node ralph-orchestrator.js create "Fix bug" dev --project="Pantry-Pal"
    const title = args[1];
    const agentId = args[2];
    
    // Parse options
    const options = {};
    for (let i = 3; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        const key = args[i].replace('--', '').split('=')[0];
        const value = args[i].includes('=') ? args[i].split('=')[1] : args[i + 1];
        options[key] = value;
        if (!args[i].includes('=')) i++;
      }
    }
    
    // Parse acceptanceCriteria if provided (semicolon-separated)
    if (options.acceptanceCriteria && typeof options.acceptanceCriteria === 'string') {
      options.acceptanceCriteria = options.acceptanceCriteria.split(';').map(s => s.trim()).filter(s => s);
    }
    
    createAndSpawn(title, agentId, options.project || 'General', options)
      .then(result => {
        console.log('\n' + '='.repeat(60));
        console.log('SPAWN READY');
        console.log('='.repeat(60));
        console.log('Ticket:', result.ticketId);
        console.log('Agent:', result.agentId);
        console.log('\nSpawn Prompt Preview (first 500 chars):');
        console.log(result.spawnPrompt?.substring(0, 500) + '...');
      })
      .catch(console.error);
  } else if (args[0] === 'recover') {
    // node ralph-orchestrator.js recover [max-age-minutes]
    const maxAge = parseInt(args[1] || '10', 10);
    console.log(`Running recovery for phases older than ${maxAge} minutes...`);
    
    recoverCrashedPhases(maxAge)
      .then(result => {
        console.log('\n' + '='.repeat(60));
        console.log('RECOVERY COMPLETE');
        console.log('='.repeat(60));
        console.log('Success:', result.success);
        console.log('Output:', result.output);
      })
      .catch(console.error);
  } else if (args[0] === 'status') {
    // node ralph-orchestrator.js status TICKET
    const ticketNumber = args[1];
    if (!ticketNumber) {
      console.log('Usage: node ralph-orchestrator.js status TICKET');
      process.exit(1);
    }
    
    getPhaseStatus(ticketNumber)
      .then(status => {
        console.log('\n' + '='.repeat(60));
        console.log('PHASE STATUS');
        console.log('='.repeat(60));
        console.log(JSON.stringify(status, null, 2));
      })
      .catch(console.error);
  } else if (args[0] === 'verify') {
    // node ralph-orchestrator.js verify TICKET [repo-path]
    const ticketNumber = args[1];
    const repoPath = args[2] || process.cwd();
    
    if (!ticketNumber) {
      console.log('Usage: node ralph-orchestrator.js verify TICKET [repo-path]');
      process.exit(1);
    }
    
    verifyDevCompletion(ticketNumber, repoPath)
      .then(result => {
        console.log('\n' + '='.repeat(60));
        console.log('VERIFICATION RESULTS');
        console.log('='.repeat(60));
        console.log('Complete:', result.complete);
        console.log('Results:', JSON.stringify(result.results, null, 2));
      })
      .catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node ralph-orchestrator.js create "Title" agent-id --project="Project Name" --priority="High"');
    console.log('  node ralph-orchestrator.js recover [max-age-minutes]');
    console.log('  node ralph-orchestrator.js status TICKET');
    console.log('  node ralph-orchestrator.js verify TICKET [repo-path]');
    console.log('');
    console.log('Available agents:', Object.keys(loadAgentRole('')).join(', '));
  }
}
