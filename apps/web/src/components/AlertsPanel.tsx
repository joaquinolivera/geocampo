'use client';

import { useFarmData } from '@/lib/FarmDataContext';
import {
  buildLoadAlert,
  loadStatusColor,
  getDueStatus,
  daysUntilDue,
  treatmentTypeLabel,
  dueStatusColor,
} from '@/lib/alerts';
import { useT } from '@/lib/i18n';

interface AlertsPanelProps {
  onSelectPasture: (id: string) => void;
}

export default function AlertsPanel({ onSelectPasture }: AlertsPanelProps) {
  const { t } = useT();
  const { PASTURES, HERDS, HEALTH_RECORDS } = useFarmData();

  // Load alerts (warning / critical only)
  const loadAlerts = PASTURES.flatMap((p) => {
    const herd = HERDS.find((h) => h.pastureId === p.id);
    const alert = buildLoadAlert(p, herd);
    return alert && alert.status !== 'ok' ? [{ ...alert, pastureId: p.id }] : [];
  }).sort((a, b) => b.capacityPercent - a.capacityPercent);

  // Health alerts (overdue + urgent only)
  const healthAlerts = HEALTH_RECORDS.filter((r) => {
    if (!r.nextDueDate) return false;
    const status = getDueStatus(r.nextDueDate);
    return status === 'overdue' || status === 'urgent';
  }).sort((a, b) => (a.nextDueDate?.getTime() ?? 0) - (b.nextDueDate?.getTime() ?? 0));

  const totalAlerts = loadAlerts.length + healthAlerts.length;

  if (totalAlerts === 0) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          {t('alerts.title')}
        </p>
        <div className="text-center py-3">
          <span className="text-2xl">✅</span>
          <p className="text-muted text-xs mt-1">{t('alerts.none')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-surface2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
        {t('alerts.title')}
        <span className="bg-critical/20 text-critical text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {totalAlerts}
        </span>
      </p>

      <div className="space-y-2">
        {/* Load alerts */}
        {loadAlerts.map((alert) => {
          const color = loadStatusColor(alert.status);
          return (
            <button
              key={alert.pastureId}
              onClick={() => onSelectPasture(alert.pastureId)}
              className="w-full text-left flex items-center gap-3 rounded-lg p-2.5 border transition-colors hover:border-warning/50"
              style={{ backgroundColor: color + '12', borderColor: color + '40' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{alert.pastureName}</p>
                <p className="text-[11px]" style={{ color }}>
                  {t('alerts.overload', {
                    count: alert.cattleCount,
                    capacity: alert.carryingCapacity,
                    pct: alert.capacityPercent,
                  })}
                </p>
              </div>
            </button>
          );
        })}

        {/* Health alerts */}
        {healthAlerts.map((record) => {
          if (!record.nextDueDate) return null;
          const status = getDueStatus(record.nextDueDate);
          const color = dueStatusColor(status);
          const days = daysUntilDue(record.nextDueDate);
          const herd = HERDS.find((h) => h.id === record.herdId);
          const pasture = PASTURES.find((p) => p.id === herd?.pastureId);

          const dueLabel =
            days < 0
              ? t('alerts.overdueDays', { days: Math.abs(days) })
              : t('alerts.dueIn', { days });

          return (
            <button
              key={record.id}
              onClick={() => pasture && onSelectPasture(pasture.id)}
              className="w-full text-left flex items-center gap-3 rounded-lg p-2.5 border transition-colors"
              style={{ backgroundColor: color + '12', borderColor: color + '40' }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {treatmentTypeLabel(record.treatmentType)}
                  {record.productName ? ` — ${record.productName}` : ''}
                </p>
                <p className="text-[11px]" style={{ color }}>
                  {herd?.name} · {dueLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
