/**
 * @fileoverview Health & Vaccination screen
 * Upcoming treatment calendar with urgency coding and treatment recording modal.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, Modal, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { View, Text, YStack, XStack } from '@geocampo/ui';
import {
  getDueStatus,
  daysUntilDue,
  treatmentTypeLabel,
  dueStatusColor,
  TreatmentType,
  HealthRecord,
} from '@/services/health';
import { DEMO_HERDS, DEMO_HEALTH } from '@/data/seed';

const CHARCOAL = '#0A0A0B';
const SURFACE = '#1A1A1B';
const SURFACE2 = '#2A2A2B';
const BORDER = '#2A2A2B';
const LIME = '#DEFF9A';
const MUTED = '#6A6A6B';
const WHITE = '#FFFFFF';

const TREATMENT_TYPES: { value: TreatmentType; label: string }[] = [
  { value: 'vaccination', label: 'Vacunación' },
  { value: 'deworming', label: 'Desparasitación' },
  { value: 'treatment', label: 'Tratamiento' },
  { value: 'checkup', label: 'Control veterinario' },
];

// ─── Treatment form modal ───────────────────────────────────────────────────

interface TreatmentModalProps {
  onClose: () => void;
  onSave: (record: Omit<HealthRecord, 'id' | 'created_at'>) => void;
}

function TreatmentModal({ onClose, onSave }: TreatmentModalProps) {
  const [selectedHerdId, setSelectedHerdId] = useState(DEMO_HERDS[0].id);
  const [treatmentType, setTreatmentType] = useState<TreatmentType>('vaccination');
  const [productName, setProductName] = useState('');
  const [dosage, setDosage] = useState('');
  const [administeredBy, setAdministeredBy] = useState('');
  const [nextDueDays, setNextDueDays] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!administeredBy.trim()) {
      Alert.alert('Error', 'Ingresá quién aplicó el tratamiento');
      return;
    }
    const nextDueDate =
      nextDueDays && parseInt(nextDueDays) > 0
        ? Date.now() + parseInt(nextDueDays) * 24 * 60 * 60 * 1000
        : null;

    onSave({
      herd_id: selectedHerdId,
      treatment_type: treatmentType,
      product_name: productName.trim() || null,
      dosage: dosage.trim() || null,
      administered_by: administeredBy.trim(),
      administered_at: Date.now(),
      next_due_date: nextDueDate,
      notes: notes.trim() || null,
    });
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
          <View
            width={40}
            height={4}
            backgroundColor={SURFACE2}
            borderRadius={2}
            alignSelf="center"
            marginBottom={16}
          />

          <Text color={LIME} fontSize={18} fontWeight="700" marginBottom={16}>
            Registrar tratamiento
          </Text>

          {/* Herd selector */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Lote *
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 16 }}
          >
            <XStack space={8}>
              {DEMO_HERDS.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  onPress={() => setSelectedHerdId(h.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: selectedHerdId === h.id ? LIME : BORDER,
                    backgroundColor: selectedHerdId === h.id ? '#1A2E1A' : SURFACE2,
                  }}
                >
                  <Text
                    color={selectedHerdId === h.id ? LIME : MUTED}
                    fontSize={12}
                    fontWeight="600"
                  >
                    {h.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </XStack>
          </ScrollView>

          {/* Treatment type */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Tipo de tratamiento *
          </Text>
          <View flexDirection="row" flexWrap="wrap" gap={8} marginBottom={16}>
            {TREATMENT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setTreatmentType(t.value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: treatmentType === t.value ? LIME : BORDER,
                  backgroundColor: treatmentType === t.value ? '#1A2E1A' : SURFACE2,
                }}
              >
                <Text
                  color={treatmentType === t.value ? LIME : MUTED}
                  fontSize={12}
                  fontWeight="600"
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Product & dosage */}
          <XStack space={10} marginBottom={12}>
            <YStack flex={1}>
              <Text color={WHITE} fontSize={12} fontWeight="600" marginBottom={6}>
                Producto
              </Text>
              <TextInput
                value={productName}
                onChangeText={setProductName}
                placeholder="ej. Clostrisan"
                placeholderTextColor={MUTED}
                style={{
                  backgroundColor: SURFACE2,
                  color: WHITE,
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: BORDER,
                }}
              />
            </YStack>
            <YStack flex={1}>
              <Text color={WHITE} fontSize={12} fontWeight="600" marginBottom={6}>
                Dosis
              </Text>
              <TextInput
                value={dosage}
                onChangeText={setDosage}
                placeholder="ej. 2ml"
                placeholderTextColor={MUTED}
                style={{
                  backgroundColor: SURFACE2,
                  color: WHITE,
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 13,
                  borderWidth: 1,
                  borderColor: BORDER,
                }}
              />
            </YStack>
          </XStack>

          {/* Administered by */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Aplicado por *
          </Text>
          <TextInput
            value={administeredBy}
            onChangeText={setAdministeredBy}
            placeholder="ej. Dr. García"
            placeholderTextColor={MUTED}
            style={{
              backgroundColor: SURFACE2,
              color: WHITE,
              padding: 10,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: BORDER,
            }}
          />

          {/* Next due in days */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Próximo vencimiento (días)
          </Text>
          <TextInput
            value={nextDueDays}
            onChangeText={setNextDueDays}
            placeholder="ej. 180"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
            style={{
              backgroundColor: SURFACE2,
              color: WHITE,
              padding: 10,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: BORDER,
            }}
          />

          {/* Notes */}
          <Text color={WHITE} fontSize={13} fontWeight="600" marginBottom={6}>
            Notas
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={2}
            style={{
              backgroundColor: SURFACE2,
              color: WHITE,
              padding: 10,
              borderRadius: 8,
              fontSize: 13,
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
              <Text color={MUTED} fontSize={14} fontWeight="600">
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
              <Text color={CHARCOAL} fontSize={14} fontWeight="700">
                Guardar
              </Text>
            </TouchableOpacity>
          </XStack>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Treatment row ──────────────────────────────────────────────────────────

function TreatmentRow({ record }: { record: HealthRecord }) {
  const herd = DEMO_HERDS.find((h) => h.id === record.herd_id);
  const hasdue = record.next_due_date != null;
  const status = hasdue ? getDueStatus(record.next_due_date!) : null;
  const days = hasdue ? daysUntilDue(record.next_due_date!) : null;
  const color = status ? dueStatusColor(status) : MUTED;

  const daysLabel = !hasdue
    ? 'Sin vencimiento'
    : days! < 0
    ? `Vencido hace ${Math.abs(days!)} días`
    : days === 0
    ? 'Vence hoy'
    : `Vence en ${days} días`;

  return (
    <View
      backgroundColor={SURFACE}
      borderRadius={10}
      borderWidth={1}
      borderColor={hasdue && (status === 'overdue' || status === 'urgent') ? color : BORDER}
      marginBottom={8}
      overflow="hidden"
    >
      {/* Left color bar */}
      <XStack>
        <View width={4} backgroundColor={color} />
        <YStack flex={1} padding={12}>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1}>
              <Text color={WHITE} fontSize={13} fontWeight="600">
                {treatmentTypeLabel(record.treatment_type)}
                {record.product_name ? ` — ${record.product_name}` : ''}
              </Text>
              <Text color={MUTED} fontSize={12} marginTop={2}>
                {herd?.name ?? record.herd_id}
                {record.dosage ? ` · ${record.dosage}` : ''}
              </Text>
              <Text color={MUTED} fontSize={11} marginTop={2}>
                Aplicó: {record.administered_by}
              </Text>
            </YStack>
            {hasdue && (
              <View
                backgroundColor={color + '22'}
                paddingHorizontal={8}
                paddingVertical={4}
                borderRadius={6}
              >
                <Text color={color} fontSize={11} fontWeight="700">
                  {daysLabel}
                </Text>
              </View>
            )}
          </XStack>
          {record.notes && (
            <Text color={MUTED} fontSize={11} marginTop={6}>
              {record.notes}
            </Text>
          )}
        </YStack>
      </XStack>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────

type TabType = 'pending' | 'history';

export default function HealthScreen() {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [records, setRecords] = useState<HealthRecord[]>(DEMO_HEALTH);

  const pending = useMemo(
    () =>
      records
        .filter((r) => r.next_due_date != null)
        .sort((a, b) => (a.next_due_date ?? 0) - (b.next_due_date ?? 0)),
    [records]
  );

  const history = useMemo(
    () => [...records].sort((a, b) => b.administered_at - a.administered_at),
    [records]
  );

  const overdueCount = useMemo(
    () => pending.filter((r) => getDueStatus(r.next_due_date!) === 'overdue').length,
    [pending]
  );
  const urgentCount = useMemo(
    () => pending.filter((r) => getDueStatus(r.next_due_date!) === 'urgent').length,
    [pending]
  );

  const handleSave = useCallback(
    (data: Omit<HealthRecord, 'id' | 'created_at'>) => {
      const now = Date.now();
      const newRecord: HealthRecord = {
        ...data,
        id: `h-${now}`,
        created_at: now,
      };
      setRecords((prev) => [newRecord, ...prev]);
      Alert.alert('✅ Tratamiento registrado', treatmentTypeLabel(data.treatment_type));
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
        <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
          <YStack>
            <Text color={LIME} fontSize={20} fontWeight="700">
              Sanidad
            </Text>
            {(overdueCount > 0 || urgentCount > 0) && (
              <Text color="#FF4444" fontSize={12} marginTop={2}>
                {overdueCount > 0 ? `${overdueCount} vencido(s)` : ''}
                {overdueCount > 0 && urgentCount > 0 ? ' · ' : ''}
                {urgentCount > 0 ? `${urgentCount} urgente(s)` : ''}
              </Text>
            )}
          </YStack>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{
              backgroundColor: LIME,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text color={CHARCOAL} fontSize={13} fontWeight="700">
              + Registrar
            </Text>
          </TouchableOpacity>
        </XStack>

        {/* Tabs */}
        <XStack space={4}>
          {(['pending', 'history'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: activeTab === tab ? LIME : SURFACE2,
                alignItems: 'center',
              }}
            >
              <Text
                color={activeTab === tab ? CHARCOAL : MUTED}
                fontSize={13}
                fontWeight="600"
              >
                {tab === 'pending' ? `Próximos (${pending.length})` : `Historial (${history.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </XStack>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {activeTab === 'pending' ? (
          pending.length > 0 ? (
            pending.map((r) => <TreatmentRow key={r.id} record={r} />)
          ) : (
            <View padding={20} alignItems="center">
              <Text color={MUTED} fontSize={14}>
                Sin tratamientos próximos
              </Text>
            </View>
          )
        ) : (
          history.map((r) => <TreatmentRow key={r.id} record={r} />)
        )}
      </ScrollView>

      {showModal && (
        <TreatmentModal onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </View>
  );
}
