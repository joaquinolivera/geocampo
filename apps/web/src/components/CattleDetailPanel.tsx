'use client';

/**
 * CattleDetailPanel — trazabilidad timeline for one individual animal.
 *
 * Demo mode:  reads from farm-store (localStorage). Shows herd-level
 *             weight / health / movement events that overlap the animal.
 *
 * Production: reads individual cattle_weights from the API, shows a
 *             "Registrar pesaje" button, and updates status via PATCH.
 */

import { useState, useEffect } from 'react';
import { IS_DEMO_MODE } from '@/lib/supabase';
import type { CattleRecord } from '@/lib/FarmDataContext';
import type { StoredCattle } from '@/lib/farm-store';
import { loadStoredFarm, updateCattle } from '@/lib/farm-store';
import type { WeightRecord, HealthRecord, Movement } from '@/lib/data';
import type { UpdateCattleInput } from '@geocampo/shared';
import CattleWeightModal from './CattleWeightModal';

interface Props {
  animal:   CattleRecord | StoredCattle;
  onClose:  () => void;
  onUpdate: () => void;
}

interface TimelineEvent {
  date:  string;
  type:  'weight' | 'health' | 'movement' | 'created';
  icon:  string;
  title: string;
  desc:  string;
  color: string;
}

interface ApiWeightRow {
  id:             string;
  date:           string;
  weight_kg:      number;
  hip_height_cm:  number | null;
  body_condition: number | null;
  gmd_kg_day:     number | null;
  frame_score:    number | null;
  notes:          string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', sold: '#f59e0b', deceased: '#6b7280', transferred: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', sold: 'Vendido', deceased: 'Fallecido', transferred: 'Transferido',
};

const SEX_LABEL: Record<string, string> = {
  female: '♀ Hembra', male: '♂ Macho', castrated: '✂ Castrado',
};

const CATEGORY_LABEL: Record<string, string> = {
  vaca: 'Vaca', vaquillona: 'Vaquillona', ternera: 'Ternera',
  toro: 'Toro', novillo: 'Novillo', ternero: 'Ternero', torito: 'Torito',
};

function calcAge(dob: string): string {
  const diff = (Date.now() - new Date(dob).getTime()) / (1000 * 86400 * 365.25);
  return diff < 1 ? `${Math.floor(diff * 12)} meses` : `${diff.toFixed(1)} años`;
}

export default function CattleDetailPanel({ animal, onClose, onUpdate }: Props) {
  const [timeline,      setTimeline]      = useState<TimelineEvent[]>([]);
  const [editStatus,    setEditStatus]    = useState(false);
  const [newStatus,     setNewStatus]     = useState(animal.status);
  const [savingStatus,  setSavingStatus]  = useState(false);
  const [showWeightMod, setShowWeightMod] = useState(false);

  // Extra fields only on CattleRecord (production)
  const isProduction = !IS_DEMO_MODE;
  const rec = isProduction ? (animal as CattleRecord) : null;

  // ── Load timeline ──────────────────────────────────────────────────────────

  useEffect(() => {
    const events: TimelineEvent[] = [];

    // Registration event (both modes)
    events.push({
      date:  animal.createdAt.slice(0, 10),
      type:  'created',
      icon:  '🐄',
      title: 'Registro',
      desc:  [
        animal.chipId      ? `Chip: ${animal.chipId}`             : null,
        animal.visualTagId ? `Caravana: ${animal.visualTagId}`    : null,
        rec?.category      ? CATEGORY_LABEL[rec.category] ?? rec.category : null,
        rec?.ownerName     ? `Propietario: ${rec.ownerName}`      : null,
      ].filter(Boolean).join(' · ') || 'Sin datos adicionales',
      color: '#8b5cf6',
    });

    if (IS_DEMO_MODE) {
      // ── Demo: herd-level records from farm-store ─────────────────────────
      const farm = loadStoredFarm();
      if (farm) {
        const herdId = animal.herdId;

        const herdWeights: WeightRecord[] = (farm.weightRecords ?? []).filter(
          (w) => w.herdId === herdId
        );
        herdWeights.forEach((w) => {
          const d = typeof w.weighedAt === 'string' ? w.weighedAt : w.weighedAt.toISOString();
          events.push({
            date:  d.slice(0, 10),
            type:  'weight',
            icon:  '⚖️',
            title: `Pesaje lote — prom. ${w.averageWeightKg ?? Math.round(w.weightKg / (w.cattleCount || 1))} kg`,
            desc:  `${w.cattleCount} animales · ${w.weighedBy ?? 'sin registrar'}`,
            color: '#f59e0b',
          });
        });

        const healthRecs: HealthRecord[] = (farm.healthRecords ?? []).filter(
          (h) => h.herdId === herdId
        );
        healthRecs.forEach((h) => {
          const d = typeof h.administeredAt === 'string' ? h.administeredAt : h.administeredAt.toISOString();
          events.push({
            date:  d.slice(0, 10),
            type:  'health',
            icon:  '💉',
            title: `${h.treatmentType} · ${h.productName ?? '—'}`,
            desc:  `Por: ${h.administeredBy}${h.nextDueDate ? ` · Próx: ${String(h.nextDueDate).slice(0, 10)}` : ''}`,
            color: '#22c55e',
          });
        });

        const movs: Movement[] = (farm.movements ?? []).filter(
          (m) => m.herdId === herdId
        );
        movs.forEach((m) => {
          const d = typeof m.movedAt === 'string' ? m.movedAt : m.movedAt.toISOString();
          events.push({
            date:  d.slice(0, 10),
            type:  'movement',
            icon:  '🔀',
            title: `Movimiento → ${m.toPastureName ?? m.toPastureId}`,
            desc:  m.fromPastureName ? `Desde: ${m.fromPastureName}` : 'Entrada al campo',
            color: '#3b82f6',
          });
        });
      }

      events.sort((a, b) => (b.date > a.date ? 1 : -1));
      setTimeline(events);
    } else {
      // ── Production: fetch individual weight records from API ──────────────
      fetch(`/api/cattle/${animal.id}/weights`)
        .then((r) => r.json() as Promise<{ weights?: ApiWeightRow[] }>)
        .then(({ weights = [] }) => {
          weights.forEach((w) => {
            const parts: string[] = [`${w.weight_kg} kg`];
            if (w.gmd_kg_day != null) parts.push(`GMD: ${w.gmd_kg_day > 0 ? '+' : ''}${w.gmd_kg_day} kg/día`);
            if (w.frame_score != null) parts.push(`FS: ${w.frame_score.toFixed(1)}`);
            if (w.body_condition != null) parts.push(`CC: ${w.body_condition}/9`);
            if (w.notes) parts.push(w.notes);
            events.push({
              date:  w.date,
              type:  'weight',
              icon:  '⚖️',
              title: `Pesaje individual — ${w.weight_kg} kg`,
              desc:  parts.slice(1).join(' · ') || '',
              color: '#f59e0b',
            });
          });
          events.sort((a, b) => (b.date > a.date ? 1 : -1));
          setTimeline(events);
        })
        .catch(() => {
          events.sort((a, b) => (b.date > a.date ? 1 : -1));
          setTimeline(events);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.id]);

  // ── Status change ──────────────────────────────────────────────────────────

  const handleStatusChange = async () => {
    if (IS_DEMO_MODE) {
      updateCattle(animal.id, { status: newStatus } as UpdateCattleInput);
      setEditStatus(false);
      onUpdate();
      return;
    }
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/cattle/${animal.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Error al cambiar el estado');
      setEditStatus(false);
      onUpdate();
    } finally {
      setSavingStatus(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const ageStr  = animal.dob ? calcAge(animal.dob) : null;

  const inputClass = 'rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-lime focus:outline-none';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100 }}
      className="flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, margin: 0 }}>
                Trazabilidad animal
              </h3>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
                background: `${STATUS_COLORS[animal.status]}22`,
                color: STATUS_COLORS[animal.status],
                border: `1px solid ${STATUS_COLORS[animal.status]}55`,
              }}>
                {STATUS_LABELS[animal.status]}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              {animal.chipId && (
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#60a5fa', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                  📡 {animal.chipId}
                </span>
              )}
              {animal.visualTagId && (
                <span style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                  🏷 {animal.visualTagId}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Registrar pesaje — production only */}
            {isProduction && animal.status === 'active' && (
              <button
                onClick={() => setShowWeightMod(true)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: '#DEFF9A', color: '#111112', border: 'none', cursor: 'pointer',
                }}
              >
                ⚖ Pesaje
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* ── Info grid ──────────────────────────────────────────────────── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Sexo',      value: animal.sex ? (SEX_LABEL[animal.sex] ?? animal.sex) : '—' },
              { label: 'Raza',      value: animal.breed ?? '—' },
              { label: 'Edad',      value: ageStr ?? (animal.dob ?? '—') },
              ...(rec ? [
                { label: 'Categoría', value: CATEGORY_LABEL[rec.category ?? ''] ?? rec.category ?? '—' },
                { label: 'Propietario', value: rec.ownerName ?? '—' },
                { label: 'Origen',    value: rec.origen ?? '—' },
              ] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Genealogy (production only) */}
          {rec && (rec.padreVid || rec.madreVid) && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {rec.padreVid && (
                <span style={{ fontSize: 12, color: '#94a3b8', background: '#1e293b', padding: '4px 10px', borderRadius: 6 }}>
                  ♂ Padre: {rec.padreVid}
                </span>
              )}
              {rec.madreVid && (
                <span style={{ fontSize: 12, color: '#94a3b8', background: '#1e293b', padding: '4px 10px', borderRadius: 6 }}>
                  ♀ Madre: {rec.madreVid}
                </span>
              )}
            </div>
          )}

          {/* Status change */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>Estado:</span>
            {editStatus ? (
              <>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as typeof animal.status)}
                  className={inputClass}
                >
                  <option value="active">Activo</option>
                  <option value="sold">Vendido</option>
                  <option value="deceased">Fallecido</option>
                  <option value="transferred">Transferido</option>
                </select>
                <button
                  onClick={() => { void handleStatusChange(); }}
                  disabled={savingStatus}
                  style={{ padding: '4px 12px', borderRadius: 6, background: '#22c55e', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', opacity: savingStatus ? 0.6 : 1 }}
                >
                  {savingStatus ? '...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditStatus(false)}
                  style={{ padding: '4px 10px', borderRadius: 6, background: '#374151', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer' }}
                >
                  ×
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditStatus(true)}
                style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Cambiar estado
              </button>
            )}
          </div>
        </div>

        {/* ── Timeline ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <h4 style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
            Historial completo
          </h4>

          {timeline.length === 0 && (
            <p style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Sin eventos registrados aún.
            </p>
          )}

          <div style={{ position: 'relative' }}>
            {timeline.length > 1 && (
              <div style={{ position: 'absolute', left: 15, top: 10, bottom: 10, width: 2, background: '#1e293b' }} />
            )}

            {timeline.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, position: 'relative' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: '#0f172a',
                  border: `2px solid ${ev.color}55`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 14, flexShrink: 0, zIndex: 1,
                }}>
                  {ev.icon}
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{ev.title}</span>
                    <span style={{ color: '#475569', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{ev.date}</span>
                  </div>
                  {ev.desc && (
                    <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>{ev.desc}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* SINIP compliance note */}
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8 }}>
            <p style={{ color: '#60a5fa', fontSize: 11, margin: 0 }}>
              <strong>DIOB:</strong> Este registro cumple con la Ley 7221/2023 y Res. SENACSA 2103/2024 para identificación bovina en Paraguay.{' '}
              {animal.chipId ? `Chip ISO 11784/11785 FDX-B registrado.` : `⚠ Sin chip — registrá el DIOB para cumplir con SINIP.`}
            </p>
          </div>
        </div>
      </div>

      {/* Weight modal (production only) */}
      {showWeightMod && isProduction && (
        <CattleWeightModal
          cattle={animal as CattleRecord}
          farmId={(animal as CattleRecord).farmId}
          onClose={() => setShowWeightMod(false)}
          onSaved={() => {
            setShowWeightMod(false);
            // Re-fetch timeline by toggling animal id (effect dependency)
            // onUpdate() causes ParcelDetailPanel to close the panel;
            // instead we just re-run the effect by forcing a re-mount isn't ideal.
            // Simplest: close and let parent refresh.
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
