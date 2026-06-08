/**
 * @fileoverview Weight recording hook
 * Wraps the weights service with React state management.
 */

import { useState, useCallback } from 'react';
import { PowerSyncDatabase } from '@powersync/react-native';
import {
  recordWeight,
  getWeightsForHerd,
  getLatestWeight,
  WeightRecord,
  RecordWeightInput,
} from '@/services/weights';

export function useWeights(db: PowerSyncDatabase | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addWeight = useCallback(
    async (input: RecordWeightInput): Promise<WeightRecord | null> => {
      if (!db) {
        console.warn('PowerSync database not available');
        return null;
      }
      setIsRecording(true);
      setError(null);
      try {
        const record = await recordWeight(db, input);
        return record;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al registrar pesaje';
        setError(msg);
        return null;
      } finally {
        setIsRecording(false);
      }
    },
    [db]
  );

  const fetchWeightsForHerd = useCallback(
    async (herdId: string): Promise<WeightRecord[]> => {
      if (!db) return [];
      return getWeightsForHerd(db, herdId);
    },
    [db]
  );

  const fetchLatestWeight = useCallback(
    async (herdId: string): Promise<WeightRecord | null> => {
      if (!db) return null;
      return getLatestWeight(db, herdId);
    },
    [db]
  );

  return {
    addWeight,
    fetchWeightsForHerd,
    fetchLatestWeight,
    isRecording,
    error,
  };
}
