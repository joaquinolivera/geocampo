/**
 * @fileoverview Turf.js Geospatial Validation Service
 * Validates herd movements using Point-in-Polygon checks.
 * Follows Karpaty's Rule #2: Data/geometry before logic.
 */

import { booleanPointInPolygon, point, polygon } from '@turf/turf';
import type { Feature, Polygon, Point } from 'geojson';

export interface ValidationResult {
  isValid: boolean;
  pastureId: string | null;
  error?: string;
}

/**
 * Validates if a coordinate is inside a pasture polygon
 * @param droppedCoordinate [longitude, latitude] of the dropped herd marker
 * @param pastureGeoJSON GeoJSON Polygon of the pasture boundary
 * @param pastureId Identifier for the pasture
 */
export function validateHerdDrop(
  droppedCoordinate: [number, number],
  pastureGeoJSON: Polygon,
  pastureId: string
): ValidationResult {
  try {
    // Create Turf.js point from dropped coordinate
    const turfPoint = point(droppedCoordinate);
    
    // Create Turf.js polygon from pasture geometry
    // Turf expects coordinates as [longitude, latitude]
    const turfPolygon = polygon(pastureGeoJSON.coordinates);
    
    // Validate point is inside polygon
    const isInside = booleanPointInPolygon(turfPoint, turfPolygon);
    
    if (isInside) {
      return {
        isValid: true,
        pastureId,
      };
    }
    
    return {
      isValid: false,
      pastureId: null,
      error: 'Herd marker dropped outside pasture boundary',
    };
  } catch (err) {
    return {
      isValid: false,
      pastureId: null,
      error: `Geospatial validation error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Find which pasture contains a given coordinate
 * @param coordinate [longitude, latitude]
 * @param pastures Array of {id, geometry} objects
 * @returns First matching pasture ID or null
 */
export function findContainingPasture(
  coordinate: [number, number],
  pastures: Array<{ id: string; geometry: Polygon }>
): string | null {
  for (const pasture of pastures) {
    const result = validateHerdDrop(coordinate, pasture.geometry, pasture.id);
    if (result.isValid) {
      return result.pastureId;
    }
  }
  return null;
}

/**
 * Validates a complete herd movement between two pastures
 * @param fromPastureId Source pasture ID
 * @param toPastureId Target pasture ID
 * @param herdId Herd being moved
 * @returns Validation result with metadata
 */
export function validateHerdMovement(
  fromPastureId: string,
  toPastureId: string,
  herdId: string
): { isValid: boolean; message: string } {
  if (fromPastureId === toPastureId) {
    return {
      isValid: false,
      message: 'Cannot move herd to the same pasture',
    };
  }

  if (!fromPastureId || !toPastureId) {
    return {
      isValid: false,
      message: 'Source and target pastures must be specified',
    };
  }

  return {
    isValid: true,
    message: `Herd ${herdId} validated for movement from ${fromPastureId} to ${toPastureId}`,
  };
}
