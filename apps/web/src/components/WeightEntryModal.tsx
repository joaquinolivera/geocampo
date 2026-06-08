'use client';

/**
 * @fileoverview WeightEntryModal — record a new weigh-in for a herd.
 *
 * Opens as a centered modal overlay. Accepts:
 *   herdId    — which herd is being weighed
 *   herdName  — displayed in the title
 *   onClose   — called when user cancels or after successful save
 *   onSaved   — called after a successful save (triggers context refresh)
 */

import { useState } from 'react';
import { addWeightRecord } from '@/lib/farm-store';

export interface WeightEntryModalProps {
  herdId: string;
  herdName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function WeightEntryModal({
  herdId,
  herdName,
  onClose,
  onSaved,
}: WeightEntryModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [cattleCount, setCattleCount] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  const [weighedBy, setWeighedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const count = parseInt(cattleCount, 10);
  const weight = parseFloat(avgWeight);
  const isValid =
    date.length > 0 &&
    Number.isFinite(count) && count > 0 &&
    Number.isFinite(weight) && weight > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);

    const result = addWeightRecord(herdId, {
      cattleCount: count,
      averageWeightKg: weight,
      weighedAt: new Date(date),
      weighedBy: weighedBy.trim() || 'Usuario',
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (!result) {
      setError('No se encontró el campo. Completá la configuración inicial primero.');
      return;
    }

    onSaved();
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wei-title"
        className="w-full max-w-sm rounded-2xl border border-surface2 shadow-2xl"
        style={{ backgroundColor: '#1A1A1B' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface2">
          <div>
            <p id="wei-title" className="text-white font-bold text-base leading-tight">
              Registrar pesaje
            </p>
            <p className="text-muted text-xs mt-0.5">{herdName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-white transition-colors text-xl leading-none p-1"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="wei-date" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Fecha
            </label>
            <input
              id="wei-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Cattle count */}
          <div className="space-y-1.5">
            <label htmlFor="wei-count" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Cabezas pesadas
            </label>
            <input
              id="wei-count"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="35"
              value={cattleCount}
              onChange={(e) => setCattleCount(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Average weight */}
          <div className="space-y-1.5">
            <label htmlFor="wei-avg" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Peso promedio (kg)
            </label>
            <input
              id="wei-avg"
              type="number"
              inputMode="decimal"
              min={1}
              step="0.1"
              placeholder="320"
              value={avgWeight}
              onChange={(e) => setAvgWeight(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Preview total */}
          {isValid && (
            <div className="rounded-xl px-4 py-2.5 text-center" style={{ backgroundColor: '#DEFF9A15' }}>
              <p className="text-[#DEFF9A] text-sm font-medium">
                Total: {(count * weight).toLocaleString('es-PY')} kg
              </p>
            </div>
          )}

          {/* Weighed by */}
          <div className="space-y-1.5">
            <label htmlFor="wei-by" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Pesado por
            </label>
            <input
              id="wei-by"
              type="text"
              placeholder="Nombre del operador"
              value={weighedBy}
              onChange={(e) => setWeighedBy(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="wei-notes" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Observaciones
            </label>
            <textarea
              id="wei-notes"
              rows={2}
              placeholder="Post-destete, condición corporal 3..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors resize-none"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-xl px-4 py-2.5 text-sm text-red-300 border border-red-900"
              style={{ backgroundColor: '#FF000012' }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium text-muted border border-surface2 hover:text-white transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all"
              style={{
                backgroundColor: isValid && !saving ? '#DEFF9A' : '#2A2A2B',
                color: isValid && !saving ? '#0A0A0B' : '#6A6A6B',
                cursor: isValid && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Guardando…' : 'Guardar pesaje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
