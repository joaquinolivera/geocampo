import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');
type StripeEvent        = { type: string; data: { object: Record<string, unknown> } };
type StripeSession      = { mode: string; customer: string | null; subscription: string | null; metadata: Record<string,string> | null };
type StripeSubscription = { id: string; status: string; metadata: Record<string,string>; trial_end: number | null; current_period_end: number };
type StripeInvoice      = { customer: string };
import { stripe, mapStripeStatus } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase';

// Disable Next.js body parsing — Stripe needs the raw body to verify the signature.
export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const sig       = req.headers.get('stripe-signature') ?? '';
  const secret    = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  const rawBody   = await req.text();

  // ── Verify signature ───────────────────────────────────────────────────
  let event: StripeEvent;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret) as unknown as StripeEvent;
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── Handle events ──────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── Checkout completed: subscription created ───────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as StripeSession;
        if (session.mode !== 'subscription') break;

        const farmId   = session.metadata?.farm_id;
        const plan     = session.metadata?.plan ?? 'starter';
        const subId    = session.subscription as string;

        if (!farmId) break;

        // Fetch full subscription to get trial end + period end
        const sub = await stripe.subscriptions.retrieve(subId) as unknown as StripeSubscription;

        await supabase.from('farms').update({
          stripe_customer_id:      session.customer,
          subscription_status:     mapStripeStatus(sub.status),
          subscription_plan:       plan,
          trial_ends_at:           sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', farmId);

        break;
      }

      // ── Subscription updated (renewal, upgrade, trial end, etc.) ──────
      case 'customer.subscription.updated': {
        const sub    = event.data.object as unknown as StripeSubscription;
        const farmId = sub.metadata?.farm_id;
        if (!farmId) break;

        await supabase.from('farms').update({
          subscription_status:     mapStripeStatus(sub.status),
          trial_ends_at:           sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', farmId);

        break;
      }

      // ── Subscription deleted (canceled) ───────────────────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as unknown as StripeSubscription;
        const farmId = sub.metadata?.farm_id;
        if (!farmId) break;

        await supabase.from('farms').update({
          subscription_status:     'canceled',
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', farmId);

        break;
      }

      // ── Invoice payment failed ─────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as unknown as StripeInvoice;
        const customerId = invoice.customer;

        await supabase.from('farms').update({
          subscription_status: 'past_due',
        }).eq('stripe_customer_id', customerId);

        break;
      }

      default:
        // Unhandled — fine, return 200 to avoid Stripe retries
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
