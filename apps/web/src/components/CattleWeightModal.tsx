'use client';

/**
 * CattleWeightModal — record a weighing for an individual animal.
 * Saves to /api/cattle/[id]/weights which auto-calculates:
 *   - GMD (Ganancia Media Diaria, kg/day)
 *   - Frame Score BIF (if hip height + DOB provided)
 */

import { useState } from 'react';
import type { CattleRecord } from '@/lib/FarmDataContext';

interface Props {
  cattle:  CattleRecord;
  farmId:  string;
  onClose: () => void;
  onSaved: () => void;
}

// Frame Score destination mapping
const FRAME_DESTINATION: Array<{ min: number; max: number; label: string; color: string }> = [
  { min: 1, max: 3,  label: 'Faena rápida / cría bajo requerimiento', color: '#f59e0b' },
  { min: 4, max: 5,  label: 'Flexible (cría / invernada)',            color: '#84cc16' },
  { min: 6, max: 7,  label: 'Invernada óptima / feedlot',            color: '#22c55e' },
  { min: 8, max: 9,  label: 'Reproductor potencial',                  color: '#3b82f6' },
];

function getFrameDestination(fs: number) {
  return FRAME_DESTINATION.find((r) => fs >= r.min && fs <= r.max);
}

// Client-side preview of Frame Score (same formula as server)
function previewFrameScore(hipCm: number, ageDays: number, sex: string): number | null {
  if (!hipCm || !ageDays) return null;
  const HH  = hipCm / 2.54;
  const Age = ageDays;
  let fs: number;
  if (sex === 'female') {
    fs = -11.7086 + 0.4723 * HH - 0.0239 * Age + 0.0000146 * Age * Age + 0.0000759 * HH * Age;
  } else {
    fs = -11.548  + 0.4878 * HH - 0.0289 * Age + 0.00001947 * Age * Age + 0.0000334 * HH * Age;
  }
  return Math.round(Math.max(1, Math.min(9, fs)) * 100) / 100;
}

export default function CattleWeightModal({ cattle, farmId, onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date,         setDate]         = useState(today);
  const [weightKg,     setWeightKg]     = useState('');
  const [hipHeightCm,  setHipHeightCm]  = useState('');
  const [bodyCondition, setBodyCondition] = useState('');
  const [notes,        setNotes]        = useState('');
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);

  // Live Frame Score preview
  const fsPreview: number | null = (() => {
    if (!hipHeightCm || !cattle.dob) return null;
    const ageDays = Math.round((new Date(date).getTime() - new Date(cattle.dob).getTime()) / 86_400_000);
    if (ageDays <= 0) return null;
    return previewFrameScore(Number(hipHeightCm), ageDays, cattle.sex ?? 'male');
  })();

  const fsDestination = fsPreview !== null ? getFrameDestination(fsPreview) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const kg = Number(weightKg);
    if (!kg || kg <= 0) { setError('Ingresá el peso en kg.'); return; }
    if (!date)          { setError('Ingresá la fecha del pesaje.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/cattle/${cattle.id}/weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id:       farmId,
          date,
          weight_kg:     kg,
          hip_height_cm: hipHeightCm ? Number(hipHeightCm) : undefined,
          body_condition: bodyCondition ? Number(bodyCondition) : undefined,
          notes:         notes || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `Error ${res.status}`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el pesaje.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-surface2 bg-surface px-3 py-2 text-sm text-white placeholder-muted focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30';
  const labelCls = 'block text-xs font-medium text-muted mb-1';

  const animalLabel = cattle.visualTagId
    ? `🏷 ${cattle.visualTagId}`
    : cattle.chipId
      ? `📡 ${cattle.chipId}`
      : 'Animal sin ID';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000 }}
      className="flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-surface2 overflow-hidden"
        style={{ backgroundColor: '#111112' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface2">
          <div>
            <h3 className="text-white font-semibold text-base">Registrar pesaje</h3>
            <p className="text-muted text-xs mt-0.5">{animalLabel} · {cattle.breed ?? ''} {cattle.category ?? ''}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Date + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Peso (kg) *</label>
              <input
                type="number"
                min="1"
                max="1500"
                step="0.5"
                placeholder="Ej: 320"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                autoFocus
                className={inputCls}
              />
            </div>
          </div>

          {/* Hip height + Body condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Altura cadera (cm)
                {!cattle.dob && <span className="text-muted/60 ml-1">(requiere DOB)</span>}
              </label>
              <input
                type="number"
                min="50"
                max="180"
                step="0.5"
                placeholder="Ej: 118"
                value={hipHeightCm}
                onChange={(e) => setHipHeightCm(e.target.value)}
                disabled={!cattle.dob}
                className={inputCls}
              />
              {!cattle.dob && (
                <p className="text-xs text-muted/60 mt-1">Requiere fecha de nacimiento para calcular Frame Score</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Condición corporal (1-9)</label>
              <select value={bodyCondition} onChange={(e) => setBodyCondition(e.target.value)} className={inputCls}>
                <option value="">— sin datos —</option>
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frame Score live preview */}
          {fsPreview !== null && (
            <div
              className="rounded-lg border px-4 py-3"
              style={{
                borderColor: `${fsDestination?.color ?? '#84cc16'}44`,
                backgroundColor: `${fsDestination?.color ?? '#84cc16'}11`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Frame Score BIF</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: fsDestination?.color ?? '#84cc16' }}
                >
                  {fsPreview.toFixed(1)}
                </span>
              </div>
              {fsDestination && (
                <p className="text-xs mt-1" style={{ color: fsDestination.color }}>
                  {fsDestination.label}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notas</label>
            <input
              type="text"
              placeholder="Observaciones del operario..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-critical/30 bg-critical/10 px-3 py-2">
              <p className="text-critical text-xs">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-surface2 text-muted text-sm hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl font-semibold text-sm text-charcoal disabled:opacity-60 hover:brightness-110 transition-all"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              {saving ? 'Guardando...' : '⚖ Guardar pesaje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
