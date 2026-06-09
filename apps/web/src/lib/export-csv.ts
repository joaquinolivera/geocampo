/**
 * @fileoverview Client-side CSV export helpers.
 *
 * All functions build a CSV string and trigger a browser download.
 * No server required — pure Blob + URL.createObjectURL.
 */

import type { WeightRecord, HealthRecord, Movement, Herd } from './data';

// ─── Generic download helper ──────────────────────────────────────────────────

function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v);
    // Wrap in quotes if value contains comma, newline, or quote
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-PY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function exportWeightsCsv(weights: WeightRecord[], herds: Herd[]): void {
  const herdMap = new Map(herds.map((h) => [h.id, h.name]));

  const rows: string[][] = [
    ['Fecha', 'Rodeo', 'Cabezas', 'Peso promedio (kg)', 'Peso total (kg)', 'Pesado por', 'Notas'],
    ...weights
      .slice()
      .sort((a, b) => a.weighedAt.getTime() - b.weighedAt.getTime())
      .map((w) => [
        fmtDate(w.weighedAt),
        herdMap.get(w.herdId) ?? w.herdId,
        String(w.cattleCount),
        w.averageWeightKg.toFixed(1),
        (w.cattleCount * w.averageWeightKg).toFixed(0),
        w.weighedBy ?? '',
        w.notes ?? '',
      ]),
  ];

  downloadCsv(`geocampo-pesajes-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportHealthCsv(records: HealthRecord[], herds: Herd[]): void {
  const herdMap = new Map(herds.map((h) => [h.id, h.name]));

  const TREATMENT_LABELS: Record<string, string> = {
    vaccination:  'Vacunación',
    deworming:    'Desparasitación',
    medication:   'Tratamiento / Medicación',
    checkup:      'Revisación',
    surgery:      'Cirugía',
    other:        'Otro',
  };

  const rows: string[][] = [
    ['Fecha', 'Rodeo', 'Tipo', 'Producto', 'Dosis', 'Aplicado por', 'Próximo vencimiento', 'Notas'],
    ...records
      .slice()
      .sort((a, b) => a.administeredAt.getTime() - b.administeredAt.getTime())
      .map((r) => [
        fmtDate(r.administeredAt),
        herdMap.get(r.herdId) ?? r.herdId,
        TREATMENT_LABELS[r.treatmentType] ?? r.treatmentType,
        r.productName ?? '',
        r.dosage ?? '',
        r.administeredBy ?? '',
        r.nextDueDate ? fmtDate(r.nextDueDate) : '',
        r.notes ?? '',
      ]),
  ];

  downloadCsv(`geocampo-sanidad-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function exportMovementsCsv(movements: Movement[]): void {
  const rows: string[][] = [
    ['Fecha', 'Rodeo', 'Desde', 'Hacia', 'Movido por', 'Notas'],
    ...movements
      .slice()
      .sort((a, b) => a.movedAt.getTime() - b.movedAt.getTime())
      .map((m) => [
        fmtDate(m.movedAt),
        m.herdName,
        m.fromPastureName ?? '—',
        m.toPastureName,
        m.movedBy ?? '',
        m.notes ?? '',
      ]),
  ];

  downloadCsv(`geocampo-movimientos-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}
