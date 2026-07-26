/**
 * POST /api/herds — create a new herd in a pasture
 *
 * Body: {
 *   farm_id:     string   (required)
 *   pasture_id:  string   (required)
 *   name:        string   (required)
 *   species:     herd_species (default 'bovino')
 *   breed:       string
 *   cattle_count: number  (required, ≥ 1)
 *   entry_date:  ISO date string
 * }
 *
 * RLS: employee+ can insert herds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  const farmId    = body.farm_id    as string | undefined;
  const pastureId = body.pasture_id as string | undefined;
  const name      = (body.name as string | undefined)?.trim();

  if (!farmId)    return NextResponse.json({ error: 'farm_id required' },    { status: 400 });
  if (!pastureId) return NextResponse.json({ error: 'pasture_id required' }, { status: 400 });
  if (!name)      return NextResponse.json({ error: 'name required' },       { status: 400 });

  const cattleCount = Number(body.cattle_count ?? 0);
  if (cattleCount < 1) {
    return NextResponse.json({ error: 'cattle_count must be ≥ 1' }, { status: 400 });
  }

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data, error } = await client
    .from('herds')
    .insert({
      farm_id:      farmId,
      pasture_id:   pastureId,
      name,
      species:      (body.species as string | undefined) ?? 'bovino',
      breed:        (body.breed   as string | undefined) ?? null,
      cattle_count: cattleCount,
      entry_date:   (body.entry_date as string | undefined) ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ herd: data }, { status: 201 });
}

/**
 * PATCH /api/herds — update cattle_count (after individual animal add/remove)
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  const herdId = body.herd_id as string | undefined;
  if (!herdId) return NextResponse.json({ error: 'herd_id required' }, { status: 400 });

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const updates: Record<string, unknown> = {};
  if (body.cattle_count !== undefined) updates.cattle_count = Number(body.cattle_count);
  if (body.name         !== undefined) updates.name         = body.name;
  if (body.breed        !== undefined) updates.breed        = body.breed;
  if (body.pasture_id   !== undefined) updates.pasture_id   = body.pasture_id;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const { data, error } = await client
    .from('herds')
    .update(updates)
    .eq('id', herdId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ herd: data });
}
