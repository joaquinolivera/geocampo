'use client';

/**
 * @fileoverview AddHerdModal — register a new herd in a pasture.
 *
 * Supports bovinos, ovinos, caprinos, equinos, porcinos, otro.
 * Required: name, species, breed, cattleCount, entryDate.
 */

import { useState } from 'react';
import { addHerd } from '@/lib/farm-store';
import type { HerdSpecies } from '@/lib/data';

const SPECIES_OPTIONS: { value: HerdSpecies; label: string; icon: string; breedPlaceholder: string }[] = [
  { value: 'bovino',  label: 'Bovinos',  icon: '🐄', breedPlaceholder: 'Ej: Hereford, Aberdeen Angus, Braford…' },
  { value: 'ovino',   label: 'Ovinos',   icon: '🐑', breedPlaceholder: 'Ej: Merino, Corriedale, Romney…' },
  { value: 'caprino', label: 'Caprinos', icon: '🐐', breedPlaceholder: 'Ej: Criolla, Angora, Nubian…' },
  { value: 'equino',  label: 'Equinos',  icon: '🐎', breedPlaceholder: 'Ej: Criollo, Cuarto de Milla, Pura Raza…' },
  { value: 'porcino', label: 'Porcinos', icon: '🐷', breedPlaceholder: 'Ej: Duroc, Yorkshire, Landrace…' },
  { value: 'otro',    label: 'Otro',     icon: '🐾', breedPlaceholder: 'Especie y raza…' },
];

const COUNT_LABEL: Record<HerdSpecies, string> = {
  bovino:  'Cabezas de ganado',
  ovino:   'Cabezas de ganado ovino',
  caprino: 'Cabezas de ganado caprino',
  equino:  'Animales',
  porcino: 'Animales',
  otro:    'Animales',
};

export interface AddHerdModalProps {
  pastureId: string;
  pastureName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddHerdModal({
  pastureId,
  pastureName,
  onClose,
  onSaved,
}: AddHerdModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [species, setSpecies] = useState<HerdSpecies>('bovino');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [cattleCount, setCattleCount] = useState('');
  const [entryDate, setEntryDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSpecies = SPECIES_OPTIONS.find((s) => s.value === species)!;
  const isValid =
    name.trim().length > 0 &&
    Number(cattleCount) > 0 &&
    breed.trim().length > 0 &&
    entryDate.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError(null);

    const result = addHerd({
      pastureId,
      name: name.trim(),
      cattleCount: Number(cattleCount),
      breed: breed.trim(),
      species,
      entryDate: new Date(entryDate),
    });

    setSaving(false);

    if (!result) {
      setError('No se encontró el potrero. Verificá la configuración del campo.');
      return;
    }

    onSaved();
    onClose();
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
        aria-labelledby="ahm-title"
        className="w-full max-w-sm rounded-2xl border border-surface2 shadow-2xl overflow-y-auto"
        style={{ backgroundColor: '#1A1A1B', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-surface2">
          <div>
            <p id="ahm-title" className="text-white font-bold text-base leading-tight">
              Agregar hacienda
            </p>
            <p className="text-muted text-xs mt-0.5">{pastureName}</p>
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
          {/* Species selector — pill buttons */}
          <div className="space-y-1.5">
            <label className="block text-muted text-xs font-medium uppercase tracking-wider">
              Especie
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SPECIES_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSpecies(opt.value)}
                  className="rounded-xl py-2 text-xs font-medium flex flex-col items-center gap-0.5 border transition-all"
                  style={{
                    backgroundColor: species === opt.value ? '#DEFF9A18' : '#0A0A0B',
                    borderColor: species === opt.value ? '#DEFF9A' : '#2A2A2B',
                    color: species === opt.value ? '#DEFF9A' : '#6A6A6B',
                  }}
                >
                  <span className="text-base">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lot name */}
          <div className="space-y-1.5">
            <label htmlFor="ahm-name" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Nombre del lote <span className="text-red-400">*</span>
            </label>
            <input
              id="ahm-name"
              type="text"
              placeholder={`Ej: ${selectedSpecies.icon} Lote Norte, Ovejas Lote A…`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Breed */}
          <div className="space-y-1.5">
            <label htmlFor="ahm-breed" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Raza <span className="text-red-400">*</span>
            </label>
            <input
              id="ahm-breed"
              type="text"
              placeholder={selectedSpecies.breedPlaceholder}
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Count */}
          <div className="space-y-1.5">
            <label htmlFor="ahm-count" className="block text-muted text-xs font-medium uppercase tracking-wider">
              {COUNT_LABEL[species]} <span className="text-red-400">*</span>
            </label>
            <input
              id="ahm-count"
              type="number"
              min="1"
              placeholder="Ej: 30"
              value={cattleCount}
              onChange={(e) => setCattleCount(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
              style={{ backgroundColor: '#0A0A0B' }}
            />
          </div>

          {/* Entry date */}
          <div className="space-y-1.5">
            <label htmlFor="ahm-date" className="block text-muted text-xs font-medium uppercase tracking-wider">
              Fecha de ingreso
            </label>
            <input
              id="ahm-date"
              type="date"
              value={entryDate}
              max={today}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-white text-sm outline-none border border-surface2 focus:border-lime-300 transition-colors"
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
              {saving ? 'Guardando…' : 'Agregar hacienda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
