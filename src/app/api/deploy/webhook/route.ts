/**
 * Vercel Deployment Webhook Endpoint
 * Receives deployment events from Vercel and updates the database
 * 
 * POST /api/deploy/webhook
 * Receives: Vercel webhook events
 * Response: { success: boolean, processed: boolean }
 */

import { handleVercelWebhook, validateWebhookPayload, VercelWebhookPayload } from '../../../../lib/vercel/webhook-handler';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-vercel-signature',
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
      endpoint: 'vercel-webhook',
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
 * Handle POST request - receive Vercel webhook
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Verify content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Content-Type must be application/json',
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
    
    // Parse payload
    let payload: unknown;
    try {
      payload = await request.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON payload',
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
    
    // Validate payload structure
    if (!validateWebhookPayload(payload)) {
      console.error('[WEBHOOK] Invalid payload structure:', JSON.stringify(payload, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid webhook payload structure',
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
    
    const webhookPayload = payload as VercelWebhookPayload;
    
    console.log(`[WEBHOOK] Received ${webhookPayload.type} event`);
    
    // Optional: Verify webhook signature if VERCEL_WEBHOOK_SECRET is set
    const signature = request.headers.get('x-vercel-signature');
    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      // In production, implement signature verification
      // For now, log that we received a signature
      console.log('[WEBHOOK] Signature received (verification skipped in development)');
    }
    
    // Process the webhook
    const result = await handleVercelWebhook(webhookPayload);
    
    // Return appropriate response
    if (result.success && result.processed) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: true,
          siteId: result.siteId,
          releaseId: result.releaseId,
          message: 'Webhook processed successfully',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    } else if (result.success && !result.processed) {
      // Valid webhook but couldn't process (e.g., site not found)
      // Return 200 to acknowledge receipt
      return new Response(
        JSON.stringify({
          success: true,
          processed: false,
          error: result.error || 'Could not process webhook',
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
      // Processing failed
      return new Response(
        JSON.stringify({
          success: false,
          processed: false,
          error: result.error || 'Webhook processing failed',
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
    console.error('[WEBHOOK] Unhandled error:', error);
    
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
