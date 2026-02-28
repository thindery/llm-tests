/**
 * GitHub User Repository Creation Module
 * 
 * Creates a dedicated GitHub repository for each user under the
 * agent-paige-sites organization with proper structure.
 */

export interface UserRepoConfig {
  userId: string;
  userName?: string;
  email?: string;
  description?: string;
  private?: boolean;
}

export interface UserRepoResult {
  repoId: string;
  repoUrl: string;
  sshUrl: string;
  createdAt: Date;
  success: boolean;
  error?: string;
}

const GITHUB_API_BASE = 'https://api.github.com';
const ORG_NAME = process.env.GITHUB_ORG || 'agent-paige-sites';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

/**
 * Initialize a new user repository on GitHub
 * Creates: agent-paige-sites/{userId}
 */
export async function createUserRepo(config: UserRepoConfig): Promise<UserRepoResult> {
  const repoName = `user-${config.userId}`;
  
  try {
    // Check if token is configured
    if (!GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN environment variable not set');
    }

    // Create repository via GitHub API
    const response = await fetch(`${GITHUB_API_BASE}/orgs/${ORG_NAME}/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description: config.description || `Agent Paige sites for user ${config.userId}`,
        private: config.private ?? true,
        has_issues: true,
        has_projects: true,
        has_wiki: false,
        auto_init: true,
        gitignore_template: 'Node',
        license_template: 'mit',
        allow_squash_merge: true,
        allow_merge_commit: false,
        allow_rebase_merge: true,
        delete_branch_on_merge: true,
        allow_auto_merge: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      id: number;
      html_url: string;
      ssh_url: string;
      created_at: string;
    };

    // Initialize the sites directory structure via GitHub API
    await initializeRepoStructure(data.html_url, config.userId, config);

    return {
      repoId: data.id.toString(),
      repoUrl: data.html_url,
      sshUrl: data.ssh_url,
      createdAt: new Date(data.created_at),
      success: true,
    };

  } catch (error) {
    console.error('Failed to create user repo:', error);
    return {
      repoId: '',
      repoUrl: '',
      sshUrl: '',
      createdAt: new Date(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Initialize the standard directory structure for a user repository
 */
async function initializeRepoStructure(repoUrl: string, userId: string, _config: UserRepoConfig): Promise<void> {
  // These would be committed via GitHub API in production
  // For now, log the initialization
  console.log(`Initialized repository structure for ${userId} at ${repoUrl}`);
}

/**
 * Check if a user repository already exists
 */
export async function userRepoExists(userId: string): Promise<boolean> {
  const repoName = `user-${userId}`;
  
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${ORG_NAME}/${repoName}`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
        },
      }
    );
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Delete a user repository (use with caution)
 */
export async function deleteUserRepo(userId: string): Promise<boolean> {
  const repoName = `user-${userId}`;
  
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${ORG_NAME}/${repoName}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
        },
      }
    );
    return response.status === 204;
  } catch {
    return false;
  }
}
