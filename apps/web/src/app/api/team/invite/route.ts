/**
 * POST /api/team/invite
 *
 * Sends a team invitation. The caller must be an owner of the farm.
 * Uses the service_role key to bypass RLS.
 *
 * Request body:
 *   { farmId: string, email: string, role: 'capataz' | 'empleado' }
 *
 * Response:
 *   200 { token: string }   — invitation created
 *   400 { error: string }   — bad input
 *   401 { error: string }   — not authenticated
 *   403 { error: string }   — not owner of farm
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 });
  }

  // Verify caller auth via bearer token
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return NextResponse.json({ error: 'No auth token.' }, { status: 401 });
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authErr } = await service.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 });
  }

  const body = await req.json() as { farmId?: string; email?: string; role?: string };
  const { farmId, email, role } = body;

  if (!farmId || !email || !role) {
    return NextResponse.json({ error: 'farmId, email, and role are required.' }, { status: 400 });
  }
  if (!['capataz', 'empleado', 'manager', 'employee', 'vet', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
  }

  // Verify caller is owner of this farm
  const { data: ownerRow } = await service
    .from('farm_members')
    .select('id')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .not('accepted_at', 'is', null)
    .maybeSingle();

  if (!ownerRow) {
    return NextResponse.json({ error: 'Only farm owners can invite members.' }, { status: 403 });
  }

  // Check for existing membership
  const { data: existing } = await service
    .from('farm_members')
    .select('id, accepted_at')
    .eq('farm_id', farmId)
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (existing?.accepted_at) {
    return NextResponse.json({ error: 'This user is already a member of the farm.' }, { status: 400 });
  }

  const invToken = crypto.randomBytes(32).toString('hex');
  const normalizedEmail = email.toLowerCase().trim();

  if (existing) {
    // Re-send: update the existing pending invite
    await service
      .from('farm_members')
      .update({
        role,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
        invitation_token: invToken,
      })
      .eq('id', existing.id);
  } else {
    // New invite: user_id left null until they accept
    const { error: insertErr } = await service.from('farm_members').insert({
      farm_id:          farmId,
      user_id:          null,
      email:            normalizedEmail,
      role,
      invited_by:       user.id,
      invited_at:       new Date().toISOString(),
      invitation_token: invToken,
    });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  // TODO: send email with invite link once email service is wired up
  // For now, return the token so the owner can share it manually.
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/join?token=${invToken}`;

  return NextResponse.json({ token: invToken, inviteUrl });
}
