'use client';

import { useT } from '@/lib/i18n';
import { useFarmData } from '@/lib/FarmDataContext';

export default function MovementsLog() {
  const { t } = useT();
  const { MOVEMENTS } = useFarmData();
  const recent = [...MOVEMENTS]
    .sort((a, b) => b.movedAt.getTime() - a.movedAt.getTime())
    .slice(0, 5);

  return (
    <div className="px-4 py-3 border-t border-surface2">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        {t('movements.title')}
      </p>
      <div className="space-y-2">
        {recent.map((m) => {
          const daysAgo = Math.round((Date.now() - m.movedAt.getTime()) / 86_400_000);
          const timeLabel =
            daysAgo === 0 ? t('movements.today') : t('movements.daysAgo', { days: daysAgo });

          return (
            <div key={m.id} className="flex items-start gap-3">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold leading-tight truncate">
                  {m.herdName}
                </p>
                <p className="text-muted text-[11px]">
                  {m.fromPastureName ? `${m.fromPastureName} → ` : ''}
                  {m.toPastureName}
                </p>
                <p className="text-muted text-[10px]">
                  {timeLabel} · {t('movements.by')} {m.movedBy}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
