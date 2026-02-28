/**
 * Stripe Webhook API Route
 * Handles Stripe webhook events for subscription lifecycle
 * 
 * POST /api/stripe/webhook
 * Headers: Stripe-Signature
 * Body: Raw Stripe event payload
 */

import Stripe from 'stripe';
import {
  stripe,
  verifyWebhookSignature,
  SubscriptionStatus,
  UserSubscription,
} from '../../../../lib/stripe';

// Webhook event types we handle
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'checkout.session.expired'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.paused'
  | 'customer.subscription.resumed'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'invoice.paid'
  | 'invoice.payment_action_required'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed';

export interface WebhookResponse {
  received: boolean;
  event?: string;
}

export interface WebhookError {
  error: string;
  statusCode: number;
}

/**
 * Update user subscription in database
 * This is a placeholder - implement with your actual database
 */
async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<void> {
  // TODO: Implement database update
  // Example with Supabase:
  // await supabase
  //   .from('subscriptions')
  //   .upsert({
  //     user_id: userId,
  //     stripe_customer_id: subscriptionData.stripeCustomerId,
  //     stripe_subscription_id: subscriptionData.stripeSubscriptionId,
  //     status: subscriptionData.status,
  //     price_id: subscriptionData.priceId,
  //     current_period_end: subscriptionData.currentPeriodEnd,
  //     cancel_at_period_end: subscriptionData.cancelAtPeriodEnd,
  //     updated_at: new Date().toISOString(),
  //   });

  console.log('Updating subscription for user:', userId, subscriptionData);
}

/**
 * Get user ID by Stripe customer ID
 * This is a placeholder - implement with your actual database
 */
async function getUserIdByCustomerId(customerId: string): Promise<string | null> {
  // TODO: Implement database lookup
  // Example with Supabase:
  // const { data } = await supabase
  //   .from('subscriptions')
  //   .select('user_id')
  //   .eq('stripe_customer_id', customerId)
  //   .single();
  // return data?.user_id;

  console.log('Looking up user by customer ID:', customerId);
  return null;
}

/**
 * Create new subscription record
 */
async function createSubscription(
  customerId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await getUserIdByCustomerId(customerId);
  
  if (!userId) {
    console.warn('No user found for customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id || null;
  
  await updateUserSubscription(userId, {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status as SubscriptionStatus,
    priceId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Update existing subscription
 */
async function updateSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = await getUserIdByCustomerId(subscription.customer as string);
  
  if (!userId) {
    console.warn('No user found for subscription:', subscription.id);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id || null;

  await updateUserSubscription(userId, {
    status: subscription.status as SubscriptionStatus,
    priceId,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete/cancel subscription
 */
async function deleteSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId = await getUserIdByCustomerId(subscription.customer as string);
  
  if (!userId) {
    console.warn('No user found for subscription:', subscription.id);
    return;
  }

  await updateUserSubscription(userId, {
    status: 'canceled' as SubscriptionStatus,
    stripeSubscriptionId: null,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('Checkout session completed:', session.id);

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.warn('Missing customer or subscription ID');
    return;
  }

  // Fetch the subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  await createSubscription(customerId, subscription);
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription created:', subscription.id);
  
  const customerId = subscription.customer as string;
  await createSubscription(customerId, subscription);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription updated:', subscription.id);
  await updateSubscription(subscription);
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('Subscription deleted:', subscription.id);
  await deleteSubscription(subscription);
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice
): Promise<void> {
  console.log('Invoice payment succeeded:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await updateSubscription(subscription);
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  console.log('Invoice payment failed:', invoice.id);
  
  const subscriptionId = invoice.subscription as string;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await updateSubscription(subscription);
  }
}

/**
 * Process Stripe webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<WebhookResponse> {
  const eventType = event.type as StripeWebhookEvent;

  console.log('Processing webhook event:', eventType);

  try {
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired': {
        const expiredSession = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session expired:', expiredSession.id);
        break;
      }

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.paused':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.resumed':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
      case 'invoice.paid':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_action_required': {
        const invoiceAction = event.data.object as Stripe.Invoice;
        console.log('Payment action required:', invoiceAction.id);
        break;
      }

      default:
        console.log('Unhandled event type:', eventType);
    }

    return { received: true, event: eventType };
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}

/**
 * Express-style webhook handler
 */
export async function webhookRouteHandler(req: any, res: any): Promise<void> {
  const signature = req.headers['stripe-signature'];
  
  if (!signature) {
    res.status(400).json({ 
      error: 'Missing stripe-signature header', 
      statusCode: 400 
    } as WebhookError);
    return;
  }

  try {
    const event = verifyWebhookSignature(req.body, signature);
    const result = await processWebhookEvent(event);
    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    res.status(400).json({ 
      error: message, 
      statusCode: 400 
    } as WebhookError);
  }
}

/**
 * Fetch API webhook handler (for Vite/React)
 */
export async function webhookFetchHandler(request: Request): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response(
      JSON.stringify({ 
        error: 'Missing stripe-signature header', 
        statusCode: 400 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.text();
    const event = verifyWebhookSignature(body, signature);
    const result = await processWebhookEvent(event);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return new Response(
      JSON.stringify({ error: message, statusCode: 400 }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
