/**
 * GET  /api/cattle/[id]/weights  — list weight records for an animal
 * POST /api/cattle/[id]/weights  — add a weighing (auto-calculates GMD + Frame Score BIF)
 *
 * Frame Score BIF formulas (Beef Improvement Federation):
 *   Females: FS = -11.7086 + 0.4723*HH - 0.0239*Age + 0.0000146*Age² + 0.0000759*HH*Age
 *   Males:   FS = -11.548  + 0.4878*HH - 0.0289*Age + 0.00001947*Age² + 0.0000334*HH*Age
 *   where HH = hip height in INCHES, Age = age in DAYS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase';

// ─── Frame Score BIF calculation ──────────────────────────────────────────────

function calcFrameScore(
  hipHeightCm: number,
  ageDays: number,
  sex: 'male' | 'female' | 'castrated',
): number | null {
  if (hipHeightCm <= 0 || ageDays <= 0) return null;

  // Convert cm → inches (1 inch = 2.54 cm)
  const HH = hipHeightCm / 2.54;
  const Age = ageDays;

  let fs: number;
  if (sex === 'female') {
    fs = -11.7086 + 0.4723 * HH - 0.0239 * Age + 0.0000146 * Age * Age + 0.0000759 * HH * Age;
  } else {
    // male or castrated use same male formula
    fs = -11.548 + 0.4878 * HH - 0.0289 * Age + 0.00001947 * Age * Age + 0.0000334 * HH * Age;
  }

  // Clamp to reasonable range and round to 2 decimals
  return Math.round(Math.max(1, Math.min(9, fs)) * 100) / 100;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { data, error } = await client
    .from('cattle_weights')
    .select('id, cattle_id, date, weight_kg, hip_height_cm, body_condition, gmd_kg_day, frame_score, notes, created_at')
    .eq('cattle_id', id)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weights: data ?? [] });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: cattleId } = await params;
  const body = await req.json() as Record<string, unknown>;

  const farmId  = body.farm_id  as string | undefined;
  const weightKg = Number(body.weight_kg);
  const dateStr  = body.date as string | undefined;

  if (!farmId)        return NextResponse.json({ error: 'farm_id required' }, { status: 400 });
  if (!weightKg || weightKg <= 0) return NextResponse.json({ error: 'weight_kg required' }, { status: 400 });
  if (!dateStr)       return NextResponse.json({ error: 'date required' }, { status: 400 });

  const client = await getServerClient();
  if (!client) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  // Fetch the animal to get sex + dob (needed for Frame Score)
  const { data: cattle } = await client
    .from('cattle')
    .select('id, sex, dob')
    .eq('id', cattleId)
    .eq('farm_id', farmId)
    .single();

  if (!cattle) return NextResponse.json({ error: 'Animal not found' }, { status: 404 });

  // Calculate GMD: compare to previous weighing
  const { data: prevWeights } = await client
    .from('cattle_weights')
    .select('date, weight_kg')
    .eq('cattle_id', cattleId)
    .lt('date', dateStr)
    .order('date', { ascending: false })
    .limit(1);

  let gmdKgDay: number | null = null;
  if (prevWeights && prevWeights.length > 0) {
    const prev = prevWeights[0];
    const daysDiff = (new Date(dateStr).getTime() - new Date(prev.date as string).getTime()) / 86_400_000;
    if (daysDiff > 0) {
      gmdKgDay = Math.round(((weightKg - Number(prev.weight_kg)) / daysDiff) * 1000) / 1000;
    }
  }

  // Calculate Frame Score BIF if hip height provided
  let frameScore: number | null = null;
  const hipHeightCm = body.hip_height_cm ? Number(body.hip_height_cm) : null;
  if (hipHeightCm && hipHeightCm > 0 && cattle.dob) {
    const ageDays = Math.round(
      (new Date(dateStr).getTime() - new Date(cattle.dob as string).getTime()) / 86_400_000
    );
    if (ageDays > 0) {
      frameScore = calcFrameScore(
        hipHeightCm,
        ageDays,
        (cattle.sex as 'male' | 'female' | 'castrated') ?? 'male',
      );
    }
  }

  const { data, error } = await client
    .from('cattle_weights')
    .insert({
      farm_id:       farmId,
      cattle_id:     cattleId,
      date:          dateStr,
      weight_kg:     weightKg,
      hip_height_cm: hipHeightCm ?? null,
      body_condition: body.body_condition ? Number(body.body_condition) : null,
      gmd_kg_day:    gmdKgDay,
      frame_score:   frameScore,
      notes:         (body.notes as string | undefined) ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weight: data }, { status: 201 });
}
