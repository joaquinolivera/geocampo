/**
 * @fileoverview Home / Dashboard screen
 * Farm overview with alert summary and quick stats.
 */

import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { View, Text, YStack, XStack } from '@geocampo/ui';
import {
  buildLoadAlert,
  getActiveAlerts,
  calculateADG,
  loadStatusColor,
  loadStatusLabel,
} from '@geocampo/shared';
import { getDueStatus, daysUntilDue, treatmentTypeLabel, dueStatusColor } from '@/services/health';
import { DEMO_FARM, DEMO_PASTURES, DEMO_HERDS, DEMO_WEIGHTS, DEMO_HEALTH } from '@/data/seed';

const CHARCOAL = '#0A0A0B';
const SURFACE = '#1A1A1B';
const BORDER = '#2A2A2B';
const LIME = '#DEFF9A';
const MUTED = '#6A6A6B';
const WHITE = '#FFFFFF';

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text color={LIME} fontSize={14} fontWeight="600" marginBottom={8} marginTop={4}>
      {title.toUpperCase()}
    </Text>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = WHITE,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <View
      flex={1}
      backgroundColor={SURFACE}
      padding={14}
      borderRadius={10}
      borderWidth={1}
      borderColor={BORDER}
    >
      <Text color={color} fontSize={24} fontWeight="700">
        {value}
      </Text>
      <Text color={WHITE} fontSize={12} fontWeight="500" marginTop={2}>
        {label}
      </Text>
      {sub ? (
        <Text color={MUTED} fontSize={11} marginTop={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function AlertCard({
  title,
  sub,
  color,
  icon,
}: {
  title: string;
  sub: string;
  color: string;
  icon: string;
}) {
  return (
    <View
      backgroundColor={SURFACE}
      padding={14}
      borderRadius={10}
      borderWidth={1}
      borderColor={color}
      marginBottom={8}
    >
      <XStack space={10} alignItems="center">
        <Text fontSize={20}>{icon}</Text>
        <YStack flex={1}>
          <Text color={color} fontSize={13} fontWeight="600">
            {title}
          </Text>
          <Text color={MUTED} fontSize={12} marginTop={2}>
            {sub}
          </Text>
        </YStack>
      </XStack>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  // Stocking load alerts
  const loadAlerts = useMemo(() => {
    const alerts = DEMO_PASTURES.map((p) => {
      const herd = DEMO_HERDS.find((h) => h.pastureId === p.id);
      if (!herd) return null;
      return buildLoadAlert(p.id, p.name, herd.cattleCount, p.carryingCapacity);
    }).filter(Boolean) as ReturnType<typeof buildLoadAlert>[];
    return getActiveAlerts(alerts.filter(Boolean) as NonNullable<typeof alerts[0]>[]);
  }, []);

  // Health alerts (overdue + urgent upcoming)
  const healthAlerts = useMemo(() => {
    return DEMO_HEALTH.filter((h) => {
      if (!h.next_due_date) return false;
      const status = getDueStatus(h.next_due_date);
      return status === 'overdue' || status === 'urgent';
    });
  }, []);

  // Total cattle
  const totalCattle = useMemo(
    () => DEMO_HERDS.reduce((sum, h) => sum + h.cattleCount, 0),
    []
  );

  // Latest ADG per herd
  const herdADGs = useMemo(() => {
    return DEMO_HERDS.map((herd) => {
      const weights = DEMO_WEIGHTS.filter((w) => w.herd_id === herd.id).map((w) => ({
        id: w.id,
        herdId: w.herd_id,
        weightKg: w.weight_kg,
        cattleCount: w.cattle_count,
        averageWeightKg: w.average_weight_kg,
        weighedAt: new Date(w.weighed_at),
        createdAt: new Date(w.created_at),
      }));
      const adg = calculateADG(weights);
      return { herd, adg };
    });
  }, []);

  const totalAlerts = loadAlerts.length + healthAlerts.length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: CHARCOAL }}>
      <YStack padding={16} space={20}>

        {/* Farm header */}
        <YStack>
          <Text color={LIME} fontSize={22} fontWeight="700">
            {DEMO_FARM.name}
          </Text>
          <Text color={MUTED} fontSize={13} marginTop={2}>
            {DEMO_FARM.ownerName} · {DEMO_FARM.totalAreaHectares} ha totales
          </Text>
        </YStack>

        {/* Quick stats */}
        <YStack space={8}>
          <SectionHeader title="Resumen" />
          <XStack space={8}>
            <StatCard
              label="Cabezas totales"
              value={totalCattle}
              sub={`${DEMO_HERDS.length} lotes activos`}
              color={LIME}
            />
            <StatCard
              label="Potreros"
              value={DEMO_PASTURES.length}
              sub={`${DEMO_FARM.totalAreaHectares} ha`}
            />
          </XStack>
          <XStack space={8}>
            <StatCard
              label="Alertas activas"
              value={totalAlerts}
              sub={totalAlerts > 0 ? 'Requieren atención' : 'Todo en orden'}
              color={totalAlerts > 0 ? '#FF4444' : LIME}
            />
            <StatCard
              label="Pesajes (30 días)"
              value={DEMO_WEIGHTS.filter(
                (w) => w.weighed_at > Date.now() - 30 * 24 * 60 * 60 * 1000
              ).length}
              sub="registros recientes"
            />
          </XStack>
        </YStack>

        {/* Load alerts */}
        {loadAlerts.length > 0 && (
          <YStack space={4}>
            <SectionHeader title="Alertas de carga" />
            {loadAlerts.map((alert) => (
              <AlertCard
                key={alert.pastureId}
                title={`${alert.pastureName} — ${alert.capacityPercent}% de capacidad`}
                sub={`${alert.cattleCount} / ${alert.carryingCapacity} animales · ${loadStatusLabel(alert.status)}`}
                color={loadStatusColor(alert.status)}
                icon={alert.status === 'critical' ? '🔴' : '🟡'}
              />
            ))}
          </YStack>
        )}

        {/* Health alerts */}
        {healthAlerts.length > 0 && (
          <YStack space={4}>
            <SectionHeader title="Sanitaria pendiente" />
            {healthAlerts.map((record) => {
              const status = getDueStatus(record.next_due_date!);
              const days = daysUntilDue(record.next_due_date!);
              const herd = DEMO_HERDS.find((h) => h.id === record.herd_id);
              const daysLabel =
                days < 0
                  ? `Vencido hace ${Math.abs(days)} días`
                  : `Vence en ${days} días`;
              return (
                <AlertCard
                  key={record.id}
                  title={`${treatmentTypeLabel(record.treatment_type)}${record.product_name ? ` — ${record.product_name}` : ''}`}
                  sub={`${herd?.name ?? record.herd_id} · ${daysLabel}`}
                  color={dueStatusColor(status)}
                  icon={status === 'overdue' ? '💉' : '⚠️'}
                />
              );
            })}
          </YStack>
        )}

        {/* ADG per herd */}
        <YStack space={4}>
          <SectionHeader title="Ganancia diaria de peso (GDP)" />
          {herdADGs.map(({ herd, adg }) => {
            const latestWeight = DEMO_WEIGHTS.filter((w) => w.herd_id === herd.id).sort(
              (a, b) => b.weighed_at - a.weighed_at
            )[0];
            return (
              <View
                key={herd.id}
                backgroundColor={SURFACE}
                padding={14}
                borderRadius={10}
                borderWidth={1}
                borderColor={BORDER}
                marginBottom={8}
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack flex={1}>
                    <Text color={WHITE} fontSize={13} fontWeight="600">
                      {herd.name}
                    </Text>
                    <Text color={MUTED} fontSize={12} marginTop={2}>
                      {herd.cattleCount} cabezas · {herd.breed}
                    </Text>
                    {latestWeight && (
                      <Text color={MUTED} fontSize={11} marginTop={2}>
                        Último peso prom.: {latestWeight.average_weight_kg} kg
                      </Text>
                    )}
                  </YStack>
                  <YStack alignItems="flex-end">
                    {adg !== null ? (
                      <>
                        <Text
                          color={adg >= 0.8 ? LIME : '#FFB444'}
                          fontSize={20}
                          fontWeight="700"
                        >
                          {adg > 0 ? '+' : ''}{adg}
                        </Text>
                        <Text color={MUTED} fontSize={11}>
                          kg/día
                        </Text>
                      </>
                    ) : (
                      <Text color={MUTED} fontSize={12}>
                        Sin datos
                      </Text>
                    )}
                  </YStack>
                </XStack>
              </View>
            );
          })}
        </YStack>
      </YStack>
    </ScrollView>
  );
}
