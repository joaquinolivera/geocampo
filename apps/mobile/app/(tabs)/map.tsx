import React, { useState } from 'react';
import { View, Text } from '@geocampo/ui';
import MapCanvas, { PastureData, HerdData } from '../components/MapCanvas';

// Sample data for demonstration
const SAMPLE_PASTURES: PastureData[] = [
  {
    id: 'pasture-1',
    name: 'North Pasture',
    color: '#DEFF9A',
    areaHectares: 45.2,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.42, -34.58],
          [-58.38, -34.58],
          [-58.38, -34.62],
          [-58.42, -34.62],
          [-58.42, -34.58],
        ],
      ],
    },
  },
  {
    id: 'pasture-2',
    name: 'South Pasture',
    color: '#9ADEFF',
    areaHectares: 32.8,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.42, -34.63],
          [-58.38, -34.63],
          [-58.38, -34.67],
          [-58.42, -34.67],
          [-58.42, -34.63],
        ],
      ],
    },
  },
  {
    id: 'pasture-3',
    name: 'East Pasture',
    color: '#FF9ADE',
    areaHectares: 28.5,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.37, -34.60],
          [-58.33, -34.60],
          [-58.33, -34.65],
          [-58.37, -34.65],
          [-58.37, -34.60],
        ],
      ],
    },
  },
];

const SAMPLE_HERDS: HerdData[] = [
  {
    id: 'herd-1',
    name: 'Herd A',
    pastureId: 'pasture-1',
    cattleCount: 45,
    coordinate: [-58.40, -34.60],
  },
  {
    id: 'herd-2',
    name: 'Herd B',
    pastureId: 'pasture-2',
    cattleCount: 32,
    coordinate: [-58.40, -34.65],
  },
];

export default function MapScreen() {
  const [herds, setHerds] = useState<HerdData[]>(SAMPLE_HERDS);
  const [moveLog, setMoveLog] = useState<string[]>([]);

  const handleHerdMove = (
    herdId: string,
    fromPastureId: string,
    toPastureId: string,
    coordinate: [number, number]
  ) => {
    // Update local herd state
    setHerds((prev) =>
      prev.map((h) =>
        h.id === herdId
          ? { ...h, pastureId: toPastureId, coordinate }
          : h
      )
    );

    // Log movement
    const fromPasture = SAMPLE_PASTURES.find((p) => p.id === fromPastureId)?.name || fromPastureId;
    const toPasture = SAMPLE_PASTURES.find((p) => p.id === toPastureId)?.name || toPastureId;
    const herdName = herds.find((h) => h.id === herdId)?.name || herdId;
    
    setMoveLog((prev) => [
      `✅ ${herdName} moved from ${fromPasture} to ${toPasture}`,
      ...prev.slice(0, 4),
    ]);
  };

  return (
    <View flex={1} backgroundColor="#0A0A0B">
      <MapCanvas
        pastures={SAMPLE_PASTURES}
        herds={herds}
        onHerdMove={handleHerdMove}
      />
      
      {/* Movement Log */}
      {moveLog.length > 0 && (
        <View
          position="absolute"
          bottom={80}
          left={20}
          right={20}
          backgroundColor="#1A1A1B"
          padding={12}
          borderRadius={8}
          borderWidth={1}
          borderColor="#2A2A2B"
        >
          <Text color="#DEFF9A" fontSize={12} fontWeight="bold" marginBottom={4}>
            Recent Movements
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
