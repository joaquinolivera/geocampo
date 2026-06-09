/**
 * GET /api/export/sinip?farmId=...&herdId=...&format=csv|xml
 *
 * Exports cattle records in SENACSA-compliant format for SINIP submission.
 * - CSV: default, tab-separated, UTF-8 BOM for Excel compatibility
 * - XML: future use (structure follows SENACSA XML schema)
 *
 * Demo mode: reads from Supabase if configured, otherwise returns 501
 * (cattle data lives in localStorage on the client; use CattlePanel's
 * client-side export button for demo mode).
 *
 * Law: Paraguay Ley 7221/2023 + Resolución SENACSA 2103/2024
 * Chip standard: ISO 11784/11785 FDX-B
 */

import { NextRequest, NextResponse } from 'next/server';
import { IS_DEMO_MODE } from '@/lib/supabase';

const SINIP_CSV_HEADERS = [
  'numeroChip_DIOB',
  'caravanaVisual',
  'sexo',
  'raza',
  'fechaNacimiento',
  'estado',
  'nombreLote',
  'idLote',
  'nombreCampo',
  'idCampo',
  'fechaRegistro',
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const farmId  = searchParams.get('farmId');
  const herdId  = searchParams.get('herdId');
  const format  = (searchParams.get('format') ?? 'csv').toLowerCase();

  if (!farmId) {
    return NextResponse.json({ error: 'farmId is required' }, { status: 400 });
  }

  // Demo mode: client-side export is used instead
  if (IS_DEMO_MODE) {
    return NextResponse.json(
      { error: 'Demo mode: use the client-side SINIP export button in the CattlePanel.' },
      { status: 501 }
    );
  }

  try {
    // Production: query Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('cattle')
      .select(`
        id, chip_id, visual_tag_id, sex, breed, dob, status, created_at,
        herds ( id, name ),
        farms ( id, name )
      `)
      .eq('farm_id', farmId)
      .order('created_at');

    if (herdId) {
      query = query.eq('herd_id', herdId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (format === 'csv') {
      const rows: string[] = [
        // UTF-8 BOM for Excel
        '﻿' + SINIP_CSV_HEADERS.join('\t'),
      ];

      (data ?? []).forEach((row: Record<string, unknown>) => {
        const herd = row.herds as { id: string; name: string } | null;
        const farm = row.farms as { id: string; name: string } | null;
        rows.push([
          row.chip_id       ?? '',
          row.visual_tag_id ?? '',
          row.sex           ?? '',
          row.breed         ?? '',
          row.dob           ?? '',
          row.status        ?? '',
          herd?.name        ?? '',
          herd?.id          ?? '',
          farm?.name        ?? '',
          farm?.id          ?? '',
          (row.created_at as string)?.slice(0, 10) ?? '',
        ].map((v) => String(v).replace(/\t/g, ' ')).join('\t'));
      });

      const csv = rows.join('\r\n');
      const date = new Date().toISOString().slice(0, 10);
      const filename = `SINIP_${farmId.slice(0, 8)}_${date}.csv`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type':        'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control':       'no-store',
        },
      });
    }

    // JSON fallback
    return NextResponse.json({ cattle: data, count: data?.length ?? 0 });

  } catch (err) {
    console.error('[sinip-export]', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
