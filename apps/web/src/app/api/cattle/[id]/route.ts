/**
 * DELETE /api/cattle/[id] — hard delete an individual cattle record
 * PATCH  /api/cattle/[id] — update status (and optionally notes)
 *
 * RLS on the cattle table enforces:
 *   - member+ can read
 *   - employee+ can update
 *   - manager+ can delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { error } = await client
    .from('cattle')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  // Only allow safe field updates via this endpoint
  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes  !== undefined) updates.notes  = body.notes;
  if (body.herd_id !== undefined) updates.herd_id = body.herd_id;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('cattle')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cattle: data });
}
