/**
 * Stripe Customer Portal API Route
 * Creates Stripe customer portal sessions for managing subscriptions
 * 
 * POST /api/stripe/customer-portal
 * Body: { customerId: string }
 * Response: { url: string }
 */

import {
  stripe,
  STRIPE_CONFIG,
} from '../../../../lib/stripe';

export interface CustomerPortalRequest {
  customerId: string;
  returnUrl?: string;
}

export interface CustomerPortalResponse {
  url: string;
}

export interface CustomerPortalError {
  error: string;
  statusCode: number;
}

/**
 * Create customer portal session handler
 */
export async function createCustomerPortalHandler(
  request: CustomerPortalRequest
): Promise<CustomerPortalResponse> {
  const { customerId, returnUrl } = request;

  if (!customerId) {
    throw new Error('customerId is required');
  }

  try {
    // Verify the customer exists in Stripe
    const customer = await stripe.customers.retrieve(customerId);

    if (!customer || customer.deleted) {
      throw new Error('Customer not found');
    }

    // Get config values from environment
    // @ts-expect-error - Vite provides import.meta.env
    const appUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) || process.env.VITE_APP_URL || 'http://localhost:5173';
    // @ts-expect-error - Vite provides import.meta.env
    const productId = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PRODUCT_ID) || process.env.VITE_STRIPE_PRODUCT_ID || '';

    // Set up configuration for the portal
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription',
        privacy_policy_url: `${appUrl}/privacy`,
        terms_of_service_url: `${appUrl}/terms`,
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'tax_id'],
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price'],
          products: [
            {
              product: productId,
              prices: [STRIPE_CONFIG.PRICE_ID],
            },
          ],
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        invoice_history: {
          enabled: true,
        },
      },
    });

    // Create portal session with the configuration
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      configuration: configuration.id,
      return_url: returnUrl || STRIPE_CONFIG.SUCCESS_URL,
    });

    if (!session.url) {
      throw new Error('Failed to create portal session URL');
    }

    return {
      url: session.url,
    };
  } catch (error) {
    console.error('Customer portal creation failed:', error);
    throw error;
  }
}

/**
 * Express-style handler
 */
export async function customerPortalRouteHandler(req: any, res: any): Promise<void> {
  try {
    const request: CustomerPortalRequest = req.body;
    
    if (!request.customerId) {
      res.status(400).json({ 
        error: 'customerId is required', 
        statusCode: 400 
      } as CustomerPortalError);
      return;
    }

    const response = await createCustomerPortalHandler(request);
    res.json(response);
  } catch (error) {
    console.error('Customer portal error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ 
      error: message, 
      statusCode: 500 
    } as CustomerPortalError);
  }
}

/**
 * Fetch API handler (for Vite/React)
 */
export async function customerPortalFetchHandler(request: Request): Promise<Response> {
  try {
    const body: CustomerPortalRequest = await request.json();
    
    if (!body.customerId) {
      return new Response(
        JSON.stringify({ 
          error: 'customerId is required', 
          statusCode: 400 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await createCustomerPortalHandler(body);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Customer portal error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message, statusCode: 500 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
