/**
 * @fileoverview Map screen
 * Interactive MapCanvas with herd drag & drop + stocking-load overlay.
 */

import React, { useState, useMemo } from 'react';
import { View, Text } from '@geocampo/ui';
import { buildLoadAlert, loadStatusColor } from '@geocampo/shared';
import MapCanvas, { PastureData, HerdData } from '@/components/MapCanvas';
import { DEMO_PASTURES, DEMO_HERDS } from '@/data/seed';

export default function MapScreen() {
  const [herds, setHerds] = useState<HerdData[]>(
    DEMO_HERDS.map((h) => ({
      id: h.id,
      name: h.name,
      pastureId: h.pastureId ?? '',
      cattleCount: h.cattleCount,
      coordinate: h.coordinate,
    }))
  );
  const [moveLog, setMoveLog] = useState<string[]>([]);

  // Colour each pasture by its stocking-load status
  const pastures: PastureData[] = useMemo(() => {
    return DEMO_PASTURES.map((p) => {
      const herd = herds.find((h) => h.pastureId === p.id);
      const alert = herd
        ? buildLoadAlert(p.id, p.name, herd.cattleCount, p.carryingCapacity)
        : null;
      return {
        id: p.id,
        name: p.name,
        geometry: p.geometry,
        areaHectares: p.areaHectares,
        // Status-coded colour overrides default colour
        color: alert ? loadStatusColor(alert.status) : p.color,
      };
    });
  }, [herds]);

  const handleHerdMove = (
    herdId: string,
    fromPastureId: string,
    toPastureId: string,
    coordinate: [number, number]
  ) => {
    setHerds((prev) =>
      prev.map((h) =>
        h.id === herdId ? { ...h, pastureId: toPastureId, coordinate } : h
      )
    );

    const fromName = DEMO_PASTURES.find((p) => p.id === fromPastureId)?.name ?? fromPastureId;
    const toName = DEMO_PASTURES.find((p) => p.id === toPastureId)?.name ?? toPastureId;
    const herdName = herds.find((h) => h.id === herdId)?.name ?? herdId;

    setMoveLog((prev) => [
      `✅ ${herdName} → ${toName}`,
      ...prev.slice(0, 3),
    ]);
  };

  return (
    <View flex={1} backgroundColor="#0A0A0B">
      <MapCanvas pastures={pastures} herds={herds} onHerdMove={handleHerdMove} />

      {/* Load legend */}
      <View
        position="absolute"
        top={60}
        right={12}
        backgroundColor="#0A0A0B"
        padding={10}
        borderRadius={8}
        borderWidth={1}
        borderColor="#2A2A2B"
        opacity={0.92}
      >
        {[
          { color: '#DEFF9A', label: 'Normal' },
          { color: '#FFB444', label: 'Cerca límite' },
          { color: '#FF4444', label: 'Sobrecarga' },
        ].map((item) => (
          <View key={item.color} flexDirection="row" alignItems="center" marginBottom={4}>
            <View
              width={10}
              height={10}
              borderRadius={5}
              backgroundColor={item.color}
              marginRight={6}
            />
            <Text color="#FFFFFF" fontSize={11}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Movement log */}
      {moveLog.length > 0 && (
        <View
          position="absolute"
          bottom={80}
          left={12}
          right={12}
          backgroundColor="#1A1A1B"
          padding={12}
          borderRadius={8}
          borderWidth={1}
          borderColor="#2A2A2B"
        >
          <Text color="#DEFF9A" fontSize={12} fontWeight="bold" marginBottom={4}>
            Movimientos recientes
          </Text>
          {moveLog.map((log, i) => (
            <Text key={i} color="#FFFFFF" fontSize={11}>
              {log}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
