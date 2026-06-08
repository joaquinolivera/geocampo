/**
 * @fileoverview /api/embed — server-side embedding ingestion (Phase J)
 *
 * Accepts a text chunk + metadata, embeds it via OpenAI, and upserts into
 * the farm_embeddings table in Supabase.
 *
 * Called by ingestEmbedding() in /lib/embeddings.ts after data mutations.
 *
 * Required env:
 *   OPENAI_API_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { IS_DEMO_MODE, SUPABASE_URL } from '@/lib/supabase';

const OPENAI_KEY    = process.env.OPENAI_API_KEY ?? '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const EMBED_MODEL   = 'text-embedding-3-small';

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE || !OPENAI_KEY || !SERVICE_KEY) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const { farmId, type, refId, content } = await req.json() as {
    farmId: string; type: string; refId: string; content: string;
  };

  if (!farmId || !content) {
    return NextResponse.json({ error: 'Missing farmId or content' }, { status: 400 });
  }

  // 1. Generate embedding
  const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: EMBED_MODEL, input: content }),
  });
  if (!embedRes.ok) {
    return NextResponse.json({ error: 'Embedding API failed' }, { status: 502 });
  }
  const embedJson = await embedRes.json() as { data: { embedding: number[] }[] };
  const embedding = embedJson.data[0].embedding;

  // 2. Upsert into farm_embeddings
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/farm_embeddings`, {
    method:  'POST',
    headers: {
      'apikey':         SERVICE_KEY,
      'Authorization':  `Bearer ${SERVICE_KEY}`,
      'Content-Type':   'application/json',
      'Prefer':         'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      farm_id:   farmId,
      type,
      ref_id:    refId,
      content,
      embedding: '[' + embedding.join(',') + ']',
      metadata:  {},
    }),
  });

  if (!upsertRes.ok) {
    const text = await upsertRes.text();
    return NextResponse.json({ error: text }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
