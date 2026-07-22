'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarmData } from '@/lib/FarmDataContext';
import WeightEntryModal from '@/components/WeightEntryModal';
import WeightGainChart from '@/components/WeightGainChart';
import HealthEntryModal from '@/components/HealthEntryModal';
import MoveHerdModal from '@/components/MoveHerdModal';
import AddHerdModal from '@/components/AddHerdModal';
import EditPastureModal from '@/components/EditPastureModal';
import CattlePanel from '@/components/CattlePanel';
import GrazingLogPanel from '@/components/GrazingLogPanel';
import RainfallWidget from '@/components/RainfallWidget';
import CattleDetailPanel from '@/components/CattleDetailPanel';
import { removePasture } from '@/lib/farm-store';
import { getBrowserClient } from '@/lib/supabase';
import type { StoredCattle } from '@/lib/farm-store';
import type { GrassType, WaterSupplyType } from '@/lib/data';
import {
  buildLoadAlert,
  loadStatusColor,
  calculateADG,
  getPastureHealthScore,
  pastureHealthColor,
  getDueStatus,
  daysUntilDue,
  treatmentTypeLabel,
  dueStatusColor,
} from '@/lib/alerts';
import { useT } from '@/lib/i18n';

interface ParcelDetailPanelProps {
  pastureId: string;
  onClose: () => void;
  /** Called when the user wants to redraw this pasture's boundary on the map */
  onStartRedraw?: (pastureId: string) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-charcoal rounded-xl p-3 text-center">
      <p className="text-muted text-xs mb-1 leading-tight">{label}</p>
      <p className="font-bold text-lg leading-tight" style={{ color: color ?? '#FFFFFF' }}>
        {value}
      </p>
    </div>
  );
}

const GRASS_LABELS: Record<GrassType, string> = {
  natural:    'Pastura natural',
  mejorado:   'Campo mejorado',
  ryegrass:   'Raigrás / Trébol',
  festuca:    'Festuca / Trébol rojo',
  alfalfa:    'Alfalfa',
  brachiaria: 'Brachiaria',
  sorgo:      'Sorgo forrajero',
  maiz:       'Maíz para silaje',
  otro:       'Otro',
};

const WATER_LABELS: Record<WaterSupplyType, { label: string; icon: string }> = {
  tajamar:   { label: 'Tajamar / Represa', icon: '💧' },
  molino:    { label: 'Molino de viento',  icon: '🌀' },
  bebedero:  { label: 'Bebedero',           icon: '🚰' },
  arroyo:    { label: 'Arroyo',             icon: '🌊' },
  pozo:      { label: 'Pozo',               icon: '⛏️' },
  none:      { label: 'Sin agua propia',    icon: '❌' },
};

export default function ParcelDetailPanel({ pastureId, onClose, onStartRedraw }: ParcelDetailPanelProps) {
  const { t } = useT();
  const { DEMO_FARM, PASTURES, HERDS, WEIGHTS, HEALTH_RECORDS, MOVEMENTS, refresh, isCustomFarm } = useFarmData();
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showAddHerdModal, setShowAddHerdModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<StoredCattle | null>(null);
  // Linked lote comercial for this herd (fetched from Supabase when available)
  const [linkedLote, setLinkedLote] = useState<{ id: string; nombre: string; estado: string } | null>(null);

  const pasture = PASTURES.find((p) => p.id === pastureId);
  const herd = HERDS.find((h) => h.pastureId === pastureId);

  // Fetch lote comercial linked to this herd (Supabase users only)
  useEffect(() => {
    setLinkedLote(null);
    if (!herd) return;
    const client = getBrowserClient();
    if (!client) return;
    void (async () => {
      const { data } = await client
        .from('lotes_comerciales')
        .select('id, nombre, estado')
        .eq('herd_id', herd.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setLinkedLote(data as { id: string; nombre: string; estado: string });
    })();
  }, [herd?.id]);

  const weights = useMemo(
    () =>
      WEIGHTS.filter((w) => w.herdId === herd?.id).sort(
        (a, b) => b.weighedAt.getTime() - a.weighedAt.getTime()
      ),
    [herd, WEIGHTS]
  );
  const healthRecords = useMemo(
    () =>
      HEALTH_RECORDS.filter((r) => r.herdId === herd?.id).sort(
        (a, b) => b.administeredAt.getTime() - a.administeredAt.getTime()
      ),
    [herd, HEALTH_RECORDS]
  );

  // All movements that touched this pasture (in OR out), sorted newest-first
  const pastureMovements = useMemo(
    () =>
      MOVEMENTS.filter(
        (m) =>
          (m.fromPastureId != null ? m.fromPastureId === pastureId : m.fromPastureName === pasture?.name) ||
          (m.toPastureId != null ? m.toPastureId === pastureId : m.toPastureName === pasture?.name)
      ).sort((a, b) => {
        const ta = a.movedAt instanceof Date ? a.movedAt.getTime() : new Date(a.movedAt).getTime();
        const tb = b.movedAt instanceof Date ? b.movedAt.getTime() : new Date(b.movedAt).getTime();
        return tb - ta;
      }),
    [MOVEMENTS, pastureId, pasture?.name]
  );

  if (!pasture) return null;

  const alert = buildLoadAlert(pasture, herd);
  const statusColor = alert ? loadStatusColor(alert.status) : '#6A6A6B';
  const pct = alert?.capacityPercent ?? 0;

  const adg = calculateADG(weights);
  const latestWeight = weights[0];
  const daysOccupied = herd
    ? Math.round((Date.now() - herd.entryDate.getTime()) / 86_400_000)
    : 0;

  const healthScore = alert ? getPastureHealthScore(alert.status, daysOccupied) : 'excelente';
  const healthColor = pastureHealthColor(healthScore);

  const healthScoreLabel =
    healthScore === 'excelente'
      ? t('parcel.health.excellent')
      : healthScore === 'bueno'
      ? t('parcel.health.good')
      : healthScore === 'atención'
      ? t('parcel.health.attention')
      : t('parcel.health.critical');

  const statusLabel =
    alert?.status === 'ok'
      ? t('parcel.status.ok')
      : alert?.status === 'warning'
      ? t('parcel.status.warning')
      : t('parcel.status.critical');

  const upcomingHealth = healthRecords.filter((r) => {
    if (!r.nextDueDate) return false;
    const s = getDueStatus(r.nextDueDate);
    return s === 'overdue' || s === 'urgent' || s === 'upcoming';
  });

  // All records sorted newest-first (for history display)
  const recentHealth = [...healthRecords].slice(0, 5);

  // Locale for date formatting based on language
  // Use 'es-AR' as a safe default — works regardless of i18n setting
  const dateLocale = 'es-AR';

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-80 flex flex-col border-l border-surface2 overflow-y-auto shadow-2xl z-10"
      style={{ backgroundColor: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(12px)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 p-5 border-b border-surface2"
        style={{ borderTopColor: statusColor, borderTopWidth: 3 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-white text-xl font-bold leading-tight">{pasture.name}</h2>
            <p className="text-muted text-sm mt-0.5">{pasture.areaHectares.toFixed(1)} ha</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ backgroundColor: healthColor + '20', color: healthColor }}
            >
              {healthScoreLabel}
            </div>
            {isCustomFarm && (
              <button
                onClick={() => setShowEditModal(true)}
                className="text-muted hover:text-white transition-colors text-sm leading-none p-1"
                title="Editar potrero"
              >
                ✏️
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted hover:text-white transition-colors text-xl leading-none p-1"
              title={t('detail.close')}
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {/* Herd info */}
        {herd ? (
          <Section title={t('detail.currentHerd')}>
            <div className="bg-surface rounded-xl p-4 space-y-3">
              <div>
                <p className="text-white font-bold text-base">{herd.name}</p>
                <p className="text-muted text-sm">
                  {herd.species && herd.species !== 'bovino' ? (
                    <span>
                      {herd.species === 'ovino' ? '🐑 ' : herd.species === 'caprino' ? '🐐 ' : herd.species === 'equino' ? '🐎 ' : herd.species === 'porcino' ? '🐷 ' : '🐾 '}
                    </span>
                  ) : null}
                  {herd.breed}
                </p>
              </div>

              {/* Stocking bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted text-xs">{t('parcel.loadPct')}</span>
                  <span className="text-xs font-bold" style={{ color: statusColor }}>
                    {pct}% — {statusLabel}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-charcoal overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: statusColor,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-white font-medium">
                    {t('detail.stockingCaption', {
                      count: herd.cattleCount,
                      capacity: pasture.carryingCapacity,
                    })}
                  </span>
                </div>
              </div>

              {/* Add another herd to this pasture */}
              {isCustomFarm && (
                <button
                  onClick={() => setShowAddHerdModal(true)}
                  className="w-full rounded-xl py-2 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                  style={{ backgroundColor: 'transparent' }}
                >
                  + Agregar otro lote a este potrero
                </button>
              )}
            </div>
          </Section>
        ) : (
          <Section title={t('detail.currentHerd')}>
            <div className="bg-surface rounded-xl p-4 text-center space-y-3">
              <p className="text-muted text-sm italic">{t('detail.noHerd')}</p>
              {isCustomFarm && (
                <button
                  onClick={() => setShowAddHerdModal(true)}
                  className="w-full rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                  style={{ backgroundColor: 'transparent' }}
                >
                  + Agregar hacienda a este potrero
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Metrics */}
        <Section title={t('detail.productivity')}>
          <div className="grid grid-cols-3 gap-2">
            <Stat
              label={t('detail.avgWeight')}
              value={latestWeight ? `${latestWeight.averageWeightKg} kg` : '—'}
            />
            <Stat
              label={t('detail.adg')}
              value={adg !== null ? `${adg > 0 ? '+' : ''}${adg}` : '—'}
              color={adg === null ? '#6A6A6B' : adg >= 0.8 ? '#DEFF9A' : '#FFB444'}
            />
            <Stat
              label={t('detail.daysOcc')}
              value={herd ? String(daysOccupied) : '—'}
              color={daysOccupied > 30 ? '#FFB444' : '#FFFFFF'}
            />
          </div>
        </Section>

        {/* Entry date */}
        {herd && (
          <Section title={t('detail.timeInPasture')}>
            <div className="bg-surface rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted text-sm">{t('detail.entryDate')}</span>
                <span className="text-white text-sm font-medium">
                  {herd.entryDate.toLocaleDateString(dateLocale, {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted text-sm">{t('detail.daysOcc')}</span>
                <span
                  className="text-sm font-bold"
                  style={{ color: daysOccupied > 30 ? '#FFB444' : '#DEFF9A' }}
                >
                  {daysOccupied} {t('detail.daysOccupied')}
                </span>
              </div>
              {daysOccupied > 30 && (
                <p className="text-warning text-xs mt-1">⚠️ {t('detail.rotationWarning')}</p>
              )}
            </div>
          </Section>
        )}

        {/* Weight history + action */}
        {herd && (
          <Section title={t('detail.weightHistory')}>
            <div className="space-y-2">
              {weights.slice(0, 3).map((w) => (
                <div
                  key={w.id}
                  className="bg-surface rounded-xl px-4 py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {w.averageWeightKg} {t('detail.kg')}/cab.
                    </p>
                    <p className="text-muted text-xs">
                      {(w.weighedAt instanceof Date ? w.weighedAt : new Date(w.weighedAt)).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted text-xs">
                      {w.cattleCount} {t('detail.heads')}
                    </p>
                    <p className="text-muted text-xs">{w.weighedBy}</p>
                  </div>
                </div>
              ))}

              {weights.length === 0 && (
                <p className="text-muted text-sm text-center italic py-2">Sin pesajes registrados</p>
              )}

              <WeightGainChart records={weights} />

              {/* Registrar pesaje button — only for real farms */}
              {isCustomFarm && (
                <button
                  onClick={() => setShowWeightModal(true)}
                  className="w-full mt-1 rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                  style={{ backgroundColor: 'transparent' }}
                >
                  + Registrar pesaje
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Health */}
        {herd && (
          <Section title={t('detail.health')}>
            <div className="space-y-2">
              {/* Upcoming / overdue alerts strip */}
              {upcomingHealth.map((r) => {
                if (!r.nextDueDate) return null;
                const status = getDueStatus(r.nextDueDate);
                const color = dueStatusColor(status);
                const days = daysUntilDue(r.nextDueDate);
                const dueLabel =
                  days < 0
                    ? t('alerts.overdueDays', { days: Math.abs(days) })
                    : days === 0
                    ? t('movements.today')
                    : `${days}d`;

                return (
                  <div
                    key={r.id}
                    className="rounded-xl border px-4 py-3 flex justify-between items-start gap-3"
                    style={{ backgroundColor: color + '12', borderColor: color + '40' }}
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium leading-tight">
                        {treatmentTypeLabel(r.treatmentType)}
                        {r.productName ? ` — ${r.productName}` : ''}
                      </p>
                      {r.dosage && <p className="text-muted text-xs">{r.dosage}</p>}
                    </div>
                    <div
                      className="flex-shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: color + '22', color }}
                    >
                      {dueLabel}
                    </div>
                  </div>
                );
              })}

              {/* Full health history */}
              {recentHealth.length === 0 ? (
                <p className="text-muted text-sm text-center italic py-2">Sin registros sanitarios</p>
              ) : (
                <div className="space-y-1.5">
                  {recentHealth.map((r) => {
                    const isInAlerts = upcomingHealth.some((u) => u.id === r.id);
                    return (
                      <div
                        key={r.id}
                        className="rounded-xl px-4 py-3 flex justify-between items-start gap-3 border border-surface2"
                        style={{ backgroundColor: '#1A1A1B' }}
                      >
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium leading-tight">
                            {treatmentTypeLabel(r.treatmentType)}
                            {r.productName ? ` — ${r.productName}` : ''}
                          </p>
                          <p className="text-muted text-xs mt-0.5">
                            {(r.administeredAt instanceof Date ? r.administeredAt : new Date(r.administeredAt)).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
                            {r.administeredBy ? ` · ${r.administeredBy}` : ''}
                          </p>
                          {r.dosage && <p className="text-muted text-xs">{r.dosage}</p>}
                          {r.notes && <p className="text-muted text-xs italic mt-0.5">{r.notes}</p>}
                        </div>
                        {r.nextDueDate && !isInAlerts && (
                          <div
                            className="flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-lg text-muted border border-surface2"
                            style={{ backgroundColor: '#0A0A0B' }}
                          >
                            {(r.nextDueDate instanceof Date ? r.nextDueDate : new Date(r.nextDueDate)).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Registrar sanidad — only for real farms */}
              {isCustomFarm && (
                <button
                  onClick={() => setShowHealthModal(true)}
                  className="w-full mt-1 rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                  style={{ backgroundColor: 'transparent' }}
                >
                  + Registrar sanidad
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Movement history — shown for all farms when there are movements, plus action button for real farms */}
        {(pastureMovements.length > 0 || (isCustomFarm && herd)) && (
          <Section title="Movimientos">
            <div className="space-y-1.5">
              {pastureMovements.length === 0 ? (
                <p className="text-muted text-sm text-center italic py-2">Sin movimientos registrados</p>
              ) : (
                pastureMovements.map((m) => {
                  const isIncoming =
                    m.toPastureId != null ? m.toPastureId === pastureId : m.toPastureName === pasture.name;
                  const movedAtDate = m.movedAt instanceof Date ? m.movedAt : new Date(m.movedAt);
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl px-4 py-3 border border-surface2 flex gap-3 items-start"
                      style={{ backgroundColor: '#1A1A1B' }}
                    >
                      <div
                        className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: isIncoming ? '#DEFF9A22' : '#FF444422',
                          color: isIncoming ? '#DEFF9A' : '#FF6B6B',
                        }}
                      >
                        {isIncoming ? '↓' : '↑'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-sm font-medium leading-tight">{m.herdName}</p>
                        <p className="text-muted text-xs mt-0.5">
                          {isIncoming
                            ? `Desde ${m.fromPastureName ?? 'campo externo'}`
                            : `Hacia ${m.toPastureName}`}
                        </p>
                        <p className="text-muted text-xs">
                          {movedAtDate.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
                          {m.movedBy ? ` · ${m.movedBy}` : ''}
                        </p>
                        {m.notes && <p className="text-muted text-xs italic mt-0.5">{m.notes}</p>}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Move button — only when real farm has a current herd */}
              {isCustomFarm && herd && (
                <button
                  onClick={() => setShowMoveModal(true)}
                  className="w-full mt-1 rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                  style={{ backgroundColor: 'transparent' }}
                >
                  ↗ Mover hacienda a otro potrero
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Phase G — Individual cattle (DIOB / SENACSA) */}
        {herd && (
          <Section title="Animales individuales (DIOB)">
            <CattlePanel
              herdId={herd.id}
              herdName={herd.name}
              farmId={DEMO_FARM.id}
              isCustomFarm={isCustomFarm}
              onAnimalClick={(animal) => setSelectedAnimal(animal)}
            />
          </Section>
        )}

        {/* Linked lote comercial */}
        {linkedLote && (
          <Section title="Lote comercial vinculado">
            <Link
              href={`/lotes/${linkedLote.id}`}
              className="flex items-center gap-3 rounded-xl border border-surface2 px-4 py-3 hover:border-lime/30 transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <span className="text-xl">📦</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{linkedLote.nombre}</p>
                <p className="text-muted text-xs mt-0.5">
                  Estado:{' '}
                  <span className={linkedLote.estado === 'abierto' ? 'text-lime' : 'text-blue-300'}>
                    {linkedLote.estado}
                  </span>
                </p>
              </div>
              <span className="text-muted text-xs">Ver →</span>
            </Link>
          </Section>
        )}

        {/* Rainfall log */}
        <Section title="💧 Lluvia registrada">
          <RainfallWidget pastureId={pastureId} compact />
        </Section>

        {/* Grazing rotation log */}
        <Section title="Historial de pastoreo">
          <GrazingLogPanel pastureId={pastureId} />
        </Section>

        {/* Delete / redraw pasture — only for real farms */}
        {isCustomFarm && (
          <Section title="Zona de peligro">
            {onStartRedraw && (
              <button
                onClick={() => { onClose(); onStartRedraw(pastureId); }}
                className="w-full mb-2 rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-yellow-900 hover:border-yellow-500 text-yellow-700 hover:text-yellow-400"
                style={{ backgroundColor: 'transparent' }}
              >
                🗺 Redibujar límite del potrero
              </button>
            )}
            {!deleteConfirm ? (
              <button
                onClick={() => { setDeleteConfirm(true); setDeleteError(null); }}
                className="w-full rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-red-900 hover:border-red-500 text-red-700 hover:text-red-400"
                style={{ backgroundColor: 'transparent' }}
              >
                🗑 Eliminar este potrero
              </button>
            ) : (
              <div
                className="rounded-xl border border-red-900 p-4 space-y-3"
                style={{ backgroundColor: '#FF000010' }}
              >
                <p className="text-red-300 text-sm font-medium text-center">
                  ¿Confirmar eliminación de <span className="font-bold">{pasture.name}</span>?
                </p>
                {deleteError && (
                  <p role="alert" className="text-red-400 text-xs text-center">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeleteError(null); }}
                    className="flex-1 rounded-xl py-2 text-sm text-muted border border-surface2 hover:text-white transition-colors"
                    style={{ backgroundColor: '#0A0A0B' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const result = removePasture(pasture.id);
                      if (!result) {
                        setDeleteError('No se encontró el potrero.');
                        return;
                      }
                      if ('error' in result && result.error === 'has_herd') {
                        setDeleteError('Este potrero tiene hacienda asignada. Mueva la hacienda antes de eliminarlo.');
                        return;
                      }
                      refresh();
                      onClose();
                    }}
                    className="flex-1 rounded-xl py-2 text-sm font-bold text-white transition-colors"
                    style={{ backgroundColor: '#CC2222' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Pasture characteristics — only shown when richer metadata is present */}
        {(pasture.grassType || pasture.waterSupply || pasture.elevationM || pasture.notes) && (
          <Section title="Características del potrero">
            <div className="bg-surface rounded-xl p-4 space-y-3">
              {pasture.grassType && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted text-sm shrink-0">🌿 Pasturas</span>
                  <span className="text-white text-sm font-medium text-right">
                    {GRASS_LABELS[pasture.grassType]}
                  </span>
                </div>
              )}
              {pasture.waterSupply && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted text-sm shrink-0">
                    {WATER_LABELS[pasture.waterSupply].icon} Agua
                  </span>
                  <span className="text-white text-sm font-medium text-right">
                    {WATER_LABELS[pasture.waterSupply].label}
                  </span>
                </div>
              )}
              {typeof pasture.elevationM === 'number' && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted text-sm shrink-0">⛰️ Altitud</span>
                  <span className="text-white text-sm font-medium text-right">
                    {pasture.elevationM} m.s.n.m.
                  </span>
                </div>
              )}
              {pasture.notes && (
                <div className="pt-1 border-t border-surface2">
                  <p className="text-muted text-xs mb-1">📝 Observaciones</p>
                  <p className="text-white text-sm leading-relaxed">{pasture.notes}</p>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* Weight entry modal */}
      {showWeightModal && herd && (
        <WeightEntryModal
          herdId={herd.id}
          herdName={herd.name}
          onClose={() => setShowWeightModal(false)}
          onSaved={() => { refresh(); }}
        />
      )}

      {/* Health record modal */}
      {showHealthModal && herd && (
        <HealthEntryModal
          herdId={herd.id}
          herdName={herd.name}
          onClose={() => setShowHealthModal(false)}
          onSaved={() => { refresh(); }}
        />
      )}

      {/* Move herd modal */}
      {showMoveModal && herd && (
        <MoveHerdModal
          herdId={herd.id}
          herdName={herd.name}
          currentPastureId={herd.pastureId}
          onClose={() => setShowMoveModal(false)}
          onSaved={() => { refresh(); }}
        />
      )}

      {/* Add herd modal */}
      {showAddHerdModal && (
        <AddHerdModal
          pastureId={pastureId}
          pastureName={pasture.name}
          onClose={() => setShowAddHerdModal(false)}
          onSaved={() => { refresh(); }}
        />
      )}

      {/* Edit pasture modal */}
      {showEditModal && (
        <EditPastureModal
          pasture={pasture}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { refresh(); }}
        />
      )}

      {/* Phase G — cattle trazabilidad detail */}
      {selectedAnimal && (
        <CattleDetailPanel
          animal={selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
          onUpdate={() => { setSelectedAnimal(null); refresh(); }}
        />
      )}
    </div>
  );
}
