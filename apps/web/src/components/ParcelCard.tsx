'use client';

import type { Pasture, Herd, WeightRecord } from '@/lib/data';
import {
  buildLoadAlert,
  loadStatusColor,
  loadStatusLabel,
  calculateADG,
  getPastureHealthScore,
  pastureHealthColor,
} from '@/lib/alerts';
import { useT } from '@/lib/i18n';

interface ParcelCardProps {
  pasture: Pasture;
  herd: Herd | undefined;
  weights: WeightRecord[];
  selected: boolean;
  onClick: () => void;
}

export default function ParcelCard({ pasture, herd, weights, selected, onClick }: ParcelCardProps) {
  const { t } = useT();

  const alert = buildLoadAlert(pasture, herd);
  const statusColor = alert ? loadStatusColor(alert.status) : '#6A6A6B';
  const pct = alert?.capacityPercent ?? 0;

  const herdWeights = weights.filter((w) => w.herdId === herd?.id);
  const adg = calculateADG(herdWeights);
  const latestWeight = [...herdWeights].sort(
    (a, b) => b.weighedAt.getTime() - a.weighedAt.getTime()
  )[0];

  const daysOccupied = herd
    ? Math.round((Date.now() - herd.entryDate.getTime()) / 86_400_000)
    : 0;

  const healthScore = alert ? getPastureHealthScore(alert.status, daysOccupied) : 'excelente';
  const healthColor = pastureHealthColor(healthScore);

  // Map health score key to i18n key
  const healthScoreKey =
    healthScore === 'excelente'
      ? 'parcel.health.excellent'
      : healthScore === 'bueno'
      ? 'parcel.health.good'
      : healthScore === 'atención'
      ? 'parcel.health.attention'
      : 'parcel.health.critical';

  const statusKey =
    alert?.status === 'ok'
      ? 'parcel.status.ok'
      : alert?.status === 'warning'
      ? 'parcel.status.warning'
      : 'parcel.status.critical';

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border transition-all duration-150 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      style={{
        backgroundColor: selected ? '#1E2E1A' : '#1A1A1B',
        borderColor: selected ? statusColor : '#2A2A2B',
        boxShadow: selected ? `0 0 0 1px ${statusColor}40` : 'none',
      }}
    >
      {/* Top color bar */}
      <div className="h-1" style={{ backgroundColor: statusColor }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-white font-bold text-base leading-tight">{pasture.name}</p>
            {herd ? (
              <p className="text-muted text-xs mt-0.5">
                {herd.breed} · {herd.name}
              </p>
            ) : (
              <p className="text-muted text-xs mt-0.5 italic">{t('parcel.noHerd')}</p>
            )}
          </div>
          {/* Health score badge */}
          <div
            className="flex-shrink-0 px-2 py-1 rounded-lg text-[11px] font-bold"
            style={{ backgroundColor: healthColor + '22', color: healthColor }}
          >
            {t(healthScoreKey)}
          </div>
        </div>

        {/* Stocking bar */}
        {herd && alert && (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-muted text-xs">
                {herd.cattleCount} / {pasture.carryingCapacity} {t('parcel.heads')}
              </span>
              <span className="text-xs font-bold" style={{ color: statusColor }}>
                {pct}% — {t(statusKey)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: statusColor }}
              />
            </div>
          </div>
        )}

        {/* Metrics row */}
        <div className="flex gap-2">
          <Metric label={t('parcel.avgWeight')}>
            {latestWeight ? `${latestWeight.averageWeightKg} kg` : '—'}
          </Metric>
          <Metric label={`${t('parcel.adg')} (${t('parcel.adgUnit')})`}>
            <span
              style={{ color: adg === null ? '#6A6A6B' : adg >= 0.8 ? '#DEFF9A' : '#FFB444' }}
            >
              {adg !== null ? `${adg > 0 ? '+' : ''}${adg}` : '—'}
            </span>
          </Metric>
          <Metric label={t('parcel.daysOccupied')}>
            {herd ? String(daysOccupied) : '—'}
          </Metric>
        </div>
      </div>
    </button>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-charcoal rounded-lg p-2.5 text-center">
      <p className="text-muted text-[10px] mb-0.5 leading-tight">{label}</p>
      <p className="text-white font-bold text-sm">{children}</p>
    </div>
  );
}
