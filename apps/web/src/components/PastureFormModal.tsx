'use client';

/**
 * @fileoverview PastureFormModal — save a drawn polygon as a new pasture.
 *
 * Called after the user finishes drawing a polygon on the map.
 * Requires: name + carryingCapacity. Optional: grassType, waterSupply, notes.
 */

import { useState } from 'react';
import { pasturesDb } from '@/lib/db/pastures';
import type { GrassType, WaterSupplyType } from '@/lib/data';

const GRASS_OPTIONS: { value: GrassType; label: string }[] = [
  { value: 'natural',    label: 'Pastura natural' },
  { value: 'mejorado',   label: 'Campo mejorado' },
  { value: 'ryegrass',   label: 'Raigrás / Trébol' },
  { value: 'festuca',    label: 'Festuca / Trébol rojo' },
  { value: 'alfalfa',    label: 'Alfalfa' },
  { value: 'brachiaria', label: 'Brachiaria' },
  { value: 'sorgo',      label: 'Sorgo forrajero' },
  { value: 'maiz',       label: 'Maíz para silaje' },
  { value: 'otro',       label: 'Otro' },
];

const WATER_OPTIONS: { value: WaterSupplyType; label: string }[] = [
  { value: 'tajamar',  label: 'Tajamar / Represa' },
  { value: 'molino',   label: 'Molino de viento' },
  { value: 'bebedero', label: 'Bebedero' },
  { value: 'arroyo',   label: 'Arroyo' },
  { value: 'pozo',     label: 'Pozo' },
  { value: 'none',     label: 'Sin agua propia' },
];

export interface PastureFormModalProps {
  /** Closed ring of polygon coordinates from map drawing */
  coordinates: [number, number][][];
  /** Approximate area calculated from polygon (shown as hint) */
  estimatedAreaHa: number;
  /** Farm ID — required for Supabase insert in production */
  farmId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function PastureFormModal({
  coordinates,
  estimatedAreaHa,
  farmId,
  onClose,
  onSaved,
}: PastureFormModalProps) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [grassType, setGrassType] = useState<GrassType | ''>('');
  const [waterSupply, setWaterSupply] = useState<WaterSupplyType | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isValid = name.trim().length > 0 && Number(capacity) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);

    try {
      await pasturesDb.add(farmId, {
        name: name.trim(),
        carryingCapacity: Number(capacity),
        coordinates,
        grassType: grassType || undefined,
        waterSupply: waterSupply || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch {
      setError('No se pudo guardar el potrero. Verificá la configuración del campo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pfm-title"
        className="w-full max-w-sm rounded-2xl border border-surface2 shadow-2xl overflow-y-auto"
        style={{ backgroundColor: '#1A1A1B', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface2">
          <div>
            <p id="pfm-title" className="text-white font-bold text-base leading-tight">
              Nuevo potrero
            </p>
            <p className="text-muted text-xs mt-0.5">
              Área estimada: {estimatedAreaHa.toFixed(1)} ha
            </p>
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
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="pfm-name" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Nombre del potrero <span className="text-red-400">*</span>
            </label>
            <input
              id="pfm-name"
              type="text"
              placeholder="Ej: Potrero Norte, Lote 4…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Carrying capacity */}
          <div className="space-y-1.5">
            <label htmlFor="pfm-cap" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Capacidad (cabezas) <span className="text-red-400">*</span>
            </label>
            <input
              id="pfm-cap"
              type="number"
              min="1"
              placeholder="Ej: 30"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Grass type */}
          <div className="space-y-1.5">
            <label htmlFor="pfm-grass" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Tipo de pasto
            </label>
            <select
              id="pfm-grass"
              value={grassType}
              onChange={(e) => setGrassType(e.target.value as GrassType | '')}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B', color: grassType ? '#FFF' : '#6A6A6B' }}
            >
              <option value="">— Sin especificar —</option>
              {GRASS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Water supply */}
          <div className="space-y-1.5">
            <label htmlFor="pfm-water" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Fuente de agua
            </label>
            <select
              id="pfm-water"
              value={waterSupply}
              onChange={(e) => setWaterSupply(e.target.value as WaterSupplyType | '')}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B', color: waterSupply ? '#FFF' : '#6A6A6B' }}
            >
              <option value="">— Sin especificar —</option>
              {WATER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="pfm-notes" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Observaciones
            </label>
            <textarea
              id="pfm-notes"
              rows={2}
              placeholder="Notas sobre el potrero…"
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
              {saving ? 'Guardando…' : 'Guardar potrero'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
