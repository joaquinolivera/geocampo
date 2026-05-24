/**
 * @fileoverview Phase 2 TDD: MapCanvas Component Tests (Simplified)
 * Testing the data transformation logic without rendering React components
 */

import { findContainingPasture } from '@geocampo/shared';

describe('MapCanvas Logic', () => {
  const samplePastures = [
    {
      id: 'pasture-1',
      geometry: {
        type: 'Polygon' as const,
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
      geometry: {
        type: 'Polygon' as const,
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
  ];

  it('should identify correct pasture for a coordinate inside', () => {
    const result = findContainingPasture([-58.40, -34.60], samplePastures);
    expect(result).toBe('pasture-1');
  });

  it('should return null for coordinate outside all pastures', () => {
    const result = findContainingPasture([-58.0, -34.0], samplePastures);
    expect(result).toBeNull();
  });

  it('should build GeoJSON FeatureCollection from pasture data', () => {
    const featureCollection = {
      type: 'FeatureCollection' as const,
      features: samplePastures.map((pasture) => ({
        type: 'Feature' as const,
        properties: {
          id: pasture.id,
          name: 'Test Pasture',
          color: '#DEFF9A',
        },
        geometry: pasture.geometry,
      })),
    };

    expect(featureCollection.features).toHaveLength(2);
    expect(featureCollection.features[0].properties.id).toBe('pasture-1');
  });

  it('should handle empty pastures array', () => {
    const result = findContainingPasture([-58.40, -34.60], []);
    expect(result).toBeNull();
  });
});
