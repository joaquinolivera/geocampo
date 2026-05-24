import { useState, useCallback } from 'react';
import { PowerSyncDatabase } from '@powersync/react-native';
import { recordHerdMovement } from '../services/movements';

export interface HerdLocation {
  herdId: string;
  pastureId: string;
  coordinate: [number, number];
}

/**
 * Hook for managing herd drag & drop movements
 * @param db PowerSync database instance
 */
export function useHerdMovements(db: PowerSyncDatabase | null) {
  const [isMoving, setIsMoving] = useState(false);
  const [lastMovement, setLastMovement] = useState<{
    herdId: string;
    fromPastureId: string;
    toPastureId: string;
  } | null>(null);

  const moveHerd = useCallback(
    async (
      herdId: string,
      fromPastureId: string,
      toPastureId: string,
      coordinate: [number, number]
    ) => {
      if (!db) {
        console.warn('PowerSync database not available');
        return;
      }

      setIsMoving(true);
      try {
        await recordHerdMovement(db, herdId, fromPastureId, toPastureId);
        setLastMovement({ herdId, fromPastureId, toPastureId });
        console.log(`Herd ${herdId} moved to pasture ${toPastureId} at [${coordinate}]`);
      } catch (error) {
        console.error('Failed to record herd movement:', error);
        throw error;
      } finally {
        setIsMoving(false);
      }
    },
    [db]
  );

  return {
    moveHerd,
    isMoving,
    lastMovement,
  };
}
