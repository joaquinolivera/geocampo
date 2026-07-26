/**
 * GET  /api/cattle?farm_id=...  — list all cattle for a farm
 * POST /api/cattle               — create a new animal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const farmId = req.nextUrl.searchParams.get('farm_id');
  if (!farmId) return NextResponse.json({ error: 'farm_id required' }, { status: 400 });

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data, error } = await client
    .from('cattle')
    .select(`
      id, farm_id, herd_id,
      visual_tag_id, chip_id,
      sex, breed, category, dob, status, notes,
      owner_name, color, origen, padre_vid, madre_vid,
      created_at, updated_at
    `)
    .eq('farm_id', farmId)
    .order('visual_tag_id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cattle: data ?? [] });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  const farmId = body.farm_id as string | undefined;
  if (!farmId) return NextResponse.json({ error: 'farm_id required' }, { status: 400 });
  if (!body.visual_tag_id && !body.chip_id) {
    return NextResponse.json({ error: 'visual_tag_id or chip_id required' }, { status: 400 });
  }

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data, error } = await client
    .from('cattle')
    .insert({
      farm_id:        farmId,
      herd_id:        (body.herd_id        as string | undefined) ?? null,
      visual_tag_id:  (body.visual_tag_id  as string | undefined) ?? null,
      chip_id:        (body.chip_id        as string | undefined) ?? null,
      species:        (body.species        as string | undefined) ?? 'bovino',
      sex:            (body.sex            as string | undefined) ?? null,
      breed:          (body.breed          as string | undefined) ?? null,
      category:       (body.category       as string | undefined) ?? null,
      sheep_category: (body.sheep_category as string | undefined) ?? null,
      dob:            (body.dob            as string | undefined) ?? null,
      notes:          (body.notes          as string | undefined) ?? null,
      owner_name:     (body.owner_name     as string | undefined) ?? null,
      color:          (body.color          as string | undefined) ?? null,
      origen:         (body.origen         as string | undefined) ?? null,
      padre_vid:      (body.padre_vid      as string | undefined) ?? null,
      madre_vid:      (body.madre_vid      as string | undefined) ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Un animal con ese chip ID ya existe en este campo.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If initial_weight_kg is provided, create the first weighing
  if (body.initial_weight_kg && data) {
    const weightKg = Number(body.initial_weight_kg);
    if (weightKg > 0) {
      await client.from('cattle_weights').insert({
        farm_id:   farmId,
        cattle_id: data.id,
        date:      (body.initial_weight_date as string | undefined) ?? new Date().toISOString().slice(0, 10),
        weight_kg: weightKg,
        notes:     'Peso inicial al registrar',
      });
    }
  }

  return NextResponse.json({ cattle: data }, { status: 201 });
}
