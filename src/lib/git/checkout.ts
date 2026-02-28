/**
 * Git Checkout Module
 * 
 * Handles checking out specific commits/tags for rollback functionality
 * and historical version access.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { getRepoPath, cloneUserRepo } from './clone';
import { getSiteTags } from './tag';

const execAsync = promisify(exec);

export interface CheckoutConfig {
  userId: string;
  siteName: string;
  ref: string; // commit SHA, tag name, or branch
  force?: boolean;
  createBranch?: boolean;
}

export interface CheckoutResult {
  previousRef: string;
  newRef: string;
  files: string[];
  checkedAt: Date;
  success: boolean;
  error?: string;
}

export interface RollbackResult extends CheckoutResult {
  rolledbackTo: string;
  rolledbackFrom: string;
}

/**
 * Checkout a specific reference (commit, tag, or branch)
 * 
 * Used for viewing historical versions or preparing rollbacks
 */
export async function checkout(config: CheckoutConfig): Promise<CheckoutResult> {
  const repoPath = getRepoPath(config.userId);

  try {
    // Ensure repository is cloned
    if (!(await isDir(repoPath))) {
      await cloneUserRepo({ userId: config.userId });
    }

    // Get current ref before checkout
    const { stdout: currentRef } = await execAsync(
      'git rev-parse HEAD',
      { cwd: repoPath }
    );
    const previousRef = currentRef.trim();

    // Determine if ref is a site-specific tag
    let targetRef = config.ref;
    if (!config.ref.includes('/') && config.siteName) {
      // Check if it's a version number we should prefix
      if (/^v?\d+\.\d+\.\d+/.test(config.ref)) {
        const version = config.ref.replace(/^v/, '');
        targetRef = `${config.siteName}/v${version}`;
      }
    }

    // Build checkout command
    let cmd = 'git checkout';
    if (config.force) cmd += ' --force';
    if (config.createBranch) cmd += ' -b';
    cmd += ` "${targetRef}"`;

    // Execute checkout
    await execAsync(cmd, { cwd: repoPath });

    // Get list of files at this ref for the site
    const { stdout: filesOutput } = await execAsync(
      `git ls-tree -r --name-only "${targetRef}" -- sites/${config.siteName}/`,
      { cwd: repoPath }
    );
    const files = filesOutput.trim().split('\n').filter(f => f);

    // Get the new HEAD ref
    const { stdout: newRefOutput } = await execAsync(
      'git rev-parse HEAD',
      { cwd: repoPath }
    );
    const newRef = newRefOutput.trim();

    return {
      previousRef,
      newRef,
      files,
      checkedAt: new Date(),
      success: true,
    };

  } catch (error) {
    console.error('Failed to checkout:', error);
    return {
      previousRef: '',
      newRef: '',
      files: [],
      checkedAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Rollback a site to a previous version
 * 
 * Creates a new commit that reverts to the specified version
 */
export async function rollbackSite(
  userId: string,
  siteName: string,
  targetVersion: string
): Promise<RollbackResult> {
  const repoPath = getRepoPath(userId);
  
  try {
    // Ensure repository is cloned
    if (!(await isDir(repoPath))) {
      await cloneUserRepo({ userId });
    }

    // Get current state before rollback
    const { stdout: currentRef } = await execAsync(
      'git rev-parse HEAD',
      { cwd: repoPath }
    );
    const rolledbackFrom = currentRef.trim();

    // Resolve target version to a ref
    let targetRef = targetVersion;
    if (!targetVersion.startsWith('sites/') && !targetVersion.startsWith(siteName)) {
      // Look up tag for this version
      const tags = await getSiteTags(userId, siteName);
      const matchingTag = tags.find(t => 
        t.tag === `${siteName}/${targetVersion}` ||
        t.version === targetVersion.replace(/^v/, '')
      );
      
      if (matchingTag) {
        targetRef = matchingTag.tag;
      } else {
        throw new Error(`Version ${targetVersion} not found for site ${siteName}`);
      }
    }

    // Get the commit SHA for this ref
    const { stdout: targetCommit } = await execAsync(
      `git rev-parse "${targetRef}"`,
      { cwd: repoPath }
    );
    const rolledbackTo = targetCommit.trim();

    // For site rollbacks, we restore the site directory to the target state
    // This creates a new commit rather than just checking out
    const sitePath = `sites/${siteName}`;

    // Restore site directory to target version
    await execAsync(
      `git checkout "${targetRef}" -- "${sitePath}"`,
      { cwd: repoPath }
    );

    // Stage the restored files
    await execAsync(`git add "${sitePath}"`, { cwd: repoPath });

    // Create rollback commit
    const rollbackMessage = `rollback(${siteName}): revert to ${targetRef}`;
    await execAsync(
      `git commit -m "${rollbackMessage}"`,
      { cwd: repoPath }
    );

    // Push the rollback commit
    await execAsync('git push origin HEAD', { cwd: repoPath });

    // Get list of files
    const { stdout: filesOutput } = await execAsync(
      `git ls-tree -r --name-only HEAD -- "${sitePath}"`,
      { cwd: repoPath }
    );
    const files = filesOutput.trim().split('\n').filter(f => f);

    return {
      previousRef: rolledbackFrom,
      newRef: rolledbackTo,
      rolledbackTo: targetRef,
      rolledbackFrom: rolledbackFrom.substring(0, 8),
      files,
      checkedAt: new Date(),
      success: true,
    };

  } catch (error) {
    console.error('Failed to rollback site:', error);
    return {
      previousRef: '',
      newRef: '',
      rolledbackTo: targetVersion,
      rolledbackFrom: '',
      files: [],
      checkedAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get file content at a specific commit
 */
export async function getFileAtRef(
  userId: string,
  filePath: string,
  ref: string = 'HEAD'
): Promise<string | null> {
  const repoPath = getRepoPath(userId);

  try {
    const { stdout } = await execAsync(
      `git show "${ref}:${filePath}"`,
      { cwd: repoPath }
    );
    return stdout;
  } catch {
    return null;
  }
}

/**
 * Compare current state with a target ref
 * Returns list of files that would change
 */
export async function diffWithRef(
  userId: string,
  siteName: string,
  targetRef: string
): Promise<{ file: string; status: 'added' | 'modified' | 'deleted' }[]> {
  const repoPath = getRepoPath(userId);
  const sitePath = `sites/${siteName}`;

  try {
    // Get diff stats between current and target
    const { stdout } = await execAsync(
      `git diff --name-status HEAD "${targetRef}" -- "${sitePath}"`,
      { cwd: repoPath }
    );

    const changes: { file: string; status: 'added' | 'modified' | 'deleted' }[] = [];
    
    for (const line of stdout.trim().split('\n')) {
      if (!line) continue;
      
      const status = line.charAt(0);
      const file = line.substring(2);
      
      let changeStatus: 'added' | 'modified' | 'deleted';
      switch (status) {
        case 'A': changeStatus = 'added'; break;
        case 'M': changeStatus = 'modified'; break;
        case 'D': changeStatus = 'deleted'; break;
        default: changeStatus = 'modified';
      }
      
      changes.push({ file, status: changeStatus });
    }

    return changes;

  } catch {
    return [];
  }
}

/**
 * List available versions for rollback
 */
export async function listRollbackVersions(
  userId: string,
  siteName: string,
  limit: number = 10
): Promise<{ version: string; tag: string; date: Date; message: string }[]> {
  const tags = await getSiteTags(userId, siteName);
  
  return tags
    .slice(0, limit)
    .map(t => ({
      version: t.version,
      tag: t.tag,
      date: t.date,
      message: t.message,
    }));
}

/**
 * Check if a site is on the latest version
 */
export async function isSiteAtLatestVersion(
  userId: string,
  siteName: string
): Promise<{ isLatest: boolean; currentVersion?: string; latestVersion?: string }> {
  const repoPath = getRepoPath(userId);

  try {
    // Get current commit
    const { stdout: currentCommit } = await execAsync(
      'git rev-parse HEAD',
      { cwd: repoPath }
    );

    // Get latest tag for site
    const tags = await getSiteTags(userId, siteName);
    if (tags.length === 0) {
      return { isLatest: true };
    }

    const latestTag = tags[0];

    // Check if current HEAD matches latest tag
    const isLatest = currentCommit.trim() === latestTag.commitSha;

    return {
      isLatest,
      currentVersion: isLatest ? latestTag.version : undefined,
      latestVersion: latestTag.version,
    };

  } catch {
    return { isLatest: false };
  }
}

/**
 * Helper to check if directory exists
 */
async function isDir(path: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
