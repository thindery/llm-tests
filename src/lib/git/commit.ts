/**
 * Git Commit Module
 * 
 * Handles creating commits for site updates.
 * Tracks commits per site in the database.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getRepoPath, cloneUserRepo } from './clone';

const execAsync = promisify(exec);

export interface FileChange {
  path: string;
  content: string;
}

export interface CommitConfig {
  userId: string;
  siteName: string;
  message: string;
  files: FileChange[];
  branch?: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface CommitResult {
  commitSha: string;
  treeSha: string;
  committedAt: Date;
  success: boolean;
  siteId?: string;
  error?: string;
}

// Simulated database - in production this would connect to Supabase
interface CommitRecord {
  id: string;
  userId: string;
  siteName: string;
  commitSha: string;
  message: string;
  createdAt: Date;
}

const commitDatabase: Map<string, CommitRecord> = new Map();

/**
 * Commit files to a user's repository
 * Creates files, stages them, and commits with the provided message
 */
export async function commitFiles(config: CommitConfig): Promise<CommitResult> {
  const repoPath = getRepoPath(config.userId);
  const sitePath = path.join(repoPath, 'sites', config.siteName);
  
  try {
    // Ensure repository is cloned
    if (!(await isDir(repoPath))) {
      const cloneResult = await cloneUserRepo({ userId: config.userId });
      if (!cloneResult.success) {
        throw new Error(`Failed to clone repository: ${cloneResult.error}`);
      }
    }

    // Ensure site directory exists
    await fs.mkdir(sitePath, { recursive: true });

    // Write files
    for (const file of config.files) {
      const filePath = path.join(repoPath, file.path);
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf-8');
    }

    // Configure git author if provided
    if (config.author) {
      await execAsync(
        `git config user.name "${config.author.name}"`,
        { cwd: repoPath }
      );
      await execAsync(
        `git config user.email "${config.author.email}"`,
        { cwd: repoPath }
      );
    }

    // Stage files
    for (const file of config.files) {
      await execAsync(`git add "${file.path}"`, { cwd: repoPath });
    }

    // Create commit
    const commitMessage = `[${config.siteName}] ${config.message}`;
    const { stdout: commitOutput } = await execAsync(
      `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
      { cwd: repoPath }
    );

    // Extract commit SHA
    const commitShaMatch = commitOutput.match(/\[.+\s([a-f0-9]+)\]/);
    const commitSha = commitShaMatch ? commitShaMatch[1] : '';

    // Get tree SHA
    const { stdout: treeSha } = await execAsync(
      `git rev-parse ${commitSha}^{tree}`,
      { cwd: repoPath }
    );

    // Push to remote
    const branch = config.branch || 'main';
    await execAsync(`git push origin ${branch}`, { cwd: repoPath });

    // Track in database
    const record: CommitRecord = {
      id: `${config.userId}-${config.siteName}-${commitSha.substring(0, 8)}`,
      userId: config.userId,
      siteName: config.siteName,
      commitSha,
      message: config.message,
      createdAt: new Date(),
    };
    commitDatabase.set(record.id, record);

    return {
      commitSha,
      treeSha: treeSha.trim(),
      committedAt: new Date(),
      success: true,
      siteId: `${config.userId}-${config.siteName}`,
    };

  } catch (error) {
    console.error('Failed to commit files:', error);
    return {
      commitSha: '',
      treeSha: '',
      committedAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get commit history for a site
 */
export async function getSiteCommits(
  userId: string,
  siteName: string,
  limit: number = 20
): Promise<CommitRecord[]> {
  const repoPath = getRepoPath(userId);
  
  try {
    // Get commits that modified the site directory
    const { stdout } = await execAsync(
      `git log --format="%H|%s|%aI|%an|%ae" -n ${limit} -- sites/${siteName}/`,
      { cwd: repoPath }
    );

    const commits: CommitRecord[] = stdout
      .trim()
      .split('\n')
      .filter(line => line)
      .map(line => {
        const [commitSha, message, date] = line.split('|');
        return {
          id: `${userId}-${siteName}-${commitSha.substring(0, 8)}`,
          userId,
          siteName,
          commitSha,
          message: message || '',
          createdAt: new Date(date || Date.now()),
        };
      });

    return commits;
  } catch {
    return [];
  }
}

/**
 * Get a specific commit by SHA
 */
export async function getCommitBySha(
  userId: string,
  commitSha: string
): Promise<CommitRecord | null> {
  const repoPath = getRepoPath(userId);
  
  try {
    const { stdout } = await execAsync(
      `git log --format="%H|%s|%aI" -n 1 ${commitSha}`,
      { cwd: repoPath }
    );

    const [sha, message, date] = stdout.trim().split('|');
    return {
      id: `${userId}-${sha.substring(0, 8)}`,
      userId,
      siteName: '', // Infer from message if needed
      commitSha: sha,
      message,
      createdAt: new Date(date || Date.now()),
    };
  } catch {
    return null;
  }
}

/**
 * Get the diff for a specific commit
 */
export async function getCommitDiff(
  userId: string,
  commitSha: string
): Promise<string | null> {
  const repoPath = getRepoPath(userId);
  
  try {
    const { stdout } = await execAsync(
      `git show ${commitSha} --stat`,
      { cwd: repoPath }
    );
    return stdout;
  } catch {
    return null;
  }
}

/**
 * Helper to check if directory exists
 */
async function isDir(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get database stats for commits
 */
export function getCommitStats(): { totalCommits: number; sitesWithCommits: Set<string> } {
  const sites = new Set<string>();
  for (const record of commitDatabase.values()) {
    sites.add(`${record.userId}/${record.siteName}`);
  }
  
  return {
    totalCommits: commitDatabase.size,
    sitesWithCommits: sites,
  };
}
