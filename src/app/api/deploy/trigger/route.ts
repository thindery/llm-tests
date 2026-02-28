/**
 * Manual Deployment Trigger API
 * Triggers a deployment for a specific site
 * 
 * POST /api/deploy/trigger
 * Body: { siteId: string, commitSha?: string }
 * Response: { success: boolean, deploymentId?: string, url?: string }
 */

import { triggerSiteDeploy, deployFromGit, getCustomDomainUrl } from '../../../../lib/vercel/deploy';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Handle OPTIONS request (CORS preflight)
 */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Handle GET request - health check
 */
export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: 'deploy-trigger',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  );
}

/**
 * Handle POST request - trigger deployment
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON body',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
    
    // Validate request body
    const requestBody = body as { siteId?: string; commitSha?: string; userId?: string };
    
    if (!requestBody.siteId || typeof requestBody.siteId !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required field: siteId',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
    
    // Optional: Validate user authentication
    // In production, you should verify the request is from an authorized user
    // const authHeader = request.headers.get('Authorization');
    // const userId = await verifyAuth(authHeader);
    
    const siteId = requestBody.siteId;
    const commitSha = requestBody.commitSha;
    
    console.log(`[DEPLOY] Triggering deployment for site ${siteId}${commitSha ? ` at commit ${commitSha}` : ''}`);
    
    // Trigger deployment
    const result = await triggerSiteDeploy(siteId, commitSha);
    
    if (result.success) {
      console.log(`[DEPLOY] Deployment triggered successfully: ${result.deploymentId}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          deploymentId: result.deploymentId,
          releaseId: result.releaseId,
          url: result.url,
          message: 'Deployment triggered successfully',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    } else {
      console.error(`[DEPLOY] Deployment failed: ${result.error}`);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || 'Deployment failed',
          releaseId: result.releaseId,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  } catch (error) {
    console.error('[DEPLOY] Unhandled error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}
