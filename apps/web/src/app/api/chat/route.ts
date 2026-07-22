/**
 * @fileoverview /api/chat — RAG-powered farm assistant (Phase J)
 *
 * Flow:
 *  1. Receive user message + farmId
 *  2. Embed the question via OpenAI text-embedding-3-small
 *  3. Query Supabase pgvector farm_embeddings for top-k similar chunks
 *  4. Build a context-enriched prompt and call gpt-4o-mini
 *  5. Stream the response back to the client
 *
 * Demo mode: returns a canned response explaining AI requires Supabase.
 *
 * Env vars needed (production only):
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL  (already present)
 *   SUPABASE_SERVICE_ROLE_KEY (server-only, not prefixed NEXT_PUBLIC_)
 */

import { NextRequest } from 'next/server';
import { IS_DEMO_MODE, SUPABASE_URL } from '@/lib/supabase';

const OPENAI_KEY     = process.env.OPENAI_API_KEY ?? '';
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL      = 'gpt-4o-mini';
const TOP_K           = 6;

// ─── Demo response ────────────────────────────────────────────────────────────

function demoStream(message: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const text = `Hola! Soy el asistente IA de GeoCampo. Para responder "${message}" necesito acceso a tu base de datos Supabase. Configurá OPENAI_API_KEY y SUPABASE_SERVICE_ROLE_KEY en tu .env.local para activar el asistente completo.`;
      const words = text.split(' ');
      let i = 0;
      const interval = setInterval(() => {
        if (i >= words.length) {
          controller.close();
          clearInterval(interval);
          return;
        }
        controller.enqueue(encoder.encode(words[i] + (i < words.length - 1 ? ' ' : '')));
        i++;
      }, 40);
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

// ─── Embed ────────────────────────────────────────────────────────────────────

async function embed(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const json = await res.json() as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

// ─── Retrieve context from pgvector ──────────────────────────────────────────

interface EmbeddingRow { content: string; metadata: Record<string, unknown>; }

async function retrieveContext(farmId: string, embedding: number[]): Promise<EmbeddingRow[]> {
  const vectorStr = '[' + embedding.join(',') + ']';
  // Call Supabase RPC using service role (bypasses RLS for server-side retrieval)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/match_farm_embeddings`,
    {
      method:  'POST',
      headers: {
        'apikey':        SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        p_farm_id:        farmId,
        p_query_embedding: vectorStr,
        p_match_count:    TOP_K,
        p_match_threshold: 0.6,
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json() as EmbeddingRow[];
  return data ?? [];
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(contextChunks: EmbeddingRow[]): string {
  const context = contextChunks.map((c, i) =>
    `[${i + 1}] ${c.content}`
  ).join('\n\n');

  return `Sos el asistente de GeoCampo, especializado en ganadería. Respondés en español rioplatense, de manera concisa y práctica. Basate únicamente en los datos de la estancia que se muestran a continuación. Si no tenés suficiente información, decilo claramente.

DATOS DE LA ESTANCIA:
${context || '(sin datos disponibles)'}

Reglas:
- Respondé con datos concretos cuando estén disponibles (nombres, números, fechas)
- Sugierí acciones cuando detectes problemas (sobrecarga, sanidad vencida, etc.)
- Nunca inventés datos que no aparezcan en el contexto
- Sé breve: máximo 3-4 oraciones salvo que se pida detalle`;
}

// ─── Chat completion (streaming) ──────────────────────────────────────────────

async function streamChat(systemPrompt: string, userMessage: string): Promise<Response> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model:    CHAT_MODEL,
      stream:   true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      max_tokens:  512,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

  // Transform OpenAI SSE stream → plain text stream
  const reader  = res.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { controller.close(); return; }
          try {
            const parsed = JSON.parse(data) as { choices: { delta: { content?: string } }[] };
            const token = parsed.choices[0]?.delta?.content;
            if (token) controller.enqueue(encoder.encode(token));
          } catch { /* ignore parse errors */ }
        }
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { message, farmId } = await req.json() as { message: string; farmId?: string };

  if (!message?.trim()) {
    return new Response('Missing message', { status: 400 });
  }

  // Demo mode: no OpenAI or Supabase configured
  if (IS_DEMO_MODE || !OPENAI_KEY || !SERVICE_KEY) {
    return demoStream(message);
  }

  try {
    const [embedding, ] = await Promise.all([
      embed(message),
    ]);

    const contextChunks = farmId
      ? await retrieveContext(farmId, embedding)
      : [];

    const systemPrompt = buildSystemPrompt(contextChunks);
    return await streamChat(systemPrompt, message);
  } catch (err) {
    const msg = (err as Error).message ?? 'Error desconocido';
    return new Response(`Error: ${msg}`, { status: 500 });
  }
}
