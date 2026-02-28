/**
 * Phase Tracker - TASK-040 Phase 2 Implementation
 * 
 * Improvements over Phase 1:
 * 1. Auto-detection of dev work completion (tests, builds)
 * 2. Phase state recovery (persistent storage)
 * 3. Parallel phase safety (locking mechanism)
 * 4. API-first integration with Remy-Tracker
 * 
 * Features:
 * - Smart completion detection (not just git commits)
 * - Automatic verification (test runs, build checks)
 * - Recovery from agent crashes
 * - Distributed locking for parallel agent coordination
 * - Webhook-style auto-triggers
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Configuration
const CONFIG = {
  API_BASE: process.env.REMY_API || 'http://localhost:3474/api',
  STATE_FILE: process.env.PHASE_STATE_FILE || path.join(process.env.HOME || '', '.openclaw', 'workspace', '.phase-state.json'),
  LOCK_DIR: process.env.PHASE_LOCK_DIR || path.join(process.env.HOME || '', '.openclaw', 'workspace', '.phase-locks'),
  RECOVERY_INTERVAL_MS: 30000, // Check for stale locks every 30s
  LOCK_TIMEOUT_MS: 300000, // Lock expires after 5 minutes
  AGENT_ID: process.env.AGENT_ID || crypto.randomUUID(),
  VERBOSE: process.env.PHASE_TRACKER_VERBOSE === 'true'
};

// Types
interface TicketState {
  ticketId: string;
  ticketNumber: string;
  currentPhase: string;
  phaseStatus: 'in_progress' | 'completing' | 'complete' | 'failed';
  startedAt: string;
  lastActivity: string;
  agentId: string;
  verificationResults: VerificationResult[];
  lockToken?: string;
}

interface VerificationResult {
  type: 'test' | 'build' | 'lint' | 'security' | 'custom';
  status: 'pending' | 'running' | 'pass' | 'fail';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

interface PhaseLock {
  ticketId: string;
  phase: string;
  agentId: string;
  acquiredAt: string;
  expiresAt: string;
  token: string;
}

interface TicketPhaseInfo {
  id: number;
  ticket_number: string;
  title: string;
  status: string;
  current_phase?: string;
  ralph_phases: Array<{
    phase: string;
    completed: boolean;
    completed_at?: string;
    completed_by?: string;
  }>;
}

interface AutoTriggerConfig {
  onTestPass: boolean;
  onBuildSuccess: boolean;
  onAllACPass: boolean;
  autoQueueForReview: boolean;
  minimumCoverage?: number;
}

// Logger
class Logger {
  private verbose: boolean;
  
  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }
  
  log(message: string): void {
    console.log(`[PhaseTracker] ${message}`);
  }
  
  debug(message: string): void {
    if (this.verbose) {
      console.log(`[PhaseTracker:DEBUG] ${message}`);
    }
  }
  
  error(message: string, err?: Error): void {
    console.error(`[PhaseTracker:ERROR] ${message}`, err ? `: ${err.message}` : '');
  }
  
  success(message: string): void {
    console.log(`[PhaseTracker] ✅ ${message}`);
  }
  
  warn(message: string): void {
    console.log(`[PhaseTracker] ⚠️  ${message}`);
  }
}

const logger = new Logger(CONFIG.VERBOSE);

// Ensure directories exist
function ensureDirectories(): void {
  const dirs = [path.dirname(CONFIG.STATE_FILE), CONFIG.LOCK_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * State Manager - Persistent phase state storage
 * Handles crash recovery by storing phase progress
 */
class StateManager {
  private stateFile: string;
  
  constructor(stateFile: string = CONFIG.STATE_FILE) {
    this.stateFile = stateFile;
    ensureDirectories();
  }
  
  /**
   * Load state from disk
   */
  loadState(): Map<string, TicketState> {
    try {
      if (!fs.existsSync(this.stateFile)) {
        logger.debug('No state file found, starting fresh');
        return new Map();
      }
      
      const data = fs.readFileSync(this.stateFile, 'utf-8');
      const parsed = JSON.parse(data);
      const stateMap = new Map<string, TicketState>(Object.entries(parsed.tickets || {}));
      
      logger.debug(`Loaded state for ${stateMap.size} tickets`);
      return stateMap;
    } catch (error) {
      logger.error('Failed to load state', error as Error);
      return new Map();
    }
  }
  
  /**
   * Save state to disk
   */
  saveState(state: Map<string, TicketState>): void {
    try {
      const stateObj: Record<string, TicketState> = {};
      state.forEach((value, key) => {
        stateObj[key] = value;
      });
      
      const data = JSON.stringify({
        version: '2.0',
        updatedAt: new Date().toISOString(),
        agentId: CONFIG.AGENT_ID,
        tickets: stateObj
      }, null, 2);
      
      // Write atomically
      const tempFile = `${this.stateFile}.tmp`;
      fs.writeFileSync(tempFile, data, 'utf-8');
      fs.renameSync(tempFile, this.stateFile);
      
      logger.debug('State saved successfully');
    } catch (error) {
      logger.error('Failed to save state', error as Error);
    }
  }
  
  /**
   * Update ticket state
   */
  updateTicketState(ticketNumber: string, updates: Partial<TicketState>): void {
    const state = this.loadState();
    const existing = state.get(ticketNumber) || {
      ticketId: '',
      ticketNumber,
      currentPhase: '',
      phaseStatus: 'in_progress',
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      agentId: CONFIG.AGENT_ID,
      verificationResults: []
    };
    
    const updated = {
      ...existing,
      ...updates,
      lastActivity: new Date().toISOString()
    };
    
    state.set(ticketNumber, updated);
    this.saveState(state);
  }
  
  /**
   * Get ticket state
   */
  getTicketState(ticketNumber: string): TicketState | null {
    const state = this.loadState();
    return state.get(ticketNumber) || null;
  }
  
  /**
   * Remove ticket state
   */
  removeTicketState(ticketNumber: string): void {
    const state = this.loadState();
    state.delete(ticketNumber);
    this.saveState(state);
  }
  
  /**
   * Recover crashed phases
   * Returns tickets that were in progress but stale
   */
  recoverCrashedPhases(maxAgeMinutes: number = 10): Array<{ ticketNumber: string; phase: string }> {
    const state = this.loadState();
    const recovered: Array<{ ticketNumber: string; phase: string }> = [];
    const now = new Date();
    
    state.forEach((ticketState, ticketNumber) => {
      if (ticketState.phaseStatus === 'completing') {
        const lastActivity = new Date(ticketState.lastActivity);
        const ageMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
        
        if (ageMinutes > maxAgeMinutes) {
          logger.warn(`Detected crashed phase for ${ticketNumber}: ${ticketState.currentPhase} (${ageMinutes.toFixed(1)}m old)`);
          recovered.push({ ticketNumber, phase: ticketState.currentPhase });
          
          // Mark as failed in state
          this.updateTicketState(ticketNumber, {
            phaseStatus: 'failed'
          });
        }
      }
    });
    
    return recovered;
  }
}

/**
 * Lock Manager - Distributed locking for parallel agent safety
 * Prevents two agents from claiming the same phase
 */
class LockManager {
  private lockDir: string;
  private timeoutMs: number;
  
  constructor(lockDir: string = CONFIG.LOCK_DIR, timeoutMs: number = CONFIG.LOCK_TIMEOUT_MS) {
    this.lockDir = lockDir;
    this.timeoutMs = timeoutMs;
    ensureDirectories();
  }
  
  /**
   * Generate lock file path
   */
  private getLockPath(ticketId: string, phase: string): string {
    const hash = crypto.createHash('sha256').update(`${ticketId}:${phase}`).digest('hex').substring(0, 16);
    return path.join(this.lockDir, `${hash}.lock`);
  }
  
  /**
   * Acquire lock for a phase
   */
  acquireLock(ticketId: string, phase: string): PhaseLock | null {
    const lockPath = this.getLockPath(ticketId, phase);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.timeoutMs);
    const token = crypto.randomUUID();
    
    // Check if lock exists and is valid
    if (fs.existsSync(lockPath)) {
      try {
        const existingLock: PhaseLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        const lockExpiry = new Date(existingLock.expiresAt);
        
        if (lockExpiry > now) {
          // Lock is still valid
          logger.warn(`Phase ${phase} already locked by ${existingLock.agentId} until ${existingLock.expiresAt}`);
          return null;
        } else {
          // Lock expired - remove it
          logger.debug(`Removing expired lock for ${ticketId}/${phase}`);
          fs.unlinkSync(lockPath);
        }
      } catch (error) {
        logger.error('Error reading existing lock', error as Error);
        // Remove corrupted lock
        try {
          fs.unlinkSync(lockPath);
        } catch {}
      }
    }
    
    // Create new lock
    const lock: PhaseLock = {
      ticketId,
      phase,
      agentId: CONFIG.AGENT_ID,
      acquiredAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      token
    };
    
    try {
      // Write lock atomically
      const tempFile = `${lockPath}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(lock, null, 2), 'utf-8');
      fs.renameSync(tempFile, lockPath);
      
      logger.debug(`Acquired lock for ${ticketId}/${phase} (expires: ${expiresAt.toISOString()})`);
      return lock;
    } catch (error) {
      logger.error('Failed to acquire lock', error as Error);
      return null;
    }
  }
  
  /**
   * Release lock
   */
  releaseLock(ticketId: string, phase: string, token: string): boolean {
    const lockPath = this.getLockPath(ticketId, phase);
    
    try {
      if (fs.existsSync(lockPath)) {
        const lock: PhaseLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        
        // Only release if we own the lock
        if (lock.token === token) {
          fs.unlinkSync(lockPath);
          logger.debug(`Released lock for ${ticketId}/${phase}`);
          return true;
        } else {
          logger.warn(`Lock token mismatch for ${ticketId}/${phase} - not releasing`);
          return false;
        }
      }
      return true; // Lock doesn't exist
    } catch (error) {
      logger.error('Failed to release lock', error as Error);
      return false;
    }
  }
  
  /**
   * Extend lock
   */
  extendLock(ticketId: string, phase: string, token: string, additionalMs: number = 120000): boolean {
    const lockPath = this.getLockPath(ticketId, phase);
    
    try {
      if (fs.existsSync(lockPath)) {
        const lock: PhaseLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        
        if (lock.token === token) {
          const newExpiry = new Date(Date.now() + additionalMs);
          lock.expiresAt = newExpiry.toISOString();
          
          fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
          logger.debug(`Extended lock for ${ticketId}/${phase} until ${newExpiry.toISOString()}`);
          return true;
        }
      }
      return false;
    } catch (error) {
      logger.error('Failed to extend lock', error as Error);
      return false;
    }
  }
  
  /**
   * Check if phase is locked
   */
  isLocked(ticketId: string, phase: string): boolean {
    const lockPath = this.getLockPath(ticketId, phase);
    
    if (!fs.existsSync(lockPath)) {
      return false;
    }
    
    try {
      const lock: PhaseLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
      const expiresAt = new Date(lock.expiresAt);
      return expiresAt > new Date();
    } catch {
      return false;
    }
  }
  
  /**
   * Get lock owner
   */
  getLockOwner(ticketId: string, phase: string): string | null {
    const lockPath = this.getLockPath(ticketId, phase);
    
    try {
      if (fs.existsSync(lockPath)) {
        const lock: PhaseLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        return lock.agentId;
      }
    } catch {}
    
    return null;
  }
  
  /**
   * Clean up stale locks
   */
  cleanupStaleLocks(): number {
    let cleaned = 0;
    const now = new Date();
    
    try {
      const files = fs.readdirSync(this.lockDir);
      for (const file of files) {
        if (!file.endsWith('.lock')) continue;
        
        const lockPath = path.join(this.lockDir, file);
        try {
          const lock: PhaseLock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
          const expiresAt = new Date(lock.expiresAt);
          
          if (expiresAt < now) {
            fs.unlinkSync(lockPath);
            cleaned++;
          }
        } catch {
          // Remove corrupted lock
          try {
            fs.unlinkSync(lockPath);
            cleaned++;
          } catch {}
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup locks', error as Error);
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} stale locks`);
    }
    
    return cleaned;
  }
}

/**
 * API Client - Integration with Remy-Tracker API
 */
class RemyAPIClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = CONFIG.API_BASE) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Make API request using curl
   */
  private async request(method: string, endpoint: string, body?: unknown): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return new Promise((resolve, reject) => {
      const args = ['-s', '-w', '\n%{http_code}', '-X', method, url];
      
      if (body) {
        args.push('-H', 'Content-Type: application/json');
        args.push('-d', JSON.stringify(body));
      }
      
      const curl = spawn('curl', args);
      let stdout = '';
      let stderr = '';
      
      curl.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      curl.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      curl.on('close', (code) => {
        const lines = stdout.trim().split('\n');
        const statusCode = parseInt(lines[lines.length - 1], 10);
        const response = lines.slice(0, -1).join('\n');
        
        if (statusCode >= 200 && statusCode < 300) {
          try {
            resolve(JSON.parse(response));
          } catch {
            resolve({ raw: response, statusCode });
          }
        } else {
          reject(new Error(`HTTP ${statusCode}: ${response || stderr}`));
        }
      });
      
      curl.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Get ticket by number
   */
  async getTicket(ticketNumber: string): Promise<TicketPhaseInfo | null> {
    try {
      // Search for ticket
      const searchResult = await this.request('GET', `/tickets?search=${encodeURIComponent(ticketNumber)}&include=ralph_phases`);
      
      if (searchResult.tickets) {
        const ticket = searchResult.tickets.find((t: any) => t.ticket_number === ticketNumber);
        return ticket || null;
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get ticket ${ticketNumber}`, error as Error);
      return null;
    }
  }
  
  /**
   * Get ticket by ID
   */
  async getTicketById(ticketId: number): Promise<TicketPhaseInfo | null> {
    try {
      const ticket = await this.request('GET', `/tickets/${ticketId}?include=ralph_phases`);
      return ticket;
    } catch (error) {
      logger.error(`Failed to get ticket ${ticketId}`, error as Error);
      return null;
    }
  }
  
  /**
   * Mark phase complete
   */
  async completePhase(
    ticketId: number,
    phase: string,
    actor: string,
    actorRole: string,
    actorName: string
  ): Promise<boolean> {
    try {
      const result = await this.request('POST', `/tickets/${ticketId}/ralph/complete-phase`, {
        phase,
        actor,
        actor_role: actorRole,
        actor_name: actorName
      });
      
      logger.success(`Phase ${phase} marked complete for ticket ${ticketId}`);
      return true;
    } catch (error) {
      const errMsg = (error as Error).message;
      
      // Check for specific error codes
      if (errMsg.includes('RALPH_PHASE_INCOMPLETE')) {
        logger.error(`Phase ${phase} cannot be completed - previous phase incomplete`);
      } else if (errMsg.includes('MISSING_ACCEPTANCE_CRITERIA')) {
        logger.error(`Phase ${phase} cannot be completed - missing acceptance criteria`);
      } else {
        logger.error(`Failed to complete phase ${phase}`, error as Error);
      }
      
      return false;
    }
  }
  
  /**
   * Update ticket status
   */
  async updateStatus(
    ticketId: number,
    status: string,
    actor: string,
    actorRole: string,
    actorName: string,
    comment?: string
  ): Promise<boolean> {
    try {
      const result = await this.request('PATCH', `/tickets/${ticketId}`, {
        status,
        actor,
        actor_role: actorRole,
        actor_name: actorName,
        comment: comment || `Status changed to ${status}`
      });
      
      logger.success(`Status updated to ${status} for ticket ${ticketId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update status for ticket ${ticketId}`, error as Error);
      return false;
    }
  }
  
  /**
   * Add comment to ticket
   */
  async addComment(
    ticketId: number,
    text: string,
    agent: string,
    role: string
  ): Promise<boolean> {
    try {
      await this.request('POST', `/tickets/${ticketId}/comments`, {
        text: text.replace(/"/g, '\\"'),
        agent,
        role
      });
      return true;
    } catch (error) {
      logger.error(`Failed to add comment to ticket ${ticketId}`, error as Error);
      return false;
    }
  }
  
  /**
   * Get acceptance criteria
   */
  async getAC(ticketId: number): Promise<Array<{ id: number; status: string; then_text: string }>> {
    try {
      const result = await this.request('GET', `/tickets/${ticketId}/ac`);
      return result.acceptance_criteria || [];
    } catch (error) {
      logger.error(`Failed to get AC for ticket ${ticketId}`, error as Error);
      return [];
    }
  }
  
  /**
   * Update AC status
   */
  async updateAC(
    ticketId: number,
    acId: number,
    status: 'pending' | 'in_test' | 'pass' | 'fail',
    actor: string
  ): Promise<boolean> {
    try {
      await this.request('PATCH', `/tickets/${ticketId}/ac/${acId}`, {
        status,
        actor
      });
      return true;
    } catch (error) {
      logger.error(`Failed to update AC ${acId}`, error as Error);
      return false;
    }
  }
  
  /**
   * Queue for review
   */
  async queueForReview(
    ticketId: number,
    actor: string,
    autoTrigger?: boolean
  ): Promise<boolean> {
    try {
      await this.request('POST', `/tickets/${ticketId}/ralph/queue-review`, {
        actor,
        auto_triggered: autoTrigger || false
      });
      return true;
    } catch (error) {
      logger.error(`Failed to queue for review`, error as Error);
      return false;
    }
  }
}

/**
 * Verification Engine - Auto-detect completion criteria
 */
class VerificationEngine {
  /**
   * Run tests and return results
   */
  async runTests(repoPath: string, testCommand: string = 'npm test'): Promise<VerificationResult> {
    logger.log('Running tests...');
    
    const result: VerificationResult = {
      type: 'test',
      status: 'running',
      startedAt: new Date().toISOString()
    };
    
    try {
      const output = execSync(testCommand, {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      result.status = 'pass';
      result.completedAt = new Date().toISOString();
      result.output = output.substring(0, 1000); // Truncate
      
      logger.success('Tests passed');
    } catch (error: any) {
      result.status = 'fail';
      result.completedAt = new Date().toISOString();
      result.output = error.stdout?.substring(0, 1000);
      result.error = error.stderr?.substring(0, 500);
      
      logger.warn('Tests failed');
    }
    
    return result;
  }
  
  /**
   * Run build check
   */
  async runBuild(repoPath: string, buildCommand: string = 'npm run build'): Promise<VerificationResult> {
    logger.log('Running build check...');
    
    const result: VerificationResult = {
      type: 'build',
      status: 'running',
      startedAt: new Date().toISOString()
    };
    
    try {
      const output = execSync(buildCommand, {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 180000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      result.status = 'pass';
      result.completedAt = new Date().toISOString();
      result.output = output.substring(0, 500);
      
      logger.success('Build successful');
    } catch (error: any) {
      result.status = 'fail';
      result.completedAt = new Date().toISOString();
      result.error = error.message;
      
      logger.warn('Build failed');
    }
    
    return result;
  }
  
  /**
   * Run lint check
   */
  async runLint(repoPath: string, lintCommand: string = 'npm run lint'): Promise<VerificationResult> {
    logger.log('Running lint check...');
    
    const result: VerificationResult = {
      type: 'lint',
      status: 'running',
      startedAt: new Date().toISOString()
    };
    
    try {
      execSync(lintCommand, {
        cwd: repoPath,
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      result.status = 'pass';
      result.completedAt = new Date().toISOString();
      
      logger.success('Linting passed');
    } catch (error: any) {
      result.status = 'fail';
      result.completedAt = new Date().toISOString();
      result.error = error.message;
      
      logger.warn('Linting failed');
    }
    
    return result;
  }
  
  /**
   * Check if all AC are passing
   */
  async checkACStatus(acList: Array<{ status: string }>): Promise<VerificationResult> {
    const pending = acList.filter(ac => ac.status === 'pending').length;
    const passing = acList.filter(ac => ac.status === 'pass').length;
    const failing = acList.filter(ac => ac.status === 'fail').length;
    
    const result: VerificationResult = {
      type: 'custom',
      status: 'pending',
      output: `${passing}/${acList.length} AC passing (${failing} failing, ${pending} pending)`
    };
    
    if (failing > 0) {
      result.status = 'fail';
    } else if (pending === 0 && passing === acList.length) {
      result.status = 'pass';
    }
    
    return result;
  }
  
  /**
   * Verify git work is complete (commits exist)
   */
  async verifyGitWork(repoPath: string): Promise<boolean> {
    try {
      // Check for uncommitted changes
      const status = execSync('git status --porcelain', {
        cwd: repoPath,
        encoding: 'utf-8'
      });
      
      if (status.trim()) {
        logger.warn('Uncommitted changes detected');
        return false;
      }
      
      // Check for unpushed commits
      const ahead = execSync('git rev-list --count @{u}..HEAD 2>/dev/null || echo "0"', {
        cwd: repoPath,
        encoding: 'utf-8'
      });
      
      if (parseInt(ahead.trim(), 10) > 0) {
        logger.warn('Unpushed commits detected');
        return false;
      }
      
      logger.success('Git work verified');
      return true;
    } catch (error) {
      logger.error('Git verification failed', error as Error);
      return false;
    }
  }
}

/**
 * Main Phase Tracker class
 */
export class PhaseTracker {
  private stateManager: StateManager;
  private lockManager: LockManager;
  private api: RemyAPIClient;
  private verification: VerificationEngine;
  private autoTriggerConfig: AutoTriggerConfig;
  
  constructor(autoTriggerConfig?: Partial<AutoTriggerConfig>) {
    this.stateManager = new StateManager();
    this.lockManager = new LockManager();
    this.api = new RemyAPIClient();
    this.verification = new VerificationEngine();
    
    this.autoTriggerConfig = {
      onTestPass: true,
      onBuildSuccess: true,
      onAllACPass: true,
      autoQueueForReview: true,
      minimumCoverage: 80,
      ...autoTriggerConfig
    };
  }
  
  /**
   * Start phase work with locking
   */
  async startPhase(ticketNumber: string, phase: string, repoPath?: string): Promise<boolean> {
    logger.log(`Starting phase ${phase} for ${ticketNumber}`);
    
    // Get ticket info
    const ticket = await this.api.getTicket(ticketNumber);
    if (!ticket) {
      logger.error(`Ticket ${ticketNumber} not found`);
      return false;
    }
    
    // Acquire lock
    const lock = this.lockManager.acquireLock(ticket.id.toString(), phase);
    if (!lock) {
      const owner = this.lockManager.getLockOwner(ticket.id.toString(), phase);
      logger.error(`Cannot start phase ${phase} - locked by ${owner}`);
      return false;
    }
    
    // Update state
    this.stateManager.updateTicketState(ticketNumber, {
      ticketId: ticket.id.toString(),
      currentPhase: phase,
      phaseStatus: 'in_progress',
      agentId: CONFIG.AGENT_ID,
      lockToken: lock.token
    });
    
    logger.success(`Phase ${phase} started for ${ticketNumber} (lock acquired)`);
    return true;
  }
  
  /**
   * Check if dev work is complete (auto-detection)
   */
  async checkDevCompletion(
    ticketNumber: string,
    repoPath: string,
    options: {
      runTests?: boolean;
      runBuild?: boolean;
      runLint?: boolean;
    } = {}
  ): Promise<{
    complete: boolean;
    results: VerificationResult[];
    allPassed: boolean;
  }> {
    logger.log(`Checking dev completion for ${ticketNumber}`);
    
    const ticket = await this.api.getTicket(ticketNumber);
    if (!ticket) {
      throw new Error(`Ticket ${ticketNumber} not found`);
    }
    
    const results: VerificationResult[] = [];
    
    // Check AC status
    const acList = await this.api.getAC(ticket.id);
    const acResult = await this.verification.checkACStatus(acList);
    results.push(acResult);
    
    // Check git work
    const gitComplete = await this.verification.verifyGitWork(repoPath);
    
    // Run verifications
    if (options.runTests !== false) {
      const testResult = await this.verification.runTests(repoPath);
      results.push(testResult);
    }
    
    if (options.runBuild !== false) {
      const buildResult = await this.verification.runBuild(repoPath);
      results.push(buildResult);
    }
    
    if (options.runLint !== false) {
      const lintResult = await this.verification.runLint(repoPath);
      results.push(lintResult);
    }
    
    // Check if all passed
    const allPassed = results.every(r => r.status === 'pass') && gitComplete;
    
    // Update state
    this.stateManager.updateTicketState(ticketNumber, {
      verificationResults: results
    });
    
    // Auto-trigger if all passed
    if (allPassed && this.autoTriggerConfig.onAllACPass) {
      logger.success('All verifications passed - eligible for auto-completion');
    }
    
    return {
      complete: allPassed,
      results,
      allPassed
    };
  }
  
  /**
   * Complete phase with auto-verification
   */
  async completePhase(
    ticketNumber: string,
    phase: string,
    options: {
      nextStatus?: string;
      nextPhase?: string;
      actor?: string;
      actorRole?: string;
      actorName?: string;
      comment?: string;
      verifyFirst?: boolean;
      repoPath?: string;
    } = {}
  ): Promise<boolean> {
    const {
      nextStatus,
      nextPhase,
      actor = 'dev-agent',
      actorRole = 'dev',
      actorName = 'Dev Agent',
      comment,
      verifyFirst = true,
      repoPath
    } = options;
    
    logger.log(`Completing phase ${phase} for ${ticketNumber}`);
    
    // Get ticket
    const ticket = await this.api.getTicket(ticketNumber);
    if (!ticket) {
      logger.error(`Ticket ${ticketNumber} not found`);
      return false;
    }
    
    // Get state
    const state = this.stateManager.getTicketState(ticketNumber);
    if (!state || !state.lockToken) {
      // Try to acquire lock
      const lock = this.lockManager.acquireLock(ticket.id.toString(), phase);
      if (!lock) {
        logger.error(`Cannot complete phase - not locked by this agent`);
        return false;
      }
    }
    
    // Update state to completing
    this.stateManager.updateTicketState(ticketNumber, {
      phaseStatus: 'completing',
      currentPhase: phase
    });
    
    // Run verification if enabled
    if (verifyFirst && repoPath && (phase === 'Dev' || phase === 'dev')) {
      const verification = await this.checkDevCompletion(ticketNumber, repoPath);
      
      if (!verification.complete) {
        logger.warn('Verification failed - cannot complete phase');
        this.stateManager.updateTicketState(ticketNumber, {
          phaseStatus: 'in_progress'
        });
        return false;
      }
    }
    
    // Mark phase complete via API
    const success = await this.api.completePhase(
      ticket.id,
      phase,
      actor,
      actorRole,
      actorName
    );
    
    if (!success) {
      this.stateManager.updateTicketState(ticketNumber, {
        phaseStatus: 'failed'
      });
      return false;
    }
    
    // Update ticket status if provided
    if (nextStatus) {
      await this.api.updateStatus(
        ticket.id,
        nextStatus,
        actor,
        actorRole,
        actorName,
        comment
      );
    }
    
    // Auto-queue for review if enabled
    if (this.autoTriggerConfig.autoQueueForReview && phase === 'Test') {
      await this.api.queueForReview(ticket.id, actor, true);
    }
    
    // Update state
    this.stateManager.updateTicketState(ticketNumber, {
      phaseStatus: 'complete',
      currentPhase: nextPhase || ''
    });
    
    // Release lock
    if (state?.lockToken) {
      this.lockManager.releaseLock(ticket.id.toString(), phase, state.lockToken);
    }
    
    logger.success(`Phase ${phase} completed successfully`);
    return true;
  }
  
  /**
   * Recover crashed phases
   */
  async recoverCrashedPhases(maxAgeMinutes: number = 10): Promise<boolean> {
    logger.log('Checking for crashed phases...');
    
    const crashed = this.stateManager.recoverCrashedPhases(maxAgeMinutes);
    
    if (crashed.length === 0) {
      logger.debug('No crashed phases found');
      return true;
    }
    
    logger.warn(`Found ${crashed.length} crashed phases`);
    
    for (const { ticketNumber, phase } of crashed) {
      logger.log(`Recovering ${ticketNumber}/${phase}...`);
      
      // Get current ticket state from API
      const ticket = await this.api.getTicket(ticketNumber);
      
      if (!ticket) {
        logger.warn(`Removing orphaned state for ${ticketNumber}`);
        this.stateManager.removeTicketState(ticketNumber);
        continue;
      }
      
      // Check if phase is actually complete
      const ralphPhase = ticket.ralph_phases?.find(p => p.phase.toLowerCase() === phase.toLowerCase());
      
      if (ralphPhase?.completed) {
        logger.success(`${ticketNumber}/${phase} already complete - cleaning up state`);
        this.stateManager.removeTicketState(ticketNumber);
      } else {
        // Phase incomplete - could resume or restart
        logger.warn(`${ticketNumber}/${phase} incomplete - manual intervention needed`);
        
        // Add comment
        await this.api.addComment(
          ticket.id,
          `⚠️ Phase recovery: ${phase} was in progress but agent may have crashed. Manual review needed.`,
          'phase-tracker',
          'system'
        );
      }
    }
    
    return true;
  }
  
  /**
   * Extend current lock to prevent timeout
   */
  extendLock(ticketNumber: string, phase: string): boolean {
    const state = this.stateManager.getTicketState(ticketNumber);
    if (!state?.lockToken) {
      logger.warn('No active lock to extend');
      return false;
    }
    
    return this.lockManager.extendLock(state.ticketId, phase, state.lockToken);
  }
  
  /**
   * Check for duplicate agents (conflict detection)
   */
  async detectDuplicateAssignment(ticketNumber: string, phase: string): Promise<string | null> {
    const ticket = await this.api.getTicket(ticketNumber);
    if (!ticket) return null;
    
    const owner = this.lockManager.getLockOwner(ticket.id.toString(), phase);
    
    if (owner && owner !== CONFIG.AGENT_ID) {
      return owner;
    }
    
    return null;
  }
  
  /**
   * Cleanup stale locks
   */
  cleanupLocks(): number {
    return this.lockManager.cleanupStaleLocks();
  }
  
  /**
   * Get ticket state
   */
  getState(ticketNumber: string): TicketState | null {
    return this.stateManager.getTicketState(ticketNumber);
  }
  
  /**
   * Get status summary
   */
  async getStatus(ticketNumber: string): Promise<{
    ticket: TicketPhaseInfo | null;
    state: TicketState | null;
    locked: boolean;
    lockOwner: string | null;
  }> {
    const ticket = await this.api.getTicket(ticketNumber);
    const state = this.getState(ticketNumber);
    const locked = ticket ? this.lockManager.isLocked(ticket.id.toString(), state?.currentPhase || 'Dev') : false;
    const lockOwner = ticket ? this.lockManager.getLockOwner(ticket.id.toString(), state?.currentPhase || 'Dev') : null;
    
    return { ticket, state, locked, lockOwner };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const tracker = new PhaseTracker();
  
  async function main() {
    switch (command) {
      case 'start': {
        const ticketNumber = args[1];
        const phase = args[2];
        
        if (!ticketNumber || !phase) {
          console.log('Usage: phase-tracker start <ticket> <phase>');
          process.exit(1);
        }
        
        const success = await tracker.startPhase(ticketNumber, phase);
        process.exit(success ? 0 : 1);
      }
      
      case 'complete': {
        const ticketNumber = args[1];
        const phase = args[2];
        const nextStatus = args[3];
        
        if (!ticketNumber || !phase) {
          console.log('Usage: phase-tracker complete <ticket> <phase> [next-status]');
          process.exit(1);
        }
        
        const success = await tracker.completePhase(ticketNumber, phase, {
          nextStatus,
          actor: CONFIG.AGENT_ID
        });
        process.exit(success ? 0 : 1);
      }
      
      case 'verify': {
        const ticketNumber = args[1];
        const repoPath = args[2] || process.cwd();
        
        if (!ticketNumber) {
          console.log('Usage: phase-tracker verify <ticket> [repo-path]');
          process.exit(1);
        }
        
        const result = await tracker.checkDevCompletion(ticketNumber, repoPath);
        console.log('\nVerification Results:');
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.complete ? 0 : 1);
      }
      
      case 'recover': {
        await tracker.recoverCrashedPhases(parseInt(args[1] || '10', 10));
        process.exit(0);
      }
      
      case 'status': {
        const ticketNumber = args[1];
        
        if (!ticketNumber) {
          console.log('Usage: phase-tracker status <ticket>');
          process.exit(1);
        }
        
        const status = await tracker.getStatus(ticketNumber);
        console.log(JSON.stringify(status, null, 2));
        process.exit(0);
      }
      
      case 'extend': {
        const ticketNumber = args[1];
        const phase = args[2];
        
        if (!ticketNumber || !phase) {
          console.log('Usage: phase-tracker extend <ticket> <phase>');
          process.exit(1);
        }
        
        const success = tracker.extendLock(ticketNumber, phase);
        process.exit(success ? 0 : 1);
      }
      
      case 'cleanup': {
        const cleaned = tracker.cleanupLocks();
        console.log(`Cleaned up ${cleaned} stale locks`);
        process.exit(0);
      }
      
      default: {
        console.log(`
Phase Tracker - TASK-040 Phase 2 Implementation

Commands:
  start <ticket> <phase>          Start working on a phase (acquires lock)
  complete <ticket> <phase> [next] Complete phase with verification
  verify <ticket> [repo-path]     Run verification checks
  recover [max-age-min]           Recover crashed phases
  status <ticket>                 Show ticket status
  extend <ticket> <phase>         Extend lock timeout
  cleanup                         Remove stale locks

Examples:
  phase-tracker start REMY-042 Dev
  phase-tracker verify REMY-042 ~/projects/my-repo
  phase-tracker complete REMY-042 Dev "In QA"
  phase-tracker recover 10
  phase-tracker status REMY-042
`);
        process.exit(1);
      }
    }
  }
  
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

export default PhaseTracker;