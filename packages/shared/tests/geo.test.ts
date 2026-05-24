/**
 * @fileoverview Phase 2 TDD: Turf.js Geospatial Validation Tests
 */

import { validateHerdDrop, findContainingPasture, validateHerdMovement } from '../src/utils/geo';
import { Polygon } from 'geojson';

describe('Geospatial Validation (Turf.js)', () => {
  // Simple square polygon for testing: coordinates are [lon, lat]
  const testPasturePolygon: Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [-58.5, -34.5], // top-left
        [-58.3, -34.5], // top-right
        [-58.3, -34.7], // bottom-right
        [-58.5, -34.7], // bottom-left
        [-58.5, -34.5], // close
      ],
    ],
  };

  describe('validateHerdDrop', () => {
    it('should validate a point inside the pasture', () => {
      const result = validateHerdDrop(
        [-58.4, -34.6],
        testPasturePolygon,
        'pasture-1'
      );
      expect(result.isValid).toBe(true);
      expect(result.pastureId).toBe('pasture-1');
      expect(result.error).toBeUndefined();
    });

    it('should reject a point outside the pasture', () => {
      const result = validateHerdDrop(
        [-58.0, -34.0],
        testPasturePolygon,
        'pasture-1'
      );
      expect(result.isValid).toBe(false);
      expect(result.pastureId).toBeNull();
      expect(result.error).toContain('outside');
    });

    it('should handle edge case: point on polygon boundary', () => {
      const result = validateHerdDrop(
        [-58.5, -34.5],
        testPasturePolygon,
        'pasture-1'
      );
      // Boundary is considered inside by Turf.js
      expect(result.isValid).toBe(true);
    });

    it('should handle invalid polygon geometry', () => {
      const invalidPolygon = {
        type: 'Polygon' as const,
        coordinates: [],
      };
      const result = validateHerdDrop(
        [-58.4, -34.6],
        invalidPolygon,
        'pasture-1'
      );
      expect(result.isValid).toBe(false);
      // Empty polygon is treated as outside
      expect(result.error).toBeDefined();
    });
  });

  describe('findContainingPasture', () => {
    it('should find the correct pasture containing a point', () => {
      const pastures = [
        { id: 'pasture-a', geometry: testPasturePolygon },
        {
          id: 'pasture-b',
          geometry: {
            type: 'Polygon' as const,
            coordinates: [
              [
                [-58.0, -34.0],
                [-57.8, -34.0],
                [-57.8, -34.2],
                [-58.0, -34.2],
                [-58.0, -34.0],
              ],
            ],
          },
        },
      ];

      const found = findContainingPasture([-58.4, -34.6], pastures);
      expect(found).toBe('pasture-a');
    });

    it('should return null when no pasture contains the point', () => {
      const pastures = [
        { id: 'pasture-a', geometry: testPasturePolygon },
      ];

      const found = findContainingPasture([-58.0, -34.0], pastures);
      expect(found).toBeNull();
    });

    it('should return null for empty pastures array', () => {
      const found = findContainingPasture([-58.4, -34.6], []);
      expect(found).toBeNull();
    });
  });

  describe('validateHerdMovement', () => {
    it('should validate movement between different pastures', () => {
      const result = validateHerdMovement('pasture-a', 'pasture-b', 'herd-1');
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('herd-1');
      expect(result.message).toContain('pasture-a');
      expect(result.message).toContain('pasture-b');
    });

    it('should reject movement to same pasture', () => {
      const result = validateHerdMovement('pasture-a', 'pasture-a', 'herd-1');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('same pasture');
    });

    it('should reject movement with missing source pasture', () => {
      const result = validateHerdMovement('', 'pasture-b', 'herd-1');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must be specified');
    });

    it('should reject movement with missing target pasture', () => {
      const result = validateHerdMovement('pasture-a', '', 'herd-1');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('must be specified');
    });
  });
});
