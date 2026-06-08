'use client';

import { useFarmData } from '@/lib/FarmDataContext';
import { useT } from '@/lib/i18n';

const CONDITION_COLOR: Record<string, string> = {
  buena: '#DEFF9A',
  regular: '#FFB444',
  mala: '#FF4444',
};

const TYPE_COLOR: Record<string, string> = {
  water: '#38BDF8',
  fence: '#94A3B8',
  corral: '#FB923C',
  building: '#D4B483',
};

interface InfraDetailPanelProps {
  featureId: string;
  onClose: () => void;
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-surface2 last:border-0">
      <span className="text-muted text-sm">{label}</span>
      <span className="text-sm font-semibold" style={{ color: color ?? '#FFFFFF' }}>
        {value}
      </span>
    </div>
  );
}

export default function InfraDetailPanel({ featureId, onClose }: InfraDetailPanelProps) {
  const { t } = useT();
  const { INFRASTRUCTURE } = useFarmData();
  const feature = INFRASTRUCTURE.find((f) => f.id === featureId);
  if (!feature) return null;

  const color = TYPE_COLOR[feature.type] ?? '#DEFF9A';
  const condColor = CONDITION_COLOR[feature.condition] ?? '#DEFF9A';

  // Condition label keys: buena→good, regular→fair, mala→poor
  const conditionKey =
    feature.condition === 'buena'
      ? 'infra.condition.good'
      : feature.condition === 'regular'
      ? 'infra.condition.fair'
      : 'infra.condition.poor';

  // Geometry type label
  const geoLabel =
    feature.geometry.type === 'Point'
      ? t('infra.geoPoint')
      : feature.geometry.type === 'LineString'
      ? t('infra.geoLine')
      : t('infra.geoPoly');

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-80 flex flex-col border-l border-surface2 overflow-y-auto shadow-2xl z-10"
      style={{ backgroundColor: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(12px)' }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 p-5 border-b border-surface2"
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">
              {t(`infra.types.${feature.type}`)}
            </p>
            <h2 className="text-white text-xl font-bold leading-tight">{feature.name}</h2>
            <p className="text-muted text-sm mt-0.5 capitalize">{feature.subtype}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-white transition-colors text-xl leading-none p-1"
            title={t('auth.close')}
          >
            ×
          </button>
        </div>

        {/* Condition badge */}
        <div
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
          style={{ backgroundColor: condColor + '15', borderColor: condColor + '40' }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: condColor }} />
          <span className="text-sm font-semibold" style={{ color: condColor }}>
            {t('infra.conditionLabel')} {t(conditionKey)}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 p-5 space-y-5">

        {/* Attributes */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {t('infra.details')}
          </p>
          <div className="bg-surface rounded-xl px-4">
            <Row label={t('infra.type')} value={t(`infra.types.${feature.type}`)} color={color} />
            <Row
              label={t('infra.subtype')}
              value={feature.subtype.charAt(0).toUpperCase() + feature.subtype.slice(1)}
            />
            <Row label={t('infra.conditionLabel').replace(':', '')} value={t(conditionKey)} color={condColor} />
            {feature.capacity != null && (
              <Row
                label={
                  feature.type === 'water'
                    ? t('infra.capacityWater')
                    : t('infra.capacityCorral')
                }
                value={String(feature.capacity)}
              />
            )}
          </div>
        </div>

        {/* Notes */}
        {feature.notes && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              {t('infra.observations')}
            </p>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-white text-sm leading-relaxed">{feature.notes}</p>
            </div>
          </div>
        )}

        {/* Geometry */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {t('infra.geometry')}
          </p>
          <div className="bg-surface rounded-xl px-4">
            <Row label={t('infra.geometryType')} value={geoLabel} />
            {feature.geometry.type === 'Point' && (
              <>
                <Row
                  label={t('infra.longitude')}
                  value={feature.geometry.coordinates[0].toFixed(5) + '°'}
                />
                <Row
                  label={t('infra.latitude')}
                  value={feature.geometry.coordinates[1].toFixed(5) + '°'}
                />
              </>
            )}
          </div>
        </div>

        {/* Maintenance prompt */}
        {feature.condition !== 'buena' && (
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: condColor + '12',
              borderColor: condColor + '40',
            }}
          >
            <p className="font-semibold text-sm mb-1" style={{ color: condColor }}>
              {feature.condition === 'regular'
                ? t('infra.maintenanceRec')
                : t('infra.maintenanceUrgent')}
            </p>
            <p className="text-muted text-xs leading-relaxed">
              {feature.condition === 'regular'
                ? t('infra.maintenanceBodyFair')
                : t('infra.maintenanceBodyPoor')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
