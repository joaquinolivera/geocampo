'use client';

/**
 * AddCattleModal — register an individual animal (cattle OR sheep).
 * Saves to Supabase via /api/cattle (production) or localStorage (demo mode).
 * Fields adapt based on herdSpecies: bovino → cattle categories + DIOB chip
 *                                    ovino  → sheep categories + visual tag
 */

import { useState } from 'react';
import { IS_DEMO_MODE } from '@/lib/supabase';
import { addCattle } from '@/lib/farm-store';
import type { CattleSex } from '@geocampo/shared';
import type { HerdSpecies } from '@/lib/data';

interface Props {
  farmId:      string;
  herdId:      string;
  herdName:    string;
  herdSpecies: HerdSpecies;
  onClose:     () => void;
  onSaved:     () => void;
}

// ─── Cattle (bovino) categories ───────────────────────────────────────────────
const CATTLE_CATEGORY_OPTIONS = [
  { value: 'vaca',       label: 'Vaca (adulta, 3+ partos)' },
  { value: 'vaquillona', label: 'Vaquillona (1-2 partos o sin servicio)' },
  { value: 'ternera',    label: 'Ternera (hembra cría)' },
  { value: 'toro',       label: 'Toro (reproductor)' },
  { value: 'novillo',    label: 'Novillo (castrado, engorde)' },
  { value: 'ternero',    label: 'Ternero (macho cría)' },
  { value: 'torito',     label: 'Torito (macho joven < 2 años)' },
];

// ─── Sheep (ovino) categories ─────────────────────────────────────────────────
const SHEEP_CATEGORY_OPTIONS = [
  { value: 'oveja',    label: 'Oveja (hembra adulta)' },
  { value: 'carnero',  label: 'Carnero (reproductor)' },
  { value: 'borrega',  label: 'Borrega (hembra joven < 18 meses)' },
  { value: 'borrego',  label: 'Borrego (macho joven < 18 meses)' },
  { value: 'cordera',  label: 'Cordera (cordero hembra)' },
  { value: 'cordero',  label: 'Cordero (macho cría)' },
  { value: 'capon',    label: 'Capón (castrado, engorde)' },
];

const ORIGEN_OPTIONS = [
  { value: 'propio',   label: 'Propio (nacido en campo)' },
  { value: 'comprado', label: 'Comprado' },
  { value: 'donado',   label: 'Donado' },
];

// Species-specific labels
const SPECIES_CONFIG: Record<string, {
  icon:         string;
  animalLabel:  string;
  tagLabel:     string;
  tagPlaceholder: string;
  chipLabel:    string;
  chipNote:     string;
  categoryOptions: typeof CATTLE_CATEGORY_OPTIONS;
  isCattle:     boolean;
}> = {
  bovino: {
    icon:           '🐄',
    animalLabel:    'bovino',
    tagLabel:       'Caravana visual (VID)',
    tagPlaceholder: 'Ej: A-1042',
    chipLabel:      'Chip DIOB (IDE)',
    chipNote:       'ISO 11784/11785 — 15 dígitos',
    categoryOptions: CATTLE_CATEGORY_OPTIONS,
    isCattle:       true,
  },
  ovino: {
    icon:           '🐑',
    animalLabel:    'ovino',
    tagLabel:       'Caravana / Arete visual',
    tagPlaceholder: 'Ej: O-0021',
    chipLabel:      'Chip electrónico',
    chipNote:       'Opcional — 15 dígitos',
    categoryOptions: SHEEP_CATEGORY_OPTIONS,
    isCattle:       false,
  },
};

export default function AddCattleModal({ farmId, herdId, herdName, herdSpecies, onClose, onSaved }: Props) {
  const cfg = SPECIES_CONFIG[herdSpecies] ?? SPECIES_CONFIG.bovino;
  // Core identification
  const [visualTagId,   setVisualTagId]   = useState('');
  const [chipId,        setChipId]        = useState('');
  // Zootechnical
  const [sex,           setSex]           = useState<CattleSex | ''>('');
  const [category,      setCategory]      = useState('');
  const [breed,         setBreed]         = useState('');
  const [dob,           setDob]           = useState('');
  const [initialWeight, setInitialWeight] = useState('');
  // Administrative
  const [ownerName,     setOwnerName]     = useState('');
  const [color,         setColor]         = useState('');
  const [origen,        setOrigen]        = useState('');
  const [padreVid,      setPadreVid]      = useState('');
  const [madreVid,      setMadreVid]      = useState('');
  const [notes,         setNotes]         = useState('');
  // UI state
  const [showAdvanced,  setShowAdvanced]  = useState(false);
  const [error,         setError]         = useState('');
  const [saving,        setSaving]        = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const vid = visualTagId.trim();
    const chip = chipId.replace(/\s/g, '');

    if (!vid && !chip) {
      setError(`Ingresá al menos ${cfg.tagLabel.toLowerCase()} o el ${cfg.chipLabel.toLowerCase()}.`);
      return;
    }
    if (chip && !/^\d{15}$/.test(chip)) {
      setError(`El ${cfg.chipLabel.toLowerCase()} debe tener exactamente 15 dígitos numéricos.`);
      return;
    }

    setSaving(true);
    try {
      if (IS_DEMO_MODE) {
        // Demo: save to localStorage
        addCattle({
          herdId,
          chipId:      chip || undefined,
          visualTagId: vid || undefined,
          sex:         (sex as CattleSex) || undefined,
          breed:       breed || undefined,
          dob:         dob ? new Date(dob) : undefined,
          notes:       notes || undefined,
        });
        onSaved();
        onClose();
        return;
      }

      // Production: save to Supabase via API
      const res = await fetch('/api/cattle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farm_id:             farmId,
          herd_id:             herdId || undefined,
          visual_tag_id:       vid || undefined,
          chip_id:             chip || undefined,
          species:             herdSpecies,
          sex:                 sex || undefined,
          // bovino: use category; ovino: use sheep_category
          category:            cfg.isCattle  ? (category || undefined) : undefined,
          sheep_category:      !cfg.isCattle ? (category || undefined) : undefined,
          breed:               breed || undefined,
          dob:                 dob || undefined,
          initial_weight_kg:   initialWeight ? Number(initialWeight) : undefined,
          initial_weight_date: new Date().toISOString().slice(0, 10),
          owner_name:          ownerName || undefined,
          color:               color || undefined,
          origen:              origen || undefined,
          padre_vid:           padreVid.trim() || undefined,
          madre_vid:           madreVid.trim() || undefined,
          notes:               notes || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `Error ${res.status}`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-surface2 bg-surface px-3 py-2 text-sm text-white placeholder-muted focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30';
  const labelCls = 'block text-xs font-medium text-muted mb-1';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000 }}
      className="flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-surface2 overflow-hidden"
        style={{ backgroundColor: '#111112', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface2">
          <div>
            <h3 className="text-white font-semibold text-base">{cfg.icon} Registrar {cfg.animalLabel}</h3>
            <p className="text-muted text-xs mt-0.5">Lote: {herdName}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white text-2xl leading-none transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">

          {/* ── Identification ────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-lime/70 uppercase tracking-wide mb-3">Identificación</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{cfg.tagLabel} *</label>
                <input
                  type="text"
                  placeholder={cfg.tagPlaceholder}
                  value={visualTagId}
                  onChange={(e) => setVisualTagId(e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelCls}>{cfg.chipLabel}</label>
                <input
                  type="text"
                  placeholder={cfg.chipNote}
                  value={chipId}
                  onChange={(e) => setChipId(e.target.value)}
                  maxLength={17}
                  className={inputCls}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* ── Zootechnical ──────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-lime/70 uppercase tracking-wide mb-3">Datos zootécnicos</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Categoría *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">— seleccionar —</option>
                  {cfg.categoryOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Sexo</label>
                <select value={sex} onChange={(e) => setSex(e.target.value as CattleSex | '')} className={inputCls}>
                  <option value="">— seleccionar —</option>
                  <option value="female">♀ Hembra</option>
                  <option value="male">♂ Macho</option>
                  <option value="castrated">✂ Castrado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Raza</label>
                <input
                  type="text"
                  placeholder="Ej: Nelore, Brangus"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Peso inicial (kg)</label>
              <input
                type="number"
                min="1"
                max="1500"
                step="0.5"
                placeholder="Ej: 180"
                value={initialWeight}
                onChange={(e) => setInitialWeight(e.target.value)}
                className={inputCls}
              />
              <p className="text-xs text-muted mt-1">Se registra como primer pesaje</p>
            </div>
          </div>

          {/* ── Advanced (collapsible) ────────────────────────── */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-lime/60 hover:text-lime transition-colors flex items-center gap-1"
          >
            {showAdvanced ? '▾' : '▸'} {showAdvanced ? 'Ocultar' : 'Mostrar'} campos avanzados
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Propietario / Inversor</label>
                  <input
                    type="text"
                    placeholder="Nombre del dueño"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Origen</label>
                  <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={inputCls}>
                    <option value="">— seleccionar —</option>
                    {ORIGEN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Caravana padre (VID)</label>
                  <input
                    type="text"
                    placeholder="VID del toro"
                    value={padreVid}
                    onChange={(e) => setPadreVid(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Caravana madre (VID)</label>
                  <input
                    type="text"
                    placeholder="VID de la madre"
                    value={madreVid}
                    onChange={(e) => setMadreVid(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Color / Pelaje</label>
                <input
                  type="text"
                  placeholder="Ej: colorado, negro, overo"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Notas</label>
                <textarea
                  placeholder="Observaciones adicionales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className={inputCls}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
          )}

          {/* ── Error ─────────────────────────────────────────── */}
          {error && (
            <div className="rounded-lg border border-critical/30 bg-critical/10 px-4 py-3">
              <p className="text-critical text-sm">{error}</p>
            </div>
          )}

          {/* ── Buttons ───────────────────────────────────────── */}
          <div className="flex gap-3 justify-end pt-1">
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
              className="px-5 py-2 rounded-xl font-semibold text-sm text-charcoal disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              {saving ? 'Guardando...' : '💾 Registrar animal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
