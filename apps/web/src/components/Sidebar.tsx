'use client';

import { useState } from 'react';
import { type InfrastructureFeature } from '@/lib/data';
import { useFarmData } from '@/lib/FarmDataContext';
import type { SelectionState } from '@/lib/selection';
import { useT } from '@/lib/i18n';
import ParcelCard from './ParcelCard';
import AlertsPanel from './AlertsPanel';
import MovementsLog from './MovementsLog';

const INFRA_COLOR: Record<InfrastructureFeature['type'], string> = {
  water: '#38BDF8',
  fence: '#94A3B8',
  corral: '#FB923C',
  building: '#D4B483',
};

const INFRA_ICON: Record<string, string> = {
  tajamar: '💧', molino: '⚙️', bebedero: '🪣', pozo: '🪣',
  casco: '🏠', galpon: '🏗️', tambo: '🏚️', otro: '📍',
  manga: '🟧', corral: '🟧', bañadero: '🛁', embarcadero: '🚢',
  alambrado: '━━',
};

const CONDITION_DOT: Record<string, string> = {
  buena: '#DEFF9A',
  regular: '#FFB444',
  mala: '#FF4444',
};

type SidebarTab = 'potreros' | 'infraestructura';

interface SidebarProps {
  selection: SelectionState;
  onSelect: (s: SelectionState) => void;
}

export default function Sidebar({ selection, onSelect }: SidebarProps) {
  const { t } = useT();
  const { PASTURES, HERDS, WEIGHTS, INFRASTRUCTURE } = useFarmData();
  const [tab, setTab] = useState<SidebarTab>('potreros');

  const selectedPastureId = selection?.type === 'pasture' ? selection.id : null;
  const selectedInfraId   = selection?.type === 'infra'   ? selection.id : null;

  // Group infrastructure by type
  const infraByType = INFRASTRUCTURE.reduce<Record<InfrastructureFeature['type'], InfrastructureFeature[]>>(
    (acc, f) => {
      if (!acc[f.type]) acc[f.type] = [];
      acc[f.type].push(f);
      return acc;
    },
    {} as Record<InfrastructureFeature['type'], InfrastructureFeature[]>
  );

  const tabs = [
    { key: 'potreros' as const, label: `🌿 ${t('sidebar.tabPastures')}` },
    { key: 'infraestructura' as const, label: `🏗️ ${t('sidebar.tabInfra')}` },
  ];

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col border-r border-surface2 overflow-hidden bg-charcoal">
      {/* Tab bar */}
      <div className="flex border-b border-surface2 flex-shrink-0">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{
              color: tab === key ? '#DEFF9A' : '#6A6A6B',
              borderBottom: tab === key ? '2px solid #DEFF9A' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'potreros' ? (
          <>
            <div className="px-4 pt-4 pb-2 space-y-3">
              {PASTURES.map((pasture) => {
                const herd = HERDS.find((h) => h.pastureId === pasture.id);
                const weights = WEIGHTS.filter((w) => w.herdId === herd?.id);
                return (
                  <ParcelCard
                    key={pasture.id}
                    pasture={pasture}
                    herd={herd}
                    weights={weights}
                    selected={selectedPastureId === pasture.id}
                    onClick={() =>
                      onSelect(
                        selectedPastureId === pasture.id
                          ? null
                          : { type: 'pasture', id: pasture.id }
                      )
                    }
                  />
                );
              })}
            </div>
            <AlertsPanel onSelectPasture={(id) => onSelect({ type: 'pasture', id })} />
            <MovementsLog />
          </>
        ) : (
          /* Infrastructure tab */
          <div className="px-4 pt-4 pb-4 space-y-5">
            {(Object.keys(infraByType) as InfrastructureFeature['type'][]).map((type) => (
              <div key={type}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: INFRA_COLOR[type] }}
                  />
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: INFRA_COLOR[type] }}
                  >
                    {t(`infra.typeShort.${type}`)}
                  </p>
                  <span className="text-muted text-[10px]">({infraByType[type].length})</span>
                </div>

                {/* Feature rows */}
                <div className="space-y-2">
                  {infraByType[type].map((f) => {
                    const isSelected = selectedInfraId === f.id;
                    const condColor = CONDITION_DOT[f.condition] ?? '#DEFF9A';
                    const typeColor = INFRA_COLOR[f.type];

                    return (
                      <button
                        key={f.id}
                        onClick={() =>
                          onSelect(isSelected ? null : { type: 'infra', id: f.id })
                        }
                        className="w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all"
                        style={{
                          backgroundColor: isSelected ? typeColor + '15' : '#1A1A1B',
                          borderColor: isSelected ? typeColor : '#2A2A2B',
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 border"
                          style={{
                            backgroundColor: '#0A0A0B',
                            borderColor: isSelected ? typeColor : '#2A2A2B',
                          }}
                        >
                          {INFRA_ICON[f.subtype] ?? '📍'}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-semibold leading-tight truncate">
                            {f.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: condColor }}
                            />
                            <p className="text-muted text-[11px] capitalize">{f.subtype}</p>
                            {f.capacity != null && (
                              <p className="text-muted text-[11px]">
                                · {f.capacity}{' '}
                                {f.type === 'water'
                                  ? t('infra.capacityUnit.water')
                                  : t('infra.capacityUnit.corral')}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-surface2">
        <p className="text-muted text-[10px] text-center">{t('sidebar.demoData')}</p>
      </div>
    </aside>
  );
}
