'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { buildLoadAlert, getDueStatus } from '@/lib/alerts';
import { IS_DEMO_MODE, clearDemoSession, getBrowserClient } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { useFarmData } from '@/lib/FarmDataContext';
import LanguageToggle from './LanguageToggle';

interface TopBarProps {
  onLogout?: () => void;
  onToggleERP?: () => void;
  erpOpen?: boolean;
  onToggleChat?: () => void;
  chatOpen?: boolean;
}

export default function TopBar({ onLogout, onToggleERP, erpOpen, onToggleChat, chatOpen }: TopBarProps) {
  const router = useRouter();
  const { t } = useT();
  const { DEMO_FARM, HERDS, PASTURES, HEALTH_RECORDS } = useFarmData();

  const totalCattle = useMemo(
    () => HERDS.reduce((sum, h) => sum + h.cattleCount, 0),
    [HERDS]
  );

  const loadAlerts = useMemo(
    () =>
      PASTURES.filter((p) => {
        const herd = HERDS.find((h) => h.pastureId === p.id);
        const alert = buildLoadAlert(p, herd);
        return alert && alert.status !== 'ok';
      }).length,
    [PASTURES, HERDS]
  );

  const healthAlerts = useMemo(
    () =>
      HEALTH_RECORDS.filter((r) => {
        if (!r.nextDueDate) return false;
        const s = getDueStatus(r.nextDueDate);
        return s === 'overdue' || s === 'urgent';
      }).length,
    [HEALTH_RECORDS]
  );

  const totalAlerts = loadAlerts + healthAlerts;

  const handleLogout = async () => {
    onLogout?.();
    if (IS_DEMO_MODE) {
      clearDemoSession();
    } else {
      const client = getBrowserClient();
      await client?.auth.signOut();
    }
    router.push('/login');
  };

  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between px-5 border-b border-surface2 bg-charcoal z-20">
      {/* Logo + farm name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <span className="text-lime font-bold text-lg tracking-tight">GeoCampo</span>
        </div>
        <div className="h-4 w-px bg-surface2" />
        <div>
          <span className="text-white font-semibold text-sm">{DEMO_FARM.name}</span>
          <span className="text-muted text-xs ml-2">{DEMO_FARM.ownerName}</span>
        </div>
      </div>

      {/* Right: metrics + controls */}
      <div className="flex items-center gap-3">
        {/* Total cattle */}
        <Metric icon="🐄" value={totalCattle} label={t('topbar.cattle')} />
        <Divider />

        {/* Pastures */}
        <Metric icon="📍" value={PASTURES.length} label={t('topbar.pastures')} />
        <Divider />

        {/* Area */}
        <Metric
          icon="🗺️"
          value={DEMO_FARM.totalAreaHectares.toFixed(0)}
          label={t('topbar.hectares')}
        />

        {/* Alerts badge */}
        {totalAlerts > 0 && (
          <>
            <Divider />
            <div className="flex items-center gap-2 bg-critical/10 border border-critical/30 rounded-lg px-3 py-1.5">
              <span className="text-critical text-sm">⚠️</span>
              <div>
                <p className="text-critical font-bold text-sm leading-none">{totalAlerts}</p>
                <p className="text-critical/70 text-[10px]">
                  {totalAlerts === 1 ? t('topbar.alert') : t('topbar.alerts')}
                </p>
              </div>
            </div>
          </>
        )}

        {totalAlerts === 0 && (
          <>
            <Divider />
            <div className="flex items-center gap-2 bg-lime/10 border border-lime/20 rounded-lg px-3 py-1.5">
              <span className="text-lime text-sm">✅</span>
              <p className="text-lime text-xs font-medium">{t('topbar.allGood')}</p>
            </div>
          </>
        )}

        {/* ERP toggle */}
        {onToggleERP && (
          <>
            <Divider />
            <button
              onClick={onToggleERP}
              className="text-xs px-2 py-1 rounded-lg border transition-colors"
              style={{
                borderColor: erpOpen ? '#DEFF9A' : '#2A2A2B',
                color: erpOpen ? '#DEFF9A' : '#6A6A6B',
                backgroundColor: erpOpen ? '#DEFF9A15' : 'transparent',
              }}
              title="Panel ERP"
            >
              🏢 ERP
            </button>
          </>
        )}

        {/* AI Chat toggle */}
        {onToggleChat && (
          <>
            <Divider />
            <button
              onClick={onToggleChat}
              className="text-xs px-2 py-1 rounded-lg border transition-colors"
              style={{
                borderColor: chatOpen ? '#DEFF9A' : '#2A2A2B',
                color: chatOpen ? '#DEFF9A' : '#6A6A6B',
                backgroundColor: chatOpen ? '#DEFF9A15' : 'transparent',
              }}
              title="Asistente IA"
            >
              🤖 IA
            </button>
          </>
        )}

        {/* Language toggle */}
        <Divider />
        <LanguageToggle />

        {/* Logout */}
        <Divider />
        <button
          onClick={handleLogout}
          className="text-muted text-xs hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-surface2"
          title={t('auth.logout')}
        >
          {t('auth.logout')} →
        </button>
      </div>
    </header>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{icon}</span>
      <div className="text-right">
        <p className="text-white font-bold text-sm leading-none">{value}</p>
        <p className="text-muted text-[10px]">{label}</p>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-4 w-px bg-surface2" />;
}
