import React, { useState, useCallback } from 'react';
import { View, Text } from '@geocampo/ui';
import Mapbox from '@rnmapbox/maps';
import { validateHerdDrop, findContainingPasture } from '@geocampo/shared';
import { Polygon, Position } from 'geojson';

// Set Mapbox access token (should come from environment in production)
Mapbox.setAccessToken('YOUR_MAPBOX_ACCESS_TOKEN');

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
 * MapCanvas Component
 * Displays pasture polygons and draggable herd markers on a Mapbox map.
 * Validates herd drops using Turf.js Point-in-Polygon.
 */
export default function MapCanvas({ pastures, herds, onHerdMove }: MapCanvasProps) {
  const [selectedHerd, setSelectedHerd] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  // Build GeoJSON FeatureCollection for pasture polygons
  const pastureGeoJSON = {
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

  // Handle herd marker drag end
  const handleHerdDragEnd = useCallback(
    (herd: HerdData, coordinate: Position) => {
      setDragError(null);

      // Convert to tuple
      const coord: [number, number] = [coordinate[0], coordinate[1]];

      // Find which pasture contains the dropped coordinate
      const targetPastureId = findContainingPasture(
        coord,
        pastures.map((p) => ({ id: p.id, geometry: p.geometry }))
      );

      if (!targetPastureId) {
        setDragError('Herd must be dropped inside a pasture boundary');
        return;
      }

      if (targetPastureId === herd.pastureId) {
        setDragError('Herd is already in this pasture');
        return;
      }

      // Validate with Turf.js
      const targetPasture = pastures.find((p) => p.id === targetPastureId);
      if (targetPasture) {
        const validation = validateHerdDrop(coord, targetPasture.geometry, targetPastureId);
        if (!validation.isValid) {
          setDragError(validation.error || 'Invalid drop location');
          return;
        }
      }

      // Success - trigger movement
      onHerdMove(herd.id, herd.pastureId, targetPastureId, coord);
      setSelectedHerd(null);
    },
    [pastures, onHerdMove]
  );

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
          centerCoordinate={[-58.4, -34.6]} // Default center (Buenos Aires area)
        />

        {/* Pasture Polygons Layer */}
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

        {/* Herd Markers */}
        {herds.map((herd) => (
          <Mapbox.PointAnnotation
            key={herd.id}
            id={herd.id}
            coordinate={herd.coordinate}
            draggable
            onDragEnd={(e) => handleHerdDragEnd(herd, e.geometry.coordinates)}
            onSelected={() => setSelectedHerd(herd.id)}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#DEFF9A',
                borderWidth: 3,
                borderColor: selectedHerd === herd.id ? '#FFFFFF' : '#0A0A0B',
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
            🐄 {herds.find((h) => h.id === selectedHerd)?.name}
          </Text>
          <Text color="#6A6A6B" fontSize={14}>
            Drag the herd marker to move to a different pasture
          </Text>
        </View>
      )}
    </View>
  );
}
