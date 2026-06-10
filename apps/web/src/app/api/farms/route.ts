/**
 * POST /api/farms
 *
 * Creates a farm + pastures + herds in Supabase for a logged-in user.
 * Uses the service_role key to bypass RLS (needed because the farm_members
 * row for the owner must be inserted before any RLS policy takes effect).
 *
 * Request body:
 *   { slug, name, pastures: PastureInput[], herds: HerdInput[] }
 *
 * Auth: Bearer token from the browser client (verified via auth.getUser).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL          = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface PastureBody {
  name:             string;
  coordinates?:     [number, number][][];
  center?:          [number, number];
  areaHectares?:    number;
  carryingCapacity?: number;
  grassType?:       string;
  waterSupply?:     string;
  notes?:           string;
  color?:           string;
}

interface HerdBody {
  name:         string;
  cattleCount?: number;
  breed?:       string;
  entryDate?:   string;
  pastureIndex: number; // index into the pastures array above
}

interface RequestBody {
  slug:     string;
  name:     string;
  pastures: PastureBody[];
  herds:    HerdBody[];
}

export async function POST(req: NextRequest) {
  // --- Auth: verify the bearer token ---
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/, '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use an anon client just to verify the token
  const anonClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // --- Parse body ---
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, name, pastures, herds } = body;
  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
  }

  // --- Service-role client (bypasses RLS) ---
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if user already has a farm (idempotent)
  const { data: existing } = await admin
    .from('farms')
    .select('id, slug')
    .eq('owner_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ farmId: existing.id, slug: existing.slug, existed: true });
  }

  // --- Insert farm ---
  // Generate a unique slug if there's a collision
  let finalSlug = slug;
  const { data: slugConflict } = await admin.from('farms').select('id').eq('slug', slug).single();
  if (slugConflict) {
    finalSlug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }

  const { data: farm, error: farmError } = await admin
    .from('farms')
    .insert({ slug: finalSlug, name, owner_id: user.id })
    .select('id')
    .single();

  if (farmError || !farm) {
    console.error('[api/farms] farm insert error:', farmError);
    return NextResponse.json({ error: farmError?.message ?? 'Farm insert failed' }, { status: 500 });
  }

  // --- Add owner to farm_members ---
  // accepted_at MUST be set — middleware's farm lookup filters .not('accepted_at', 'is', null)
  const ownerEmail = user.email ?? 'unknown@geocampo.app';
  await admin.from('farm_members').insert({
    farm_id:     farm.id,
    user_id:     user.id,
    role:        'owner',
    email:       ownerEmail,
    accepted_at: new Date().toISOString(),
  });

  // --- Insert pastures ---
  const pastureIds: (string | null)[] = [];
  for (const p of pastures) {
    // Build coordinates: use drawn polygon or generate a placeholder square
    const coords = p.coordinates ?? (p.center
      ? generateSquare(p.center, p.areaHectares ?? 10)
      : generateSquare([-58.5, -25.3], p.areaHectares ?? 10));

    const { data: pasture, error: pErr } = await admin
      .from('pastures')
      .insert({
        farm_id:          farm.id,
        name:             p.name,
        coordinates:      coords,
        area_hectares:    p.areaHectares ?? null,
        carrying_capacity: p.carryingCapacity ?? null,
        grass_type:       p.grassType ?? null,
        water_supply:     p.waterSupply ?? null,
        notes:            p.notes ?? null,
        color:            p.color ?? null,
      })
      .select('id')
      .single();

    if (pErr) console.error('[api/farms] pasture insert error:', pErr);
    pastureIds.push(pasture?.id ?? null);
  }

  // --- Insert herds ---
  for (const h of herds) {
    const pastureId = pastureIds[h.pastureIndex] ?? null;
    await admin.from('herds').insert({
      farm_id:      farm.id,
      pasture_id:   pastureId,
      name:         h.name,
      cattle_count: h.cattleCount ?? 0,
      breed:        h.breed ?? null,
      entry_date:   h.entryDate ?? null,
    });
  }

  return NextResponse.json({ farmId: farm.id, slug: finalSlug });
}

/** Generate a tiny square polygon around a center point (fallback when no polygon drawn). */
function generateSquare(
  center: [number, number],
  areaHa: number,
): [number, number][][] {
  const sideDeg = Math.sqrt(areaHa / 10000) * 0.009; // rough degree conversion
  const [lng, lat] = center;
  const ring: [number, number][] = [
    [lng - sideDeg, lat - sideDeg],
    [lng + sideDeg, lat - sideDeg],
    [lng + sideDeg, lat + sideDeg],
    [lng - sideDeg, lat + sideDeg],
    [lng - sideDeg, lat - sideDeg],
  ];
  return [ring];
}
