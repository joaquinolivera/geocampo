import Stripe from 'stripe';

// ─── Singleton client (server-only) ──────────────────────────────────────────

if (!process.env.STRIPE_SECRET_KEY) {
  // Warn at import time in development; in production this would throw at first use.
  console.warn('[stripe] STRIPE_SECRET_KEY is not set — Stripe features are disabled.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder', {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});

// ─── Price IDs ───────────────────────────────────────────────────────────────
// Set these in .env.local after creating products in the Stripe dashboard.

export const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro:     process.env.STRIPE_PRICE_PRO     ?? '',
};

// ─── Trial config ─────────────────────────────────────────────────────────────

export const TRIAL_DAYS = 14;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the existing Stripe customer for a farm, or creates one.
 * Stores the ID back on the farm row via the service-role client.
 */
export async function getOrCreateStripeCustomer(opts: {
  farmId:   string;
  email:    string;
  farmName: string;
  existingCustomerId?: string | null;
}): Promise<string> {
  if (opts.existingCustomerId) return opts.existingCustomerId;

  const customer = await stripe.customers.create({
    email: opts.email,
    name:  opts.farmName,
    metadata: { farm_id: opts.farmId },
  });

  // Persist to DB (fire-and-forget — webhook will also upsert)
  const { createServiceClient } = await import('@/lib/supabase');
  const supabase = createServiceClient();
  await supabase
    .from('farms')
    .update({ stripe_customer_id: customer.id })
    .eq('id', opts.farmId);

  return customer.id;
}

/**
 * Maps a Stripe subscription status to our internal status string.
 */
export function mapStripeStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    trialing:           'trialing',
    active:             'active',
    past_due:           'past_due',
    canceled:           'canceled',
    unpaid:             'past_due',
    incomplete:         'incomplete',
    incomplete_expired: 'canceled',
    paused:             'past_due',
  };
  return map[stripeStatus] ?? 'canceled';
}
