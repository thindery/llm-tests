/**
 * Vercel Webhook Handler
 * Processes deployment events from Vercel and updates the database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VercelDeployResponse } from './deploy';

// Vercel webhook event types
export type VercelEventType = 
  | 'deployment.created'
  | 'deployment.succeeded'
  | 'deployment.failed'
  | 'deployment.canceled'
  | 'deployment.ready'
  | 'deployment.error';

// Vercel webhook payload structure
export interface VercelWebhookPayload {
  id: string;
  type: VercelEventType;
  createdAt: number;
  payload: {
    deployment: VercelDeployResponse & {
      id: string;
      name: string;
      url: string;
      meta?: {
        githubCommitSha?: string;
        githubCommitBranch?: string;
        githubRepo?: string;
        githubOrg?: string;
      };
      project?: {
        id: string;
        name: string;
      };
      target?: string;
      creator?: {
        uid: string;
        username?: string;
      };
    };
    alias?: string[];
    user?: {
      id: string;
    };
    team?: {
      id: string;
    };
  };
}

// Database types
export interface Site {
  id: string;
  user_id: string;
  site_name: string;
  repo_name: string;
  subdirectory: string;
  project_id: string | null;
  custom_domain: string | null;
  status: 'inactive' | 'building' | 'ready' | 'error';
}

export interface SiteRelease {
  id: string;
  site_id: string;
  deployment_id: string | null;
  git_commit_sha: string | null;
  git_branch: string;
  status: 'pending' | 'building' | 'ready' | 'error' | 'canceled' | 'succeeded' | 'failed';
  custom_domain_url: string | null;
  updated_at?: string;
  deployed_at?: string;
  url?: string;
  error_message?: string;
}

// Webhook processing result
export interface WebhookResult {
  success: boolean;
  processed: boolean;
  siteId?: string;
  releaseId?: string;
  error?: string;
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
 * Verify Vercel webhook signature
 * (Optional - if using webhook verification)
 */
export function verifyWebhookSignature(
  _payload: string,
  _signature: string,
  _secret: string
): boolean {
  // In production, implement proper signature verification
  // Using crypto.verify with the Vercel webhook secret
  // For now, we trust the request (should be verified in production)
  return true;
}

/**
 * Find site by project ID or repo information
 */
async function findSite(
  supabase: SupabaseClient,
  deployment: VercelWebhookPayload['payload']['deployment']
): Promise<Site | null> {
  // Try to find by project ID first
  if (deployment.project?.id) {
    const { data: siteByProject } = await supabase
      .from('sites')
      .select('*')
      .eq('project_id', deployment.project.id)
      .single();
    
    if (siteByProject) {
      return siteByProject;
    }
  }
  
  // Try to find by repo information
  if (deployment.meta?.githubRepo) {
    const repo = deployment.meta.githubOrg 
      ? `${deployment.meta.githubOrg}/${deployment.meta.githubRepo}`
      : deployment.meta.githubRepo;
    
    const { data: sitesByRepo } = await supabase
      .from('sites')
      .select('*')
      .eq('repo_name', repo);
    
    if (sitesByRepo && sitesByRepo.length > 0) {
      // If multiple sites from same repo, check subdirectory
      // This is a simplified match - could be enhanced
      return sitesByRepo[0];
    }
  }
  
  return null;
}

/**
 * Map Vercel status to our status
 */
function mapVercelStatus(
  eventType: VercelEventType,
  readyState?: string
): SiteRelease['status'] {
  if (eventType === 'deployment.succeeded' || eventType === 'deployment.ready') {
    return 'succeeded';
  }
  if (eventType === 'deployment.failed' || eventType === 'deployment.error') {
    return 'failed';
  }
  if (eventType === 'deployment.canceled') {
    return 'canceled';
  }
  if (eventType === 'deployment.created') {
    return 'building';
  }
  
  // Fall back to readyState
  const statusMap: Record<string, SiteRelease['status']> = {
    'INITIALIZING': 'building',
    'BUILDING': 'building',
    'READY': 'succeeded',
    'ERROR': 'failed',
    'CANCELED': 'canceled',
  };
  
  return statusMap[readyState || ''] || 'building';
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(
  supabase: SupabaseClient,
  payload: VercelWebhookPayload,
  siteId: string | null,
  releaseId: string | null,
  processed: boolean = false,
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from('site_deployment_logs')
    .insert({
      site_id: siteId,
      release_id: releaseId,
      event_type: payload.type,
      vercel_payload: payload.payload as unknown as Record<string, unknown>,
      processed,
      error_message: errorMessage || null,
    });
  
  if (error) {
    console.error('Failed to log webhook event:', error);
  }
}

/**
 * Update release with webhook data
 */
async function updateReleaseFromWebhook(
  supabase: SupabaseClient,
  releaseId: string,
  deployment: VercelWebhookPayload['payload']['deployment'],
  eventType: VercelEventType
): Promise<void> {
  const status = mapVercelStatus(eventType, deployment.readyState);
  
  const updates: Partial<SiteRelease> = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  // Set deployed_at if succeeded
  if (status === 'succeeded' || status === 'ready') {
    updates.deployed_at = new Date().toISOString();
    updates.url = deployment.url;
  }
  
  // Set commit SHA from meta
  if (deployment.meta?.githubCommitSha) {
    updates.git_commit_sha = deployment.meta.githubCommitSha;
  }
  
  // Set branch from meta
  if (deployment.meta?.githubCommitBranch) {
    updates.git_branch = deployment.meta.githubCommitBranch;
  }
  
  // Set error message if failed
  if (status === 'error' || status === 'failed') {
    updates.error_message = deployment.error?.message || 'Deployment failed';
  }
  
  const { error } = await supabase
    .from('site_releases')
    .update(updates)
    .eq('id', releaseId);
  
  if (error) {
    throw new Error(`Failed to update release: ${error.message}`);
  }
}

/**
 * Create a new release from deployment.created event
 */
async function createReleaseFromWebhook(
  supabase: SupabaseClient,
  siteId: string,
  deployment: VercelWebhookPayload['payload']['deployment']
): Promise<string> {
  const { data, error } = await supabase
    .from('site_releases')
    .insert({
      site_id: siteId,
      deployment_id: deployment.id,
      git_commit_sha: deployment.meta?.githubCommitSha || null,
      git_branch: deployment.meta?.githubCommitBranch || 'main',
      git_repo: deployment.meta?.githubRepo 
        ? `${deployment.meta.githubOrg}/${deployment.meta.githubRepo}`.replace(/^\//, '')
        : null,
      status: 'building',
      url: deployment.url,
      custom_domain_url: null,
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create release from webhook: ${error.message}`);
  }
  
  return data.id;
}

/**
 * Update custom domain URL on deployment completion
 */
async function updateCustomDomainUrl(
  supabase: SupabaseClient,
  releaseId: string,
  site: Site,
  _deployment: VercelWebhookPayload['payload']['deployment']
): Promise<void> {
  if (site.custom_domain) {
    const customUrl = `https://${site.custom_domain}`;
    
    await supabase
      .from('site_releases')
      .update({ custom_domain_url: customUrl })
      .eq('id', releaseId);
  }
}

/**
 * Find or create release for this deployment
 */
async function findOrCreateRelease(
  supabase: SupabaseClient,
  siteId: string,
  deployment: VercelWebhookPayload['payload']['deployment'],
  eventType: VercelEventType
): Promise<string | null> {
  // For deployment.created, always create a new release
  if (eventType === 'deployment.created') {
    return createReleaseFromWebhook(supabase, siteId, deployment);
  }
  
  // For other events, try to find existing release
  if (deployment.id) {
    const { data: existingRelease } = await supabase
      .from('site_releases')
      .select('id')
      .eq('deployment_id', deployment.id)
      .single();
    
    if (existingRelease) {
      return existingRelease.id;
    }
  }
  
  // Try to find by commit SHA
  if (deployment.meta?.githubCommitSha) {
    const { data: releasesByCommit } = await supabase
      .from('site_releases')
      .select('id')
      .eq('site_id', siteId)
      .eq('git_commit_sha', deployment.meta.githubCommitSha)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (releasesByCommit && releasesByCommit.length > 0) {
      // Update with deployment ID
      await supabase
        .from('site_releases')
        .update({ deployment_id: deployment.id })
        .eq('id', releasesByCommit[0].id);
      
      return releasesByCommit[0].id;
    }
  }
  
  // If no existing release found, create one
  return createReleaseFromWebhook(supabase, siteId, deployment);
}

/**
 * Main webhook handler
 * Processes Vercel webhook events and updates database
 */
export async function handleVercelWebhook(
  webhookPayload: VercelWebhookPayload
): Promise<WebhookResult> {
  const supabase = createSupabaseClient();
  
  try {
    const { type, payload } = webhookPayload;
    const deployment = payload.deployment;
    
    console.log(`[WEBHOOK] Processing ${type} for deployment ${deployment.id}`);
    
    // Find associated site
    const site = await findSite(supabase, deployment);
    
    if (!site) {
      // Log as unprocessed - site not found
      await logWebhookEvent(supabase, webhookPayload, null, null, false, 'Site not found');
      
      return {
        success: true, // Webhook was valid, just couldn't process
        processed: false,
        error: 'Site not found for this deployment',
      };
    }
    
    // Find or create release
    const releaseId = await findOrCreateRelease(supabase, site.id, deployment, type);
    
    if (!releaseId) {
      await logWebhookEvent(supabase, webhookPayload, site.id, null, false, 'Could not find or create release');
      
      return {
        success: false,
        processed: false,
        siteId: site.id,
        error: 'Could not find or create release',
      };
    }
    
    // Update release status
    await updateReleaseFromWebhook(supabase, releaseId, deployment, type);
    
    // If deployment succeeded, update custom domain URL
    if (type === 'deployment.succeeded' || type === 'deployment.ready') {
      await updateCustomDomainUrl(supabase, releaseId, site, deployment);
    }
    
    // Log successful processing
    await logWebhookEvent(supabase, webhookPayload, site.id, releaseId, true);
    
    console.log(`[WEBHOOK] Successfully processed ${type} for site ${site.id}, release ${releaseId}`);
    
    return {
      success: true,
      processed: true,
      siteId: site.id,
      releaseId,
    };
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    
    // Log error
    await logWebhookEvent(
      supabase, 
      webhookPayload, 
      null, 
      null, 
      false, 
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return {
      success: false,
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate webhook payload structure
 */
export function validateWebhookPayload(payload: unknown): payload is VercelWebhookPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  
  const p = payload as Record<string, unknown>;
  
  // Check required fields
  if (typeof p.id !== 'string') return false;
  if (typeof p.type !== 'string') return false;
  if (typeof p.createdAt !== 'number') return false;
  if (typeof p.payload !== 'object' || p.payload === null) return false;
  
  // Check valid event types
  const validTypes: VercelEventType[] = [
    'deployment.created',
    'deployment.succeeded',
    'deployment.failed',
    'deployment.canceled',
    'deployment.ready',
    'deployment.error',
  ];
  
  if (!validTypes.includes(p.type as VercelEventType)) {
    return false;
  }
  
  return true;
}

/**
 * Get deployment logs for a site
 */
export async function getDeploymentLogs(
  siteId: string,
  limit: number = 20
): Promise<unknown[]> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('site_deployment_logs')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch logs: ${error.message}`);
  }
  
  return data || [];
}
