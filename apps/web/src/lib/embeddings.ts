/**
 * @fileoverview Embedding ingestion helpers (Phase J)
 *
 * Converts farm data into text chunks and upserts them into farm_embeddings
 * via a Supabase Edge Function or RPC.
 *
 * In production, this is called:
 *   - After pasture/herd/health records are created or updated
 *   - On a nightly cron job to rebuild stale embeddings
 *
 * The actual embedding generation happens server-side (Edge Function or the
 * /api/embed route) so the OpenAI key stays server-only.
 *
 * For demo/development, this module is a no-op.
 */

import { IS_DEMO_MODE } from './supabase';
import type { Pasture } from './data';
import type { Herd } from './data';
import type { HealthRecord } from './data';

// ─── Text serializers ─────────────────────────────────────────────────────────

export function pastureToText(pasture: Pasture, herd?: Herd): string {
  const parts = [
    `Potrero: ${pasture.name}`,
    `Superficie: ${pasture.areaHectares.toFixed(1)} ha`,
    `Capacidad: ${pasture.carryingCapacity} cabezas`,
  ];
  if (pasture.grassType)   parts.push(`Tipo de pasto: ${pasture.grassType}`);
  if (pasture.waterSupply) parts.push(`Agua: ${pasture.waterSupply}`);
  if (herd) {
    parts.push(`Hacienda: ${herd.name} (${herd.cattleCount} cabezas de ${herd.breed})`);
    const pct = Math.round((herd.cattleCount / pasture.carryingCapacity) * 100);
    parts.push(`Carga: ${pct}% de la capacidad`);
  } else {
    parts.push('Hacienda: sin hacienda asignada');
  }
  if (pasture.notes) parts.push(`Notas: ${pasture.notes}`);
  return parts.join('\n');
}

export function herdToText(herd: Herd): string {
  const parts = [
    `Lote: ${herd.name}`,
    `Especie: ${herd.species ?? 'bovino'}`,
    `Raza: ${herd.breed}`,
    `Cantidad: ${herd.cattleCount} cabezas`,
    `Estado: ${herd.status}`,
    `Ingreso: ${herd.entryDate.toLocaleDateString('es-AR')}`,
  ];
  return parts.join('\n');
}

export function healthRecordToText(record: HealthRecord, herdName: string): string {
  const parts = [
    `Registro sanitario del lote: ${herdName}`,
    `Tipo: ${record.treatmentType}`,
    `Fecha: ${record.administeredAt.toLocaleDateString('es-AR')}`,
  ];
  if (record.productName) parts.push(`Producto: ${record.productName}`);
  if (record.dosage)      parts.push(`Dosis: ${record.dosage}`);
  if (record.administeredBy) parts.push(`Aplicado por: ${record.administeredBy}`);
  if (record.nextDueDate) parts.push(`Próxima fecha: ${(record.nextDueDate instanceof Date ? record.nextDueDate : new Date(record.nextDueDate as unknown as string)).toLocaleDateString('es-AR')}`);
  if (record.notes)       parts.push(`Notas: ${record.notes}`);
  return parts.join('\n');
}

// ─── Ingest call (POST to /api/embed) ────────────────────────────────────────

interface EmbedPayload {
  farmId:  string;
  type:    'pasture' | 'herd' | 'health';
  refId:   string;
  content: string;
}

/**
 * Sends a text chunk to the embedding endpoint.
 * Returns silently in demo mode.
 */
export async function ingestEmbedding(payload: EmbedPayload): Promise<void> {
  if (IS_DEMO_MODE) return;
  try {
    await fetch('/api/embed', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch {
    // Non-critical — log and continue
    console.warn('[embeddings] Failed to ingest embedding for', payload.type, payload.refId);
  }
}
