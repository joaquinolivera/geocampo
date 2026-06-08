'use client';

/**
 * @fileoverview HealthEntryModal — record a vaccination, deworming, treatment or checkup.
 */

import { useState } from 'react';
import { addHealthRecord } from '@/lib/farm-store';

export type TreatmentType = 'vaccination' | 'deworming' | 'treatment' | 'checkup';

const TREATMENT_LABELS: Record<TreatmentType, string> = {
  vaccination: 'Vacunación',
  deworming:   'Desparasitación',
  treatment:   'Tratamiento',
  checkup:     'Control / Revisión',
};

export interface HealthEntryModalProps {
  herdId: string;
  herdName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function HealthEntryModal({
  herdId,
  herdName,
  onClose,
  onSaved,
}: HealthEntryModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [treatmentType, setTreatmentType] = useState<TreatmentType>('vaccination');
  const [date, setDate] = useState(today);
  const [productName, setProductName] = useState('');
  const [dosage, setDosage] = useState('');
  const [administeredBy, setAdministeredBy] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isValid = date.length > 0 && administeredBy.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);

    const result = addHealthRecord(herdId, {
      treatmentType,
      productName: productName.trim() || undefined,
      dosage: dosage.trim() || undefined,
      administeredBy: administeredBy.trim(),
      administeredAt: new Date(date),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hei-title"
        className="w-full max-w-sm rounded-2xl border border-surface2 shadow-2xl overflow-y-auto"
        style={{ backgroundColor: '#1A1A1B', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface2">
          <div>
            <p id="hei-title" className="text-white font-bold text-base leading-tight">
              Registrar sanidad
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
          {/* Treatment type */}
          <div className="space-y-1.5">
            <label htmlFor="hei-type" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Tipo de tratamiento
            </label>
            <select
              id="hei-type"
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value as TreatmentType)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            >
              {(Object.keys(TREATMENT_LABELS) as TreatmentType[]).map((t) => (
                <option key={t} value={t}>{TREATMENT_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="hei-date" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Fecha de aplicación
            </label>
            <input
              id="hei-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Product name */}
          <div className="space-y-1.5">
            <label htmlFor="hei-product" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Producto / Vacuna
            </label>
            <input
              id="hei-product"
              type="text"
              placeholder="Ej: Aftosa Triple, Ivermectina…"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Dosage */}
          <div className="space-y-1.5">
            <label htmlFor="hei-dosage" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Dosis
            </label>
            <input
              id="hei-dosage"
              type="text"
              placeholder="Ej: 2ml IM, 1ml/10kg SC…"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Administered by */}
          <div className="space-y-1.5">
            <label htmlFor="hei-by" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Aplicado por
            </label>
            <input
              id="hei-by"
              type="text"
              placeholder="Nombre del veterinario u operador"
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Next due date */}
          <div className="space-y-1.5">
            <label htmlFor="hei-next" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Próxima aplicación (opcional)
            </label>
            <input
              id="hei-next"
              type="date"
              value={nextDueDate}
              min={today}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="hei-notes" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Observaciones
            </label>
            <textarea
              id="hei-notes"
              rows={2}
              placeholder="Condición corporal, reacciones, lote afectado…"
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
              {saving ? 'Guardando…' : 'Guardar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
