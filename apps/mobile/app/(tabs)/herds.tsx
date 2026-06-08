/**
 * @fileoverview Herd Management screen
 * Lists all herds with latest weight, ADG, and a weight recording modal.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, Modal, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { View, Text, YStack, XStack, Button } from '@geocampo/ui';
import { calculateADG, buildLoadAlert, loadStatusColor } from '@geocampo/shared';
import { DEMO_HERDS, DEMO_PASTURES, DEMO_WEIGHTS, DemoHerd } from '@/data/seed';
import { WeightRecord } from '@/services/weights';

const CHARCOAL = '#0A0A0B';
const SURFACE = '#1A1A1B';
const SURFACE2 = '#2A2A2B';
const BORDER = '#2A2A2B';
const LIME = '#DEFF9A';
const MUTED = '#6A6A6B';
const WHITE = '#FFFFFF';

// ─── Weight recording modal ─────────────────────────────────────────────────

interface WeightModalProps {
  herd: DemoHerd;
  onClose: () => void;
  onSave: (herdId: string, totalKg: number, count: number, notes: string) => void;
}

function WeightModal({ herd, onClose, onSave }: WeightModalProps) {
  const [totalKg, setTotalKg] = useState('');
  const [count, setCount] = useState(String(herd.cattleCount));
  const [notes, setNotes] = useState('');

  const avgKg = useMemo(() => {
    const t = parseFloat(totalKg);
    const c = parseInt(count, 10);
    if (!t || !c || c <= 0) return null;
    return (t / c).toFixed(1);
  }, [totalKg, count]);

  const handleSave = () => {
    const t = parseFloat(totalKg);
    const c = parseInt(count, 10);
    if (!t || t <= 0) {
      Alert.alert('Error', 'Ingresá el peso total del lote');
      return;
    }
    if (!c || c <= 0) {
      Alert.alert('Error', 'Ingresá la cantidad de animales pesados');
      return;
    }
    onSave(herd.id, t, c, notes);
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View
          backgroundColor={SURFACE}
          borderTopLeftRadius={20}
          borderTopRightRadius={20}
          padding={20}
          borderWidth={1}
          borderColor={BORDER}
        >
          {/* Handle bar */}
          <View
            width={40}
            height={4}
            backgroundColor={SURFACE2}
            borderRadius={2}
            alignSelf="center"
            marginBottom={16}
          />

          <Text color={LIME} fontSize={18} fontWeight="700" marginBottom={4}>
            Registrar pesaje
          </Text>
          <Text color={MUTED} fontSize={13} marginBottom={20}>
            {herd.name} · {herd.breed}
          </Text>

          {/* Total kg */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Peso total del lote (kg) *
          </Text>
          <TextInput
            value={totalKg}
            onChangeText={setTotalKg}
            placeholder="ej. 14400"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            style={{
              backgroundColor: SURFACE2,
              color: WHITE,
              padding: 12,
              borderRadius: 8,
              fontSize: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: BORDER,
            }}
          />

          {/* Cattle count */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Cantidad pesada (cabezas)
          </Text>
          <TextInput
            value={count}
            onChangeText={setCount}
            keyboardType="numeric"
            placeholderTextColor={MUTED}
            style={{
              backgroundColor: SURFACE2,
              color: WHITE,
              padding: 12,
              borderRadius: 8,
              fontSize: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: BORDER,
            }}
          />

          {/* Live average */}
          {avgKg && (
            <View
              backgroundColor={CHARCOAL}
              padding={12}
              borderRadius={8}
              marginBottom={16}
              borderWidth={1}
              borderColor={LIME}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text color={MUTED} fontSize={13}>Peso promedio:</Text>
                <Text color={LIME} fontSize={18} fontWeight="700">
                  {avgKg} kg/cabeza
                </Text>
              </XStack>
            </View>
          )}

          {/* Notes */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Notas (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones del pesaje..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={2}
            style={{
              backgroundColor: SURFACE2,
              color: WHITE,
              padding: 12,
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: BORDER,
              textAlignVertical: 'top',
            }}
          />

          <XStack space={12}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: BORDER,
                alignItems: 'center',
              }}
            >
              <Text color={MUTED} fontSize={15} fontWeight="600">
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                flex: 2,
                padding: 14,
                borderRadius: 10,
                backgroundColor: LIME,
                alignItems: 'center',
              }}
            >
              <Text color={CHARCOAL} fontSize={15} fontWeight="700">
                Guardar pesaje
              </Text>
            </TouchableOpacity>
          </XStack>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Herd card ──────────────────────────────────────────────────────────────

interface HerdCardProps {
  herd: DemoHerd;
  latestWeight: WeightRecord | undefined;
  adg: number | null;
  onRecordWeight: () => void;
}

function HerdCard({ herd, latestWeight, adg, onRecordWeight }: HerdCardProps) {
  const pasture = DEMO_PASTURES.find((p) => p.id === herd.pastureId);

  const loadAlert = pasture
    ? buildLoadAlert(pasture.id, pasture.name, herd.cattleCount, pasture.carryingCapacity)
    : null;

  const statusColor = loadAlert ? loadStatusColor(loadAlert.status) : MUTED;

  return (
    <View
      backgroundColor={SURFACE}
      borderRadius={12}
      borderWidth={1}
      borderColor={BORDER}
      marginBottom={12}
      overflow="hidden"
    >
      {/* Color bar for load status */}
      <View height={3} backgroundColor={statusColor} />

      <YStack padding={14} space={10}>
        {/* Header row */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            <Text color={WHITE} fontSize={15} fontWeight="700">
              {herd.name}
            </Text>
            <Text color={MUTED} fontSize={12} marginTop={2}>
              {herd.breed} · {herd.cattleCount} cabezas
            </Text>
          </YStack>
          <View
            backgroundColor={herd.status === 'active' ? '#1A3A1A' : SURFACE2}
            paddingHorizontal={8}
            paddingVertical={4}
            borderRadius={6}
          >
            <Text
              color={herd.status === 'active' ? LIME : MUTED}
              fontSize={11}
              fontWeight="600"
            >
              {herd.status === 'active' ? 'Activo' : herd.status}
            </Text>
          </View>
        </XStack>

        {/* Pasture + load */}
        {pasture && (
          <XStack alignItems="center" space={6}>
            <Text fontSize={12}>📍</Text>
            <Text color={MUTED} fontSize={12} flex={1}>
              {pasture.name}
            </Text>
            {loadAlert && (
              <Text color={statusColor} fontSize={12} fontWeight="600">
                {loadAlert.capacityPercent}% carga
              </Text>
            )}
          </XStack>
        )}

        {/* Metrics row */}
        <XStack space={8}>
          <View flex={1} backgroundColor={CHARCOAL} padding={10} borderRadius={8}>
            <Text color={MUTED} fontSize={11} marginBottom={2}>
              Último peso prom.
            </Text>
            <Text color={WHITE} fontSize={16} fontWeight="700">
              {latestWeight ? `${latestWeight.average_weight_kg} kg` : '—'}
            </Text>
          </View>
          <View flex={1} backgroundColor={CHARCOAL} padding={10} borderRadius={8}>
            <Text color={MUTED} fontSize={11} marginBottom={2}>
              GDP (kg/día)
            </Text>
            <Text
              color={adg !== null ? (adg >= 0.8 ? LIME : '#FFB444') : MUTED}
              fontSize={16}
              fontWeight="700"
            >
              {adg !== null ? `${adg > 0 ? '+' : ''}${adg}` : '—'}
            </Text>
          </View>
        </XStack>

        {/* Action */}
        <TouchableOpacity
          onPress={onRecordWeight}
          style={{
            backgroundColor: SURFACE2,
            borderRadius: 8,
            padding: 10,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: LIME,
          }}
        >
          <Text color={LIME} fontSize={13} fontWeight="600">
            ⚖️  Registrar pesaje
          </Text>
        </TouchableOpacity>
      </YStack>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function HerdsScreen() {
  const [selectedHerd, setSelectedHerd] = useState<DemoHerd | null>(null);
  const [localWeights, setLocalWeights] = useState<WeightRecord[]>(DEMO_WEIGHTS);

  const herdsWithMetrics = useMemo(() => {
    return DEMO_HERDS.map((herd) => {
      const weights = localWeights
        .filter((w) => w.herd_id === herd.id)
        .sort((a, b) => b.weighed_at - a.weighed_at);

      const latestWeight = weights[0];

      const weightDomain = weights.map((w) => ({
        id: w.id,
        herdId: w.herd_id,
        weightKg: w.weight_kg,
        cattleCount: w.cattle_count,
        averageWeightKg: w.average_weight_kg,
        weighedAt: new Date(w.weighed_at),
        createdAt: new Date(w.created_at),
      }));

      const adg = calculateADG(weightDomain);
      return { herd, latestWeight, adg };
    });
  }, [localWeights]);

  const totalCattle = useMemo(
    () => DEMO_HERDS.reduce((s, h) => s + h.cattleCount, 0),
    []
  );

  const handleSaveWeight = useCallback(
    (herdId: string, totalKg: number, count: number, notes: string) => {
      const now = Date.now();
      const newRecord: WeightRecord = {
        id: `w-${now}`,
        herd_id: herdId,
        weight_kg: totalKg,
        cattle_count: count,
        average_weight_kg: Math.round((totalKg / count) * 10) / 10,
        weighed_at: now,
        weighed_by: 'Usuario',
        notes: notes || null,
        created_at: now,
      };
      setLocalWeights((prev) => [...prev, newRecord]);
      Alert.alert(
        '✅ Pesaje registrado',
        `Peso promedio: ${newRecord.average_weight_kg} kg/cabeza`
      );
    },
    []
  );

  return (
    <View flex={1} backgroundColor={CHARCOAL}>
      {/* Header */}
      <View
        backgroundColor={SURFACE}
        padding={16}
        paddingTop={8}
        borderBottomWidth={1}
        borderColor={BORDER}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text color={LIME} fontSize={20} fontWeight="700">
              Gestión de lotes
            </Text>
            <Text color={MUTED} fontSize={12} marginTop={2}>
              {DEMO_HERDS.length} lotes · {totalCattle} cabezas totales
            </Text>
          </YStack>
        </XStack>
      </View>

      {/* Herd list */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {herdsWithMetrics.map(({ herd, latestWeight, adg }) => (
          <HerdCard
            key={herd.id}
            herd={herd}
            latestWeight={latestWeight}
            adg={adg}
            onRecordWeight={() => setSelectedHerd(herd)}
          />
        ))}
      </ScrollView>

      {/* Weight modal */}
      {selectedHerd && (
        <WeightModal
          herd={selectedHerd}
          onClose={() => setSelectedHerd(null)}
          onSave={handleSaveWeight}
        />
      )}
    </View>
  );
}
