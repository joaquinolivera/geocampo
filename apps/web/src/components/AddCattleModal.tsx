'use client';

/**
 * AddCattleModal — register an individual animal with optional DIOB chip ID.
 * Works in demo mode (localStorage) and production (Supabase).
 */

import { useState } from 'react';
import { addCattle } from '@/lib/farm-store';
import type { AddCattleInput, CattleSex } from '@geocampo/shared';

interface Props {
  herdId:   string;
  herdName: string;
  onClose:  () => void;
  onSaved:  () => void;
}

const SEX_OPTIONS: { value: CattleSex; label: string }[] = [
  { value: 'female',   label: '♀ Hembra' },
  { value: 'male',     label: '♂ Macho' },
  { value: 'castrated', label: '✂ Castrado' },
];

export default function AddCattleModal({ herdId, herdName, onClose, onSaved }: Props) {
  const [chipId,      setChipId]      = useState('');
  const [visualTagId, setVisualTagId] = useState('');
  const [sex,         setSex]         = useState<CattleSex | ''>('');
  const [breed,       setBreed]       = useState('');
  const [dob,         setDob]         = useState('');
  const [notes,       setNotes]       = useState('');
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!chipId && !visualTagId) {
      setError('Ingresá al menos el chip DIOB o el número de caravana.');
      return;
    }
    // Basic DIOB chip format validation (15 numeric digits)
    if (chipId && !/^\d{15}$/.test(chipId.replace(/\s/g, ''))) {
      setError('El chip DIOB debe tener 15 dígitos numéricos (ISO 11784/11785).');
      return;
    }
    setSaving(true);
    try {
      const input: AddCattleInput = {
        herdId,
        chipId:      chipId.replace(/\s/g, '') || undefined,
        visualTagId: visualTagId || undefined,
        sex:         sex as CattleSex || undefined,
        breed:       breed || undefined,
        dob:         dob ? new Date(dob) : undefined,
        notes:       notes || undefined,
      };
      addCattle(input);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none';
  const labelClass = 'block text-xs font-medium text-gray-400 mb-1';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000 }}
      className="flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 12, width: '100%', maxWidth: 460 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: 0 }}>Registrar animal</h3>
            <p style={{ color: '#888', fontSize: 12, margin: '2px 0 0' }}>Lote: {herdName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Chip ID */}
          <div style={{ marginBottom: 14 }}>
            <label className={labelClass}>
              Chip DIOB (ISO 11784/11785) <span style={{ color: '#888' }}>— 15 dígitos</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="982 000 123 456 789"
                value={chipId}
                onChange={(e) => setChipId(e.target.value)}
                maxLength={17}
                className={inputClass}
                style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
              />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>📡</span>
            </div>
            <p style={{ color: '#555', fontSize: 11, marginTop: 3 }}>Escaneá el microchip o ingresalo manualmente</p>
          </div>

          {/* Visual tag */}
          <div style={{ marginBottom: 14 }}>
            <label className={labelClass}>Caravana visual (oreja derecha)</label>
            <input
              type="text"
              placeholder="Ej: A-1042"
              value={visualTagId}
              onChange={(e) => setVisualTagId(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Sex + Breed row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className={labelClass}>Sexo</label>
              <select value={sex} onChange={(e) => setSex(e.target.value as CattleSex | '')} className={inputClass}>
                <option value="">— seleccionar —</option>
                {SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Raza</label>
              <input
                type="text"
                placeholder="Ej: Nelore, Brangus"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Date of birth */}
          <div style={{ marginBottom: 14 }}>
            <label className={labelClass}>Fecha de nacimiento</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label className={labelClass}>Notas</label>
            <textarea
              placeholder="Observaciones, marcas adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputClass}
              style={{ resize: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(255,68,68,0.15)', border: '1px solid #ff4444', borderRadius: 6, padding: '8px 12px', color: '#ff6666', fontSize: 12, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #444', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 6, background: saving ? '#555' : '#22c55e', color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              {saving ? 'Guardando...' : '💾 Registrar animal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
