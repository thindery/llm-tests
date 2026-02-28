/**
 * Vercel Deployment Handler
 * Handles deployment of sites from Git subdirectories
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Vercel API Configuration
const VERCEL_API_URL = 'https://api.vercel.com';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';

// Types
export interface Site {
  id: string;
  user_id: string;
  site_name: string;
  repo_name: string;
  subdirectory: string;
  project_id: string | null;
  custom_domain: string | null;
  status: 'inactive' | 'building' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

export interface SiteRelease {
  id: string;
  site_id: string;
  deployment_id: string | null;
  git_commit_sha: string | null;
  git_branch: string;
  git_repo: string | null;
  root_directory: string | null;
  url: string | null;
  custom_domain_url: string | null;
  status: 'pending' | 'building' | 'ready' | 'error' | 'canceled' | 'succeeded' | 'failed';
  error_message: string | null;
  created_at: string;
  deployed_at: string | null;
  version_tag: string | null;
  is_release: boolean;
  updated_at: string;
}

export interface DeployOptions {
  siteId: string;
  userId: string;
  siteName: string;
  repo: string;
  ref: string;
  rootDirectory: string;
  projectId?: string;
}

export interface VercelDeployResponse {
  id: string;
  url: string;
  readyState: 'INITIALIZING' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  meta?: {
    githubCommitSha?: string;
    githubCommitBranch?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface DeployResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
  releaseId?: string;
}

/**
 * Create Supabase client with service role for server-side operations
 */
function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a new release record in the database
 */
async function createRelease(
  supabase: SupabaseClient,
  options: DeployOptions
): Promise<string> {
  const { data, error } = await supabase
    .from('site_releases')
    .insert({
      site_id: options.siteId,
      git_branch: options.ref,
      git_repo: options.repo,
      root_directory: options.rootDirectory,
      status: 'building',
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create release: ${error.message}`);
  }
  
  return data.id;
}

/**
 * Update release status in database
 */
async function updateRelease(
  supabase: SupabaseClient,
  releaseId: string,
  updates: Partial<SiteRelease>
): Promise<void> {
  const { error } = await supabase
    .from('site_releases')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', releaseId);
  
  if (error) {
    console.error('Failed to update release:', error);
  }
}

/**
 * Deploy a site to Vercel from a Git subdirectory
 */
export async function deployFromGit(options: DeployOptions): Promise<DeployResult> {
  const supabase = createSupabaseClient();
  
  try {
    // Create release record
    const releaseId = await createRelease(supabase, options);
    
    // Call Vercel API
    const deployPayload = {
      gitSource: {
        type: 'github',
        repo: options.repo,
        ref: options.ref,
      },
      rootDirectory: options.rootDirectory,
      ...(options.projectId && { projectId: options.projectId }),
      target: 'production',
    };
    
    const response = await fetch(`${VERCEL_API_URL}/v13/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deployPayload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || `Vercel API error: ${response.status}`;
      
      await updateRelease(supabase, releaseId, {
        status: 'error',
        error_message: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
        releaseId,
      };
    }
    
    const deployData: VercelDeployResponse = await response.json();
    
    // Map Vercel status to our status
    const statusMap: Record<string, SiteRelease['status']> = {
      'INITIALIZING': 'building',
      'BUILDING': 'building',
      'READY': 'succeeded',
      'ERROR': 'error',
      'CANCELED': 'canceled',
    };
    
    // Update release with deployment info
    await updateRelease(supabase, releaseId, {
      deployment_id: deployData.id,
      url: deployData.url,
      git_commit_sha: deployData.meta?.githubCommitSha || null,
      status: statusMap[deployData.readyState] || 'building',
      deployed_at: deployData.readyState === 'READY' ? new Date().toISOString() : null,
    });
    
    return {
      success: deployData.readyState === 'READY',
      deploymentId: deployData.id,
      url: deployData.url,
      releaseId,
    };
  } catch (error) {
    console.error('Deployment failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger a deployment for an existing site
 */
export async function triggerSiteDeploy(
  siteId: string,
  commitSha?: string
): Promise<DeployResult> {
  const supabase = createSupabaseClient();
  
  // Get site configuration
  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single();
  
  if (error || !site) {
    return {
      success: false,
      error: `Site not found: ${error?.message || 'Unknown error'}`,
    };
  }
  
  // Determine ref - use commit if provided, default to main
  const ref = commitSha || 'main';
  const rootDirectory = site.subdirectory || `sites/${site.site_name}`;
  
  return deployFromGit({
    siteId: site.id,
    userId: site.user_id,
    siteName: site.site_name,
    repo: site.repo_name,
    ref,
    rootDirectory,
    projectId: site.project_id || undefined,
  });
}

/**
 * Get deployment status from Vercel and update database
 */
export async function syncDeploymentStatus(
  deploymentId: string
): Promise<DeployResult> {
  const supabase = createSupabaseClient();
  
  try {
    const response = await fetch(
      `${VERCEL_API_URL}/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch deployment: ${response.status}`,
      };
    }
    
    const deployData: VercelDeployResponse = await response.json();
    
    // Map Vercel status to our status
    const statusMap: Record<string, SiteRelease['status']> = {
      'INITIALIZING': 'building',
      'BUILDING': 'building',
      'READY': 'succeeded',
      'ERROR': 'error',
      'CANCELED': 'canceled',
    };
    
    // Find and update release
    const { data: release } = await supabase
      .from('site_releases')
      .select('id')
      .eq('deployment_id', deploymentId)
      .single();
    
    if (release) {
      await updateRelease(supabase, release.id, {
        status: statusMap[deployData.readyState] || 'building',
        deployed_at: deployData.readyState === 'READY' ? new Date().toISOString() : null,
        error_message: deployData.error?.message || null,
      });
    }
    
    return {
      success: deployData.readyState === 'READY',
      deploymentId: deployData.id,
      url: deployData.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}

/**
 * Rollback to a previous deployment
 */
export async function rollbackToRelease(
  releaseId: string
): Promise<DeployResult> {
  const supabase = createSupabaseClient();
  
  // Get the release details
  const { data: release, error } = await supabase
    .from('site_releases')
    .select('*, sites!inner(*)')
    .eq('id', releaseId)
    .single();
  
  if (error || !release) {
    return {
      success: false,
      error: `Release not found: ${error?.message || 'Unknown error'}`,
    };
  }
  
  if (!release.git_commit_sha) {
    return {
      success: false,
      error: 'Release does not have a commit SHA for rollback',
    };
  }
  
  // Trigger new deployment with the old commit
  return deployFromGit({
    siteId: release.sites.id,
    userId: release.sites.user_id,
    siteName: release.sites.site_name,
    repo: release.sites.repo_name,
    ref: release.git_commit_sha,
    rootDirectory: release.root_directory || `sites/${release.sites.site_name}`,
    projectId: release.sites.project_id || undefined,
  });
}

/**
 * Get custom domain URL for a site
 */
export function getCustomDomainUrl(siteName: string, userId: string): string {
  return `${siteName.toLowerCase()}-${userId}.agentpaige.com`;
}

/**
 * Create or update project configuration in Vercel
 */
export async function configureVercelProject(
  siteId: string,
  customDomain?: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  const supabase = createSupabaseClient();
  
  try {
    const { data: site, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single();
    
    if (error || !site) {
      return {
        success: false,
        error: `Site not found: ${error?.message}`,
      };
    }
    
    // Create project in Vercel
    const projectPayload = {
      name: `agentpaige-${site.user_id}-${site.site_name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      framework: 'nextjs',
      buildCommand: null,
      devCommand: null,
      installCommand: null,
      outputDirectory: null,
      rootDirectory: site.subdirectory || `sites/${site.site_name}`,
      ...(customDomain && {
        customDomains: [{ domain: customDomain }],
      }),
    };
    
    const response = await fetch(`${VERCEL_API_URL}/v10/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectPayload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || `Failed to create project: ${response.status}`,
      };
    }
    
    const project = await response.json();
    
    // Update site with project ID
    const { error: updateError } = await supabase
      .from('sites')
      .update({
        project_id: project.id,
        custom_domain: customDomain || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId);
    
    if (updateError) {
      console.error('Failed to update site:', updateError);
    }
    
    return {
      success: true,
      projectId: project.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Configuration failed',
    };
  }
}
