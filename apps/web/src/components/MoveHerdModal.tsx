'use client';

/**
 * @fileoverview MoveHerdModal — move a herd to a different pasture.
 *
 * Excludes the current pasture from destination options.
 * Appends a Movement record and resets the herd's entryDate.
 */

import { useState } from 'react';
import { useFarmData } from '@/lib/FarmDataContext';
import { moveHerd } from '@/lib/farm-store';

export interface MoveHerdModalProps {
  herdId: string;
  herdName: string;
  currentPastureId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function MoveHerdModal({
  herdId,
  herdName,
  currentPastureId,
  onClose,
  onSaved,
}: MoveHerdModalProps) {
  const { PASTURES } = useFarmData();
  const today = new Date().toISOString().slice(0, 10);

  const destinations = PASTURES.filter((p) => p.id !== currentPastureId);

  const [toPastureId, setToPastureId] = useState(destinations[0]?.id ?? '');
  const [date, setDate] = useState(today);
  const [movedBy, setMovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isValid = toPastureId.length > 0 && date.length > 0 && movedBy.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);

    const result = moveHerd(herdId, {
      toPastureId,
      movedAt: new Date(date),
      movedBy: movedBy.trim(),
      notes: notes.trim() || undefined,
    });

    setSaving(false);

    if (!result) {
      setError('No se pudo registrar el movimiento. Verificá la configuración del campo.');
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mhm-title"
        className="w-full max-w-sm rounded-2xl border border-surface2 shadow-2xl"
        style={{ backgroundColor: '#1A1A1B' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface2">
          <div>
            <p id="mhm-title" className="text-white font-bold text-base leading-tight">
              Mover hacienda
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
          {/* Destination pasture */}
          <div className="space-y-1.5">
            <label htmlFor="mhm-dest" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Potrero destino
            </label>
            {destinations.length === 0 ? (
              <p className="text-muted text-sm italic">
                No hay otros potreros disponibles. Agregá más potreros desde el mapa.
              </p>
            ) : (
              <select
                id="mhm-dest"
                value={toPastureId}
                onChange={(e) => setToPastureId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
                style={{ backgroundColor: '#0A0A0B' }}
              >
                {destinations.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Move date */}
          <div className="space-y-1.5">
            <label htmlFor="mhm-date" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Fecha de movimiento
            </label>
            <input
              id="mhm-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Moved by */}
          <div className="space-y-1.5">
            <label htmlFor="mhm-by" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Movido por
            </label>
            <input
              id="mhm-by"
              type="text"
              placeholder="Nombre del responsable"
              value={movedBy}
              onChange={(e) => setMovedBy(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="mhm-notes" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Observaciones
            </label>
            <textarea
              id="mhm-notes"
              rows={2}
              placeholder="Rotación programada, sobrecarga, etc."
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
              disabled={!isValid || saving || destinations.length === 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all"
              style={{
                backgroundColor: isValid && !saving ? '#DEFF9A' : '#2A2A2B',
                color: isValid && !saving ? '#0A0A0B' : '#6A6A6B',
                cursor: isValid && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Moviendo…' : 'Mover hacienda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
