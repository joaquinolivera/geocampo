import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS, TRIAL_DAYS, getOrCreateStripeCustomer } from '@/lib/stripe';
import { getServerClient } from '@/lib/supabase';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export async function POST(req: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const supabase = await getServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Body ───────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const plan: string = body.plan ?? 'starter';

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Unknown plan "${plan}". Valid: ${Object.keys(PRICE_IDS).join(', ')}` },
        { status: 400 },
      );
    }

    // ── Farm lookup ────────────────────────────────────────────────────────
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id, name, stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json({ error: 'No farm found for this user' }, { status: 404 });
    }

    // ── Stripe customer ────────────────────────────────────────────────────
    const customerId = await getOrCreateStripeCustomer({
      farmId:             farm.id,
      email:              user.email ?? '',
      farmName:           farm.name,
      existingCustomerId: farm.stripe_customer_id,
    });

    // ── Checkout session ───────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer:              customerId,
      payment_method_types:  ['card'],
      mode:                  'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          farm_id: farm.id,
          plan,
        },
      },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/dashboard?checkout=success`,
      cancel_url:  `${APP_URL}/billing?checkout=canceled`,
      metadata: {
        farm_id: farm.id,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[checkout] error', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
