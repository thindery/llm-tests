/**
 * Stripe Checkout API Route
 * Handles creation of Stripe checkout sessions for subscription
 * 
 * POST /api/stripe/checkout
 * Body: { userId: string, email: string, name?: string }
 * Response: { sessionId: string, url: string }
 */

import {
  stripe,
  createStripeCustomer,
  STRIPE_CONFIG,
} from '../../../../lib/stripe';

export interface CheckoutRequest {
  userId: string;
  email: string;
  name?: string;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export interface CheckoutError {
  error: string;
  statusCode: number;
}

/**
 * Create checkout session handler
 */
export async function createCheckoutSessionHandler(
  request: CheckoutRequest
): Promise<CheckoutResponse> {
  const { userId, email, name } = request;

  if (!userId || !email) {
    throw new Error('userId and email are required');
  }

  if (!STRIPE_CONFIG.PRICE_ID) {
    throw new Error('Stripe price ID is not configured');
  }

  try {
    // Check if user already has a Stripe customer ID in database
    const existingCustomer = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customerId: string;
    
    if (existingCustomer.data.length > 0) {
      customerId = existingCustomer.data[0].id;
    } else {
      customerId = await createStripeCustomer(email, name);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: STRIPE_CONFIG.SUCCESS_URL,
      cancel_url: STRIPE_CONFIG.CANCEL_URL,
      subscription_data: {
        trial_period_days: 14,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: { enabled: true },
    });

    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    throw error;
  }
}

/**
 * Express-style handler
 */
export async function checkoutRouteHandler(req: any, res: any): Promise<void> {
  try {
    const request: CheckoutRequest = req.body;
    
    if (!request.userId || !request.email) {
      res.status(400).json({ 
        error: 'userId and email are required', 
        statusCode: 400 
      } as CheckoutError);
      return;
    }

    const response = await createCheckoutSessionHandler(request);
    res.json(response);
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ 
      error: message, 
      statusCode: 500 
    } as CheckoutError);
  }
}

/**
 * Fetch API handler (for Vite/React)
 */
export async function checkoutFetchHandler(request: Request): Promise<Response> {
  try {
    const body: CheckoutRequest = await request.json();
    
    if (!body.userId || !body.email) {
      return new Response(
        JSON.stringify({ 
          error: 'userId and email are required', 
          statusCode: 400 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = await createCheckoutSessionHandler(body);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message, statusCode: 500 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
