/**
 * Git Clone Module
 * 
 * Handles cloning of user repositories to local workspace for operations.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface CloneConfig {
  userId: string;
  branch?: string;
  depth?: number;
  destDir?: string;
}

export interface CloneResult {
  repoPath: string;
  clonedAt: Date;
  success: boolean;
  error?: string;
}

const WORKSPACE_BASE = process.env.WORKSPACE_BASE || '/tmp/agent-paige-workspace';
const ORG_NAME = process.env.GITHUB_ORG || 'agent-paige-sites';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

/**
 * Clone a user repository to local workspace
 * 
 * Clones to: {WORKSPACE_BASE}/{userId}/
 */
export async function cloneUserRepo(config: CloneConfig): Promise<CloneResult> {
  const repoName = `user-${config.userId}`;
  const repoUrl = GITHUB_TOKEN
    ? `https://x-access-token:${GITHUB_TOKEN}@github.com/${ORG_NAME}/${repoName}.git`
    : `https://github.com/${ORG_NAME}/${repoName}.git`;
  
  const destPath = config.destDir || path.join(WORKSPACE_BASE, config.userId);

  try {
    // Ensure workspace directory exists
    await fs.mkdir(path.dirname(destPath), { recursive: true });

    // Check if already cloned
    const gitDir = path.join(destPath, '.git');
    try {
      await fs.access(gitDir);
      // Already cloned - do a pull instead
      console.log(`Repository already exists at ${destPath}, fetching updates...`);
      await execAsync('git fetch origin', { cwd: destPath });
      if (config.branch) {
        await execAsync(`git checkout ${config.branch}`, { cwd: destPath });
      }
      await execAsync('git pull origin HEAD', { cwd: destPath });
      
      return {
        repoPath: destPath,
        clonedAt: new Date(),
        success: true,
      };
    } catch {
      // Not cloned yet, proceed with clone
    }

    // Build clone command
    const branchFlag = config.branch ? ` --branch ${config.branch}` : '';
    const depthFlag = config.depth ? ` --depth ${config.depth}` : '';
    
    const cloneCommand = `git clone${branchFlag}${depthFlag} "${repoUrl}" "${destPath}"`;
    
    console.log(`Cloning repository to ${destPath}...`);
    await execAsync(cloneCommand);

    return {
      repoPath: destPath,
      clonedAt: new Date(),
      success: true,
    };

  } catch (error) {
    console.error('Failed to clone repository:', error);
    return {
      repoPath: destPath,
      clonedAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the local path for a user repository
 */
export function getRepoPath(userId: string): string {
  return path.join(WORKSPACE_BASE, userId);
}

/**
 * Get the path to a specific site within a user repository
 */
export function getSiteRepoPath(userId: string, siteName: string): string {
  return path.join(WORKSPACE_BASE, userId, 'sites', siteName);
}

/**
 * Check if a user repository is already cloned locally
 */
export async function isRepoCloned(userId: string): Promise<boolean> {
  const repoPath = getRepoPath(userId);
  const gitDir = path.join(repoPath, '.git');
  
  try {
    await fs.access(gitDir);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a cloned repository from local workspace
 */
export async function removeClonedRepo(userId: string): Promise<boolean> {
  const repoPath = getRepoPath(userId);
  
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get repository info (current branch, last commit)
 */
export async function getRepoInfo(userId: string): Promise<{
  currentBranch: string;
  lastCommit: string;
  lastCommitDate: string;
} | null> {
  const repoPath = getRepoPath(userId);
  
  try {
    const { stdout: branch } = await execAsync(
      'git rev-parse --abbrev-ref HEAD',
      { cwd: repoPath }
    );
    
    const { stdout: commit } = await execAsync(
      'git log -1 --format="%H"',
      { cwd: repoPath }
    );
    
    const { stdout: date } = await execAsync(
      'git log -1 --format="%ai"',
      { cwd: repoPath }
    );
    
    return {
      currentBranch: branch.trim(),
      lastCommit: commit.trim(),
      lastCommitDate: date.trim(),
    };
  } catch {
    return null;
  }
}
