/**
 * Git Tag Module
 * 
 * Handles creating version tags for sites.
 * Tags follow format: {sitename}/v{semver}
 * Example: portfolio/v1.0.0, blog/v2.1.3
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { getRepoPath, cloneUserRepo } from './clone';

const execAsync = promisify(exec);

export interface TagConfig {
  userId: string;
  siteName: string;
  tagName: string;
  message: string;
  commitSha?: string;
  force?: boolean;
}

export interface TagResult {
  tagName: string;
  commitSha: string;
  createdAt: Date;
  success: boolean;
  error?: string;
}

export interface SiteVersion {
  tag: string;
  version: string;
  commitSha: string;
  date: Date;
  message: string;
}

// Tag format: {siteName}/v{version}
const TAG_REGEX = /^([a-z0-9-]+)\/v(\d+)\.(\d+)\.(\d+)(-(.+))?$/;

/**
 * Create a version tag for a site
 * 
 * Tag format: portfolio/v1.0.0, blog/v2.1.3
 */
export async function createTag(config: TagConfig): Promise<TagResult> {
  const repoPath = getRepoPath(config.userId);
  const fullTagName = config.tagName.startsWith(config.siteName)
    ? config.tagName
    : `${config.siteName}/${config.tagName}`;

  try {
    // Ensure repository is cloned
    if (!(await isDir(repoPath))) {
      await cloneUserRepo({ userId: config.userId });
    }

    const tagExists = await hasTag(repoPath, fullTagName);
    
    if (tagExists && !config.force) {
      throw new Error(`Tag ${fullTagName} already exists. Use force=true to overwrite.`);
    }

    // Create annotated tag
    const targetRef = config.commitSha || 'HEAD';
    const cmd = tagExists && config.force
      ? `git tag -fa "${fullTagName}" ${targetRef} -m "${config.message}"`
      : `git tag -a "${fullTagName}" ${targetRef} -m "${config.message}"`;
    
    await execAsync(cmd, { cwd: repoPath });

    // Push tag to remote
    const pushCmd = config.force
      ? `git push origin "${fullTagName}" --force`
      : `git push origin "${fullTagName}"`;
    await execAsync(pushCmd, { cwd: repoPath });

    // Get the commit SHA for this tag
    const { stdout } = await execAsync(
      `git rev-list -n 1 "${fullTagName}"`,
      { cwd: repoPath }
    );
    const commitSha = stdout.trim();

    return {
      tagName: fullTagName,
      commitSha,
      createdAt: new Date(),
      success: true,
    };

  } catch (error) {
    console.error('Failed to create tag:', error);
    return {
      tagName: fullTagName,
      commitSha: '',
      createdAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all tags for a specific site
 */
export async function getSiteTags(
  userId: string,
  siteName: string
): Promise<SiteVersion[]> {
  const repoPath = getRepoPath(userId);

  try {
    // Ensure repository is cloned
    if (!(await isDir(repoPath))) {
      await cloneUserRepo({ userId });
    }

    // Fetch all tags
    await execAsync('git fetch --tags', { cwd: repoPath });

    // List tags with prefix
    const { stdout } = await execAsync(
      `git tag -l "${siteName}/v*" --sort=-v:refname --format="%(refname:short)|%(objectname:short)|%(contents:subject)|%(taggerdate:iso8601)"`,
      { cwd: repoPath }
    );

    if (!stdout.trim()) {
      return [];
    }

    const versions: SiteVersion[] = stdout
      .trim()
      .split('\n')
      .filter(line => line)
      .map(line => {
        const [tag, commitSha, message, dateStr] = line.split('|');
        const versionMatch = tag.match(TAG_REGEX);
        const version = versionMatch ? `${versionMatch[2]}.${versionMatch[3]}.${versionMatch[4]}` : '';
        
        return {
          tag: tag || '',
          version,
          commitSha: commitSha || '',
          message: message || '',
          date: new Date(dateStr || Date.now()),
        };
      })
      .filter(v => v.version); // Only return valid semantic versions

    return versions;

  } catch (error) {
    console.error('Failed to get site tags:', error);
    return [];
  }
}

/**
 * Get the latest version for a site
 */
export async function getLatestVersion(
  userId: string,
  siteName: string
): Promise<SiteVersion | null> {
  const tags = await getSiteTags(userId, siteName);
  return tags.length > 0 ? tags[0] : null;
}

/**
 * Calculate next version based on change type
 */
export function calculateNextVersion(
  currentVersion: string,
  changeType: 'major' | 'minor' | 'patch'
): string {
  const parts = currentVersion.split('.').map(Number);
  
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.0';
  }

  const [major, minor, patch] = parts;

  switch (changeType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Create a new version tag automatically
 */
export async function bumpVersion(
  userId: string,
  siteName: string,
  changeType: 'major' | 'minor' | 'patch',
  message: string
): Promise<TagResult> {
  const latest = await getLatestVersion(userId, siteName);
  const currentVersion = latest?.version || '0.0.0';
  const nextVersion = calculateNextVersion(currentVersion, changeType);
  const tagName = `${siteName}/v${nextVersion}`;

  return createTag({
    userId,
    siteName,
    tagName,
    message,
  });
}

/**
 * Delete a tag (use with caution)
 */
export async function deleteTag(
  userId: string,
  tagName: string,
  remote: boolean = true
): Promise<boolean> {
  const repoPath = getRepoPath(userId);

  try {
    // Delete local tag
    await execAsync(`git tag -d "${tagName}"`, { cwd: repoPath });

    // Delete remote tag if requested
    if (remote) {
      await execAsync(`git push --delete origin "${tagName}"`, { cwd: repoPath });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a tag name
 */
export function validateTagName(tagName: string): { valid: boolean; error?: string } {
  if (!tagName) {
    return { valid: false, error: 'Tag name is required' };
  }

  if (!TAG_REGEX.test(tagName)) {
    return { valid: false, error: 'Tag must follow format: sitename/vMAJOR.MINOR.PATCH' };
  }

  return { valid: true };
}

/**
 * Check if a tag exists
 */
async function hasTag(repoPath: string, tagName: string): Promise<boolean> {
  try {
    await execAsync(`git rev-parse "${tagName}"`, { cwd: repoPath });
    return true;
  } catch {
    return false;
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
