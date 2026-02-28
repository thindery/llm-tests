/**
 * Stripe Integration Library
 * Handles Stripe client initialization and subscription management
 */

import Stripe from 'stripe';

// Get environment variables (works with both Vite and Node)
const getEnv = (key: string, defaultValue: string = ''): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaEnv = (import.meta as any).env;
    if (typeof metaEnv !== 'undefined' && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch {
    // Fall through to process.env
  }
  return process.env[key] || defaultValue;
};

const getAppUrl = (): string => {
  return getEnv('VITE_APP_URL', 'http://localhost:5173');
};

// Stripe client initialization
export const stripe = new Stripe(getEnv('VITE_STRIPE_SECRET_KEY'), {
  apiVersion: '2024-06-20',
});

// Stripe configuration
export const STRIPE_CONFIG = {
  // Price ID for the $29/month subscription
  PRICE_ID: getEnv('VITE_STRIPE_PRICE_ID'),
  
  // Webhook secret for verifying webhook signatures
  WEBHOOK_SECRET: getEnv('VITE_STRIPE_WEBHOOK_SECRET'),
  
  // Success and cancel URLs for checkout
  SUCCESS_URL: getEnv('VITE_STRIPE_SUCCESS_URL', `${getAppUrl()}/settings?success=true`),
  CANCEL_URL: getEnv('VITE_STRIPE_CANCEL_URL', `${getAppUrl()}/settings?canceled=true`),
};

// Subscription status types
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'past_due' 
  | 'paused' 
  | 'trialing' 
  | 'unpaid';

// User subscription data type
export interface UserSubscription {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a Stripe customer
 */
export async function createStripeCustomer(email: string, name?: string): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name,
  });
  return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  successUrl: string = STRIPE_CONFIG.SUCCESS_URL,
  cancelUrl: string = STRIPE_CONFIG.CANCEL_URL
): Promise<Stripe.Checkout.Session> {
  if (!STRIPE_CONFIG.PRICE_ID) {
    throw new Error('STRIPE_PRICE_ID is not configured');
  }

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
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14, // 14-day free trial
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    automatic_tax: { enabled: true },
  });

  return session;
}

/**
 * Create a customer portal session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string = STRIPE_CONFIG.SUCCESS_URL
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!STRIPE_CONFIG.WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_CONFIG.WEBHOOK_SECRET
  );
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method'],
  });
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate a cancelled subscription (before period end)
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export default stripe;
