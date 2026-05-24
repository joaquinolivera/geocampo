import React, { useState, useCallback, useMemo } from 'react';
import { View, Text } from '@geocampo/ui';
import { validateHerdDrop, findContainingPasture } from '@geocampo/shared';
import { Polygon, Position } from 'geojson';

// Conditionally import Mapbox (only available on native)
let Mapbox: any = null;
if (typeof navigator !== 'undefined' && navigator.product !== 'ReactNative') {
  // Web platform - Mapbox will be mocked/placeholder
  Mapbox = null;
} else {
  // Native platform
  try {
    Mapbox = require('@rnmapbox/maps').default;
    Mapbox.setAccessToken('YOUR_MAPBOX_ACCESS_TOKEN');
  } catch (e) {
    Mapbox = null;
  }
}

export interface PastureData {
  id: string;
  name: string;
  geometry: Polygon;
  color: string;
  areaHectares?: number;
}

export interface HerdData {
  id: string;
  name: string;
  pastureId: string;
  cattleCount: number;
  coordinate: [number, number]; // [longitude, latitude]
}

export interface MapCanvasProps {
  pastures: PastureData[];
  herds: HerdData[];
  onHerdMove: (herdId: string, fromPastureId: string, toPastureId: string, coordinate: [number, number]) => void;
}

/**
 * MapCanvas Component (Phase 3 Optimized)
 * 
 * Memory optimizations:
 * - pastureGeoJSON memoized with useMemo (prevents rebuild on every render)
 * - Herd markers memoized per-herd to prevent unnecessary re-renders
 * - Callbacks memoized with useCallback stable dependencies
 * - FeatureCollection ID stable to prevent Mapbox layer recreation
 */
export default function MapCanvas({ pastures, herds, onHerdMove }: MapCanvasProps) {
  const [selectedHerd, setSelectedHerd] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  // Phase 3: Memoize GeoJSON FeatureCollection to prevent rebuild on every render
  // This is critical for memory when polygons have many coordinates
  const pastureGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: pastures.map((pasture) => ({
        type: 'Feature' as const,
        properties: {
          id: pasture.id,
          name: pasture.name,
          color: pasture.color,
        },
        geometry: pasture.geometry,
      })),
    };
  }, [pastures]);

  // Phase 3: Memoize the pasture lookup array for drag validation
  // Prevents re-mapping the array on every drag operation
  const pastureLookup = useMemo(
    () => pastures.map((p) => ({ id: p.id, geometry: p.geometry })),
    [pastures]
  );

  // Phase 3: Stable callback with minimal dependencies
  const handleHerdDragEnd = useCallback(
    (herd: HerdData, coordinate: Position) => {
      setDragError(null);

      const coord: [number, number] = [coordinate[0], coordinate[1]];

      // Use memoized pasture lookup
      const targetPastureId = findContainingPasture(coord, pastureLookup);

      if (!targetPastureId) {
        setDragError('Herd must be dropped inside a pasture boundary');
        return;
      }

      if (targetPastureId === herd.pastureId) {
        setDragError('Herd is already in this pasture');
        return;
      }

      // Final Turf.js validation
      const targetPasture = pastures.find((p) => p.id === targetPastureId);
      if (targetPasture) {
        const validation = validateHerdDrop(coord, targetPasture.geometry, targetPastureId);
        if (!validation.isValid) {
          setDragError(validation.error || 'Invalid drop location');
          return;
        }
      }

      onHerdMove(herd.id, herd.pastureId, targetPastureId, coord);
      setSelectedHerd(null);
    },
    [pastureLookup, pastures, onHerdMove]
  );

  // Web fallback when Mapbox is not available
  if (!Mapbox) {
    return (
      <View flex={1} backgroundColor="#0A0A0B" padding="$4" justifyContent="center" alignItems="center">
        <Text color="#DEFF9A" fontSize="$8" fontWeight="bold" marginBottom="$4">
          🗺️ GeoCampo Map
        </Text>
        <Text color="#FFFFFF" fontSize="$4" textAlign="center" marginBottom="$4">
          Map view is optimized for mobile devices.
        </Text>
        <Text color="#6A6A6B" fontSize="$3" textAlign="center">
          Open this app on your iPhone via Expo Go for the full interactive map experience with drag & drop herd management.
        </Text>
        
        {/* Show pasture summary */}
        <View marginTop="$6" width="100%">
          <Text color="#DEFF9A" fontSize="$5" fontWeight="bold" marginBottom="$2">
            Pastures ({pastures.length})
          </Text>
          {pastures.map((pasture) => (
            <View key={pasture.id} backgroundColor="#1A1A1B" padding="$3" borderRadius="$2" marginBottom="$2">
              <Text color={pasture.color} fontWeight="bold">{pasture.name}</Text>
              <Text color="#6A6A6B" fontSize="$2">
                {pasture.areaHectares?.toFixed(1)} hectares
              </Text>
            </View>
          ))}
        </View>

        {/* Show herd summary */}
        <View marginTop="$4" width="100%">
          <Text color="#DEFF9A" fontSize="$5" fontWeight="bold" marginBottom="$2">
            Herds ({herds.length})
          </Text>
          {herds.map((herd) => (
            <View key={herd.id} backgroundColor="#1A1A1B" padding="$3" borderRadius="$2" marginBottom="$2">
              <Text color="#FFFFFF" fontWeight="bold">🐄 {herd.name}</Text>
              <Text color="#6A6A6B" fontSize="$2">
                {herd.cattleCount} cattle • Pasture: {herd.pastureId}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View flex={1}>
      <Mapbox.MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/mapbox/satellite-v9"
        zoomEnabled
        rotateEnabled
      >
        <Mapbox.Camera
          zoomLevel={14}
          centerCoordinate={[-58.4, -34.6]}
        />

        {/* Pasture Polygons Layer - ShapeSource only re-renders when pastures change */}
        <Mapbox.ShapeSource id="pastures" shape={pastureGeoJSON}>
          <Mapbox.FillLayer
            id="pastureFill"
            style={{
              fillColor: ['get', 'color'],
              fillOpacity: 0.3,
            }}
          />
          <Mapbox.LineLayer
            id="pastureOutline"
            style={{
              lineColor: ['get', 'color'],
              lineWidth: 2,
            }}
          />
        </Mapbox.ShapeSource>

        {/* Phase 3: Memoized Herd Markers - each only re-renders when its own data changes */}
        {herds.map((herd) => (
          <MemoizedHerdMarker
            key={herd.id}
            herd={herd}
            isSelected={selectedHerd === herd.id}
            onDragEnd={handleHerdDragEnd}
            onSelect={setSelectedHerd}
          />
        ))}
      </Mapbox.MapView>

      {/* Error Toast */}
      {dragError && (
        <View
          position="absolute"
          bottom={20}
          left={20}
          right={20}
          backgroundColor="#FF4444"
          padding={16}
          borderRadius={8}
        >
          <Text color="#FFFFFF" fontWeight="bold">
            {dragError}
          </Text>
        </View>
      )}

      {/* Selected Herd Info */}
      {selectedHerd && (
        <View
          position="absolute"
          top={60}
          left={20}
          right={20}
          backgroundColor="#0A0A0B"
          padding={16}
          borderRadius={8}
          borderWidth={1}
          borderColor="#DEFF9A"
        >
          <Text color="#DEFF9A" fontWeight="bold" fontSize={16}>
            {herds.find((h) => h.id === selectedHerd)?.name}
          </Text>
          <Text color="#6A6A6B" fontSize={14}>
            Drag the herd marker to move to a different pasture
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Phase 3: Memoized Herd Marker
 * Prevents re-render when parent re-renders unless this herd's own data changes
 */
const MemoizedHerdMarker = React.memo(function HerdMarker({
  herd,
  isSelected,
  onDragEnd,
  onSelect,
}: {
  herd: HerdData;
  isSelected: boolean;
  onDragEnd: (herd: HerdData, coordinate: Position) => void;
  onSelect: (id: string | null) => void;
}) {
  return (
    <Mapbox.PointAnnotation
      id={herd.id}
      coordinate={herd.coordinate}
      draggable
      onDragEnd={(e: any) => onDragEnd(herd, e.geometry.coordinates)}
      onSelected={() => onSelect(herd.id)}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#DEFF9A',
          borderWidth: 3,
          borderColor: isSelected ? '#FFFFFF' : '#0A0A0B',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text fontSize={20}>🐄</Text>
        <Text fontSize={10} color="#0A0A0B" fontWeight="bold">
          {herd.cattleCount}
        </Text>
      </View>
    </Mapbox.PointAnnotation>
  );
});
