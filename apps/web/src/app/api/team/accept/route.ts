/**
 * POST /api/team/accept
 *
 * Accepts a team invitation by linking the authenticated user to the pending invite.
 * The token must match a row with accepted_at = null.
 *
 * Request body: { token: string }
 * Auth: Bearer token (must be logged in to accept)
 *
 * Response:
 *   200 { farmSlug: string, role: string }
 *   400 bad input / token already used / email mismatch
 *   401 not authenticated
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const bearerToken = authHeader.replace('Bearer ', '').trim();
  if (!bearerToken) {
    return NextResponse.json({ error: 'No auth token.' }, { status: 401 });
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authErr } = await service.auth.getUser(bearerToken);
  if (authErr || !user) {
    return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 });
  }

  const body = await req.json() as { token?: string };
  if (!body.token) {
    return NextResponse.json({ error: 'token is required.' }, { status: 400 });
  }

  // Find the pending invite
  const { data: invite, error: findErr } = await service
    .from('farm_members')
    .select('id, farm_id, email, role, accepted_at, farms(slug)')
    .eq('invitation_token', body.token)
    .maybeSingle();

  if (findErr || !invite) {
    return NextResponse.json({ error: 'Invalid or expired invitation.' }, { status: 400 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invitation already used.' }, { status: 400 });
  }

  // Ensure the email matches (if user signed up with a different address, block it)
  if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invitation was sent to ${invite.email}. Please sign in with that address.` },
      { status: 400 }
    );
  }

  // Link user_id + mark accepted
  const { error: updateErr } = await service
    .from('farm_members')
    .update({
      user_id:          user.id,
      accepted_at:      new Date().toISOString(),
      invitation_token: null, // consume token
    })
    .eq('id', invite.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const farmsRaw = invite.farms;
  const farm = (Array.isArray(farmsRaw) ? farmsRaw[0] : farmsRaw) as { slug: string } | null;
  return NextResponse.json({ farmSlug: farm?.slug ?? '', role: invite.role });
}
