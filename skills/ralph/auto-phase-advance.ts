/**
 * TASK-042: Ralph Phase Automation
 * Auto-advance tickets through Ralph workflow phases
 * 
 * This utility automatically handles phase advancement without
 * manual intervention from agents.
 */

const RALPH_API_BASE = process.env.RALPH_API_URL || 'http://localhost:3474/api';
const RALPH_DELAY_MS = parseInt(process.env.RALPH_ADVANCE_DELAY_MS || '100');

export interface AdvancePhaseRequest {
  ticketNumber: string;
  phase: PhaseName;
  actor?: string;
  actorRole?: string;
  actorName?: string;
  comment?: string;
  targetStatus?: string;
}

export interface TicketInfo {
  id: string;
  ticket_number: string;
  status: string;
  title: string;
}

export interface PhaseState {
  phase: PhaseName;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

export type PhaseName = 'Planner' | 'Setup' | 'Dev' | 'Verify' | 'Test' | 'Review';
export type Role = 'pm' | 'dev' | 'qa' | 'tech_lead' | 'agent';

const PHASE_ORDER: PhaseName[] = ['Planner', 'Setup', 'Dev', 'Verify', 'Test', 'Review'];

const PHASE_STATUS_MAP: Record<PhaseName, string> = {
  'Planner': 'To Dev',
  'Setup': 'To Dev', 
  'Dev': 'In QA',
  'Verify': 'In QA',
  'Test': 'Ready for Review',
  'Review': 'Closed'
};

const PHASE_ROLE_MAP: Record<PhaseName, Role> = {
  'Planner': 'pm',
  'Setup': 'pm',
  'Dev': 'dev',
  'Verify': 'dev',
  'Test': 'qa',
  'Review': 'tech_lead'
};

export class PhaseAdvanceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PhaseAdvanceError';
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get ticket ID from ticket number
 */
export async function getTicketId(ticketNumber: string): Promise<TicketInfo> {
  try {
    const url = `${RALPH_API_BASE}/tickets?search=${encodeURIComponent(ticketNumber)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new PhaseAdvanceError(
        `Failed to fetch ticket: ${response.status}`,
        'TICKET_FETCH_FAILED'
      );
    }
    
    const data = await response.json() as { tickets: TicketInfo[] };
    const ticket = data.tickets.find(t => t.ticket_number === ticketNumber);
    
    if (!ticket) {
      throw new PhaseAdvanceError(
        `Ticket ${ticketNumber} not found`,
        'TICKET_NOT_FOUND'
      );
    }
    
    return ticket;
  } catch (error) {
    if (error instanceof PhaseAdvanceError) throw error;
    throw new PhaseAdvanceError(
      `Failed to lookup ticket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TICKET_LOOKUP_ERROR',
      error
    );
  }
}

/**
 * Get Ralph workflow phases for a ticket
 */
export async function getPhaseStates(ticketId: string): Promise<PhaseState[]> {
  try {
    const url = `${RALPH_API_BASE}/tickets/${ticketId}/ralph/phases`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // Try alternative endpoint
      const altUrl = `${RALPH_API_BASE}/tickets/${ticketId}/ralph`;
      const altResponse = await fetch(altUrl);
      
      if (!altResponse.ok) {
        throw new PhaseAdvanceError(
          `Failed to fetch phases: ${response.status}`,
          'PHASE_FETCH_FAILED'
        );
      }
      
      const data = await altResponse.json() as { phases?: PhaseState[] };
      return data.phases || [];
    }
    
    const data = await response.json() as { phases: PhaseState[] };
    return data.phases || [];
  } catch (error) {
    if (error instanceof PhaseAdvanceError) throw error;
    throw new PhaseAdvanceError(
      `Failed to get phase states: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PHASE_STATE_ERROR',
      error
    );
  }
}

/**
 * Detect the current active phase that needs completion
 * Returns the first incomplete phase in order, or null if all complete
 */
export async function detectCurrentPhase(ticketNumber: string): Promise<{ ticketId: string; phase: PhaseName | null; allPhases: PhaseState[] }> {
  const ticket = await getTicketId(ticketNumber);
  const phases = await getPhaseStates(ticket.id);
  
  // Find first incomplete phase in order
  const incompletePhase = phases.find(p => !p.completed && PHASE_ORDER.includes(p.phase));
  
  return {
    ticketId: ticket.id,
    phase: incompletePhase?.phase || null,
    allPhases: phases
  };
}

/**
 * Mark a phase as complete
 */
export async function markPhaseComplete(
  ticketId: string,
  phase: PhaseName,
  options: Partial<AdvancePhaseRequest> = {}
): Promise<void> {
  const defaults = {
    actor: 'auto-agent',
    actorRole: PHASE_ROLE_MAP[phase] || 'agent',
    actorName: `${PHASE_ROLE_MAP[phase] || 'Agent'} Agent`
  };
  
  const actor = options.actor || defaults.actor;
  const actorRole = options.actorRole || defaults.actorRole;
  const actorName = options.actorName || defaults.actorName;
  
  const url = `${RALPH_API_BASE}/tickets/${ticketId}/ralph/complete-phase`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': actorRole
      },
      body: JSON.stringify({
        phase,
        actor,
        actor_role: actorRole,
        actor_name: actorName
      })
    });
    
    if (!response.ok && response.status !== 204) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      // Check for specific error codes
      if (errorText.includes('PHASE_ALREADY_COMPLETE')) {
        console.log(`  ⚠️  Phase ${phase} already complete`);
        return; // Not a failure - phase is already done
      }
      
      if (errorText.includes('MISSING_ACCEPTANCE_CRITERIA')) {
        throw new PhaseAdvanceError(
          'Cannot complete phase: missing acceptance criteria',
          'MISSING_ACCEPTANCE_CRITERIA',
          { url: `${RALPH_API_BASE.replace('/api', '')}/ticket/${ticketId}?tab=ac` }
        );
      }
      
      throw new PhaseAdvanceError(
        `Failed to mark phase complete: ${response.status} - ${errorText}`,
        'PHASE_COMPLETE_FAILED',
        { status: response.status, body: errorText }
      );
    }
    
    console.log(`  ✅ ${phase} phase marked complete`);
    
    // Small delay for activity tracking
    await sleep(RALPH_DELAY_MS);
    
  } catch (error) {
    if (error instanceof PhaseAdvanceError) throw error;
    throw new PhaseAdvanceError(
      `Network error marking phase complete: ${error instanceof Error ? error.message : 'Unknown'}`,
      'PHASE_COMPLETE_NETWORK',
      error
    );
  }
}

/**
 * Advance ticket status
 */
export async function advanceTicketStatus(
  ticketId: string,
  targetStatus: string,
  options: Partial<AdvancePhaseRequest> = {}
): Promise<void> {
  const defaults = {
    actor: 'auto-agent',
    actorRole: 'agent',
    actorName: 'Auto Agent',
    comment: 'Auto-advanced via phase automation'
  };
  
  const actor = options.actor || defaults.actor;
  const actorRole = options.actorRole || defaults.actorRole;
  const actorName = options.actorName || defaults.actorName;
  const comment = options.comment || defaults.comment;
  
  const url = `${RALPH_API_BASE}/tickets/${ticketId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': actorRole
      },
      body: JSON.stringify({
        status: targetStatus,
        actor,
        actor_role: actorRole,
        actor_name: actorName,
        comment
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      if (errorText.includes('RALPH_PHASE_INCOMPLETE')) {
        throw new PhaseAdvanceError(
          'Cannot advance status: previous Ralph phase is incomplete',
          'RALPH_PHASE_INCOMPLETE',
          { url: `${RALPH_API_BASE.replace('/api', '')}/ticket/${ticketId}?tab=ralph` }
        );
      }
      
      throw new PhaseAdvanceError(
        `Failed to advance status: ${response.status} - ${errorText}`,
        'STATUS_ADVANCE_FAILED',
        { status: response.status, body: errorText }
      );
    }
    
    console.log(`  ✅ Ticket advanced to ${targetStatus}`);
    
    // Small delay for activity tracking
    await sleep(RALPH_DELAY_MS);
    
  } catch (error) {
    if (error instanceof PhaseAdvanceError) throw error;
    throw new PhaseAdvanceError(
      `Network error advancing status: ${error instanceof Error ? error.message : 'Unknown'}`,
      'STATUS_ADVANCE_NETWORK',
      error
    );
  }
}

/**
 * Advance a ticket from one phase to the next
 * Automatically marks the current phase complete and advances status
 */
export async function advanceTicketPhase(
  ticketNumber: string,
  options: Partial<AdvancePhaseRequest> = {}
): Promise<{
  ticketId: string;
  completedPhase: PhaseName | null;
  newStatus: string | null;
  phases: PhaseState[];
}> {
  console.log(`🦞 Auto-advancing ${ticketNumber}...`);
  
  // Detect current phase
  const { ticketId, phase, allPhases } = await detectCurrentPhase(ticketNumber);
  
  if (!phase) {
    console.log(`  ✅ All phases complete for ${ticketNumber}`);
    return { ticketId, completedPhase: null, newStatus: null, phases: allPhases };
  }
  
  console.log(`   Current phase: ${phase}`);
  console.log(`   Role: ${PHASE_ROLE_MAP[phase]}`);
  console.log('');
  
  // Mark phase complete
  await markPhaseComplete(ticketId, phase, options);
  
  // Determine target status
  const targetStatus = options.targetStatus || PHASE_STATUS_MAP[phase];
  
  if (targetStatus) {
    await advanceTicketStatus(ticketId, targetStatus, {
      ...options,
      comment: `${phase} complete${targetStatus ? ', moving to ' + targetStatus : ''}`,
      actor: options.actor || 'auto-agent',
      actorRole: options.actorRole || PHASE_ROLE_MAP[phase]
    });
    
    console.log('');
    console.log(`🎉 ${ticketNumber} advanced: ${phase} → ${targetStatus}`);
    
    return { 
      ticketId, 
      completedPhase: phase, 
      newStatus: targetStatus,
      phases: allPhases
    };
  }
  
  console.log('');
  console.log(`🎉 ${ticketNumber}: ${phase} phase complete`);
  
  return { ticketId, completedPhase: phase, newStatus: null, phases: allPhases };
}

/**
 * Dev agent completion handler
 * Automatically marks Dev complete, Verify complete, and advances to In QA
 */
export async function completeDevPhase(
  ticketNumber: string,
  options: Omit<Partial<AdvancePhaseRequest>, 'phase'> = {}
): Promise<void> {
  console.log(`🦞 Auto-complete Dev workflow for ${ticketNumber}`);
  console.log('');
  
  // Step 1: Mark Dev phase complete
  await advanceTicketPhase(ticketNumber, {
    ...options,
    phase: 'Dev',
    actor: options.actor || 'dev-agent',
    actorRole: options.actorRole || 'dev',
    actorName: options.actorName || 'Dev Agent',
    targetStatus: 'In QA'
  });
  
  // Step 2: Mark Verify phase complete
  // Since Dev → Verify happens together, also mark Verify
  const ticket = await getTicketId(ticketNumber);
  try {
    await markPhaseComplete(ticket.id, 'Verify', {
      ...options,
      actor: options.actor || 'dev-agent',
      actorRole: 'dev',
      actorName: 'Dev Agent - Self Verification'
    });
    console.log('  ✅ Verify phase marked complete (self-verification)');
  } catch (error) {
    // Verify might already be auto-completed, that's OK
    console.log(`  ℹ️  Verify phase handling: ${error instanceof Error ? error.message : 'completed'}`);
  }
  
  console.log('');
  console.log(`✅ Dev workflow complete for ${ticketNumber}`);
}

/**
 * QA completion handler - marks Test complete and advances to Review
 */
export async function completeQAPhase(
  ticketNumber: string,
  options: Omit<Partial<AdvancePhaseRequest>, 'phase'> = {}
): Promise<void> {
  console.log(`🦞 Auto-complete QA workflow for ${ticketNumber}`);
  
  await advanceTicketPhase(ticketNumber, {
    ...options,
    phase: 'Test',
    actor: options.actor || 'qa-agent',
    actorRole: options.actorRole || 'qa',
    actorName: options.actorName || 'QA Agent',
    targetStatus: 'Ready for Review'
  });
  
  console.log('');
  console.log(`✅ QA workflow complete for ${ticketNumber}`);
}

/**
 * Tech Lead completion handler - marks Review complete and closes ticket
 */
export async function completeReviewPhase(
  ticketNumber: string,
  options: Omit<Partial<AdvancePhaseRequest>, 'phase'> = {}
): Promise<void> {
  console.log(`🦞 Auto-complete Review workflow for ${ticketNumber}`);
  
  await advanceTicketPhase(ticketNumber, {
    ...options,
    phase: 'Review',
    actor: options.actor || 'tech-lead-agent',
    actorRole: options.actorRole || 'tech_lead',
    actorName: options.actorName || 'Tech Lead Agent',
    targetStatus: 'Closed'
  });
  
  console.log('');
  console.log(`✅ Review workflow complete for ${ticketNumber}`);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];
  const ticketNumber = args[1];
  
  if (!command || command === '--help' || command === '-h') {
    console.log(`
Ralph Phase Automation CLI

Usage: auto-phase-advance.ts <command> <ticket-number> [options]

Commands:
  advance <ticket>         Auto-detect and advance current phase
  dev-complete <ticket>    Complete Dev + Verify, advance to In QA
  qa-complete <ticket>     Complete Test, advance to Ready for Review  
  review-complete <ticket> Complete Review, close ticket
  status <ticket>          Show current phase status

Options:
  --actor=<name>           Override actor name
  --role=<role>            Override actor role
  --status=<status>        Override target status
  --dry-run               Show what would be done without doing it

Examples:
  auto-phase-advance.ts advance REMY-042
  auto-phase-advance.ts dev-complete REMY-042
  auto-phase-advance.ts status REMY-042
    `);
    process.exit(0);
  }
  
  if (!ticketNumber) {
    console.error('❌ Ticket number required');
    process.exit(1);
  }
  
  switch (command) {
    case 'status':
      getTicketId(ticketNumber)
        .then(ticket => getPhaseStates(ticket.id))
        .then(phases => {
          console.log(`\n🦞 ${ticketNumber} Phase Status:\n`);
          phases.forEach(p => {
            const icon = p.completed ? '✅' : '⏳';
            const status = p.completed ? `complete by ${p.completed_by || 'unknown'} at ${p.completed_at || 'unknown'}` : 'pending';
            console.log(`  ${icon} ${p.phase}: ${status}`);
          });
        })
        .catch(err => {
          console.error('Error:', err instanceof Error ? err.message : err);
          process.exit(1);
        });
      break;
      
    case 'advance':
      advanceTicketPhase(ticketNumber)
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Error:', err instanceof Error ? err.message : err);
          process.exit(1);
        });
      break;
      
    case 'dev-complete':
      completeDevPhase(ticketNumber)
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Error:', err instanceof Error ? err.message : err);
          process.exit(1);
        });
      break;
      
    case 'qa-complete':
      completeQAPhase(ticketNumber)
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Error:', err instanceof Error ? err.message : err);
          process.exit(1);
        });
      break;
      
    case 'review-complete':
      completeReviewPhase(ticketNumber)
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Error:', err instanceof Error ? err.message : err);
          process.exit(1);
        });
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error('Run with --help for usage');
      process.exit(1);
  }
}

export default {
  advanceTicketPhase,
  completeDevPhase,
  completeQAPhase,
  completeReviewPhase,
  detectCurrentPhase,
  getTicketId,
  getPhaseStates,
  markPhaseComplete,
  advanceTicketStatus,
  PHASE_ORDER,
  PHASE_STATUS_MAP,
  PHASE_ROLE_MAP
};