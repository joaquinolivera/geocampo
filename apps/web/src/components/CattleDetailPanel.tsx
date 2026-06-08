'use client';

/**
 * CattleDetailPanel — trazabilidad timeline for one individual animal.
 * Shows: chip info, weight history, health events, movement history.
 * Data comes from farm-store (localStorage in demo mode).
 */

import { useState, useEffect } from 'react';
import type { StoredCattle } from '@/lib/farm-store';
import { loadStoredFarm, updateCattle } from '@/lib/farm-store';
import type { WeightRecord, HealthRecord, Movement } from '@/lib/data';
import type { UpdateCattleInput } from '@geocampo/shared';

interface Props {
  animal:   StoredCattle;
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

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', sold: '#f59e0b', deceased: '#6b7280', transferred: '#3b82f6',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo', sold: 'Vendido', deceased: 'Fallecido', transferred: 'Transferido',
};

const SEX_LABEL: Record<string, string> = {
  female: '♀ Hembra', male: '♂ Macho', castrated: '✂ Castrado',
};

export default function CattleDetailPanel({ animal, onClose, onUpdate }: Props) {
  const [timeline, setTimeline]     = useState<TimelineEvent[]>([]);
  const [editStatus, setEditStatus] = useState(false);
  const [newStatus, setNewStatus]   = useState(animal.status);

  useEffect(() => {
    const farm = loadStoredFarm();
    if (!farm) return;

    const events: TimelineEvent[] = [];

    // Birth / registration
    events.push({
      date:  animal.createdAt.slice(0, 10),
      type:  'created',
      icon:  '🐄',
      title: 'Registro en SINIP',
      desc:  `Chip: ${animal.chipId ?? 'N/A'} · Caravana: ${animal.visualTagId ?? 'N/A'}`,
      color: '#8b5cf6',
    });

    // Weight records (demo: show herd-level records that overlap with this animal)
    // In production, cattle_id FK links individual records
    const herdWeights: WeightRecord[] = (farm.weightRecords ?? []).filter(
      (w) => w.herdId === animal.herdId
    );
    herdWeights.forEach((w) => {
      const d = typeof w.weighedAt === 'string' ? w.weighedAt : w.weighedAt.toISOString();
      events.push({
        date:  d.slice(0, 10),
        type:  'weight',
        icon:  '⚖️',
        title: `Pesaje — prom. ${w.averageWeightKg ?? Math.round(w.weightKg / (w.cattleCount || 1))} kg`,
        desc:  `${w.cattleCount} animales · ${w.weighedBy ?? 'sin registrar'}`,
        color: '#f59e0b',
      });
    });

    // Health records
    const healthRecs: HealthRecord[] = (farm.healthRecords ?? []).filter(
      (h) => h.herdId === animal.herdId
    );
    healthRecs.forEach((h) => {
      const d = typeof h.administeredAt === 'string' ? h.administeredAt : h.administeredAt.toISOString();
      events.push({
        date:  d.slice(0, 10),
        type:  'health',
        icon:  '💉',
        title: `${h.treatmentType} · ${h.productName ?? '—'}`,
        desc:  `Por: ${h.administeredBy}${h.nextDueDate ? ` · Próx. dosis: ${String(h.nextDueDate).slice(0, 10)}` : ''}`,
        color: '#22c55e',
      });
    });

    // Movements
    const movs: Movement[] = (farm.movements ?? []).filter(
      (m) => m.herdId === animal.herdId
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

    // Sort newest first
    events.sort((a, b) => (b.date > a.date ? 1 : -1));
    setTimeline(events);
  }, [animal]);

  const handleStatusChange = () => {
    updateCattle(animal.id, { status: newStatus } as UpdateCattleInput);
    onUpdate();
    setEditStatus(false);
  };

  const age = () => {
    if (!animal.dob) return null;
    const dob  = new Date(animal.dob);
    const now  = new Date();
    const diff = (now.getTime() - dob.getTime()) / (1000 * 86400 * 365.25);
    return diff < 1 ? `${Math.floor(diff * 12)} meses` : `${diff.toFixed(1)} años`;
  };

  const inputClass = 'rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-green-500 focus:outline-none';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1100 }}
      className="flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Info grid */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Sexo',  value: animal.sex ? SEX_LABEL[animal.sex] : '—' },
              { label: 'Raza',  value: animal.breed ?? '—' },
              { label: 'Edad',  value: age() ?? (animal.dob ? animal.dob : '—') },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#1e293b', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Status change */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>Estado:</span>
            {editStatus ? (
              <>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StoredCattle['status'])}
                  className={inputClass}
                >
                  <option value="active">Activo</option>
                  <option value="sold">Vendido</option>
                  <option value="deceased">Fallecido</option>
                  <option value="transferred">Transferido</option>
                </select>
                <button onClick={handleStatusChange} style={{ padding: '4px 12px', borderRadius: 6, background: '#22c55e', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Guardar</button>
                <button onClick={() => setEditStatus(false)} style={{ padding: '4px 10px', borderRadius: 6, background: '#374151', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>×</button>
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

        {/* Timeline */}
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
            {/* Vertical line */}
            {timeline.length > 1 && (
              <div style={{ position: 'absolute', left: 15, top: 10, bottom: 10, width: 2, background: '#1e293b' }} />
            )}

            {timeline.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, position: 'relative' }}>
                {/* Icon dot */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: '#0f172a',
                  border: `2px solid ${ev.color}55`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 14, flexShrink: 0, zIndex: 1,
                }}>
                  {ev.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{ev.title}</span>
                    <span style={{ color: '#475569', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{ev.date}</span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>{ev.desc}</p>
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
    </div>
  );
}
