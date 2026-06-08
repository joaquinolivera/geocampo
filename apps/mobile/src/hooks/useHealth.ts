/**
 * @fileoverview Health & vaccination hook
 * Wraps the health service with React state management.
 */

import { useState, useCallback } from 'react';
import { PowerSyncDatabase } from '@powersync/react-native';
import {
  recordTreatment,
  getHealthForHerd,
  getUpcomingTreatments,
  getOverdueTreatments,
  HealthRecord,
  RecordTreatmentInput,
} from '@/services/health';

export function useHealth(db: PowerSyncDatabase | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTreatment = useCallback(
    async (input: RecordTreatmentInput): Promise<HealthRecord | null> => {
      if (!db) {
        console.warn('PowerSync database not available');
        return null;
      }
      setIsRecording(true);
      setError(null);
      try {
        const record = await recordTreatment(db, input);
        return record;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al registrar tratamiento';
        setError(msg);
        return null;
      } finally {
        setIsRecording(false);
      }
    },
    [db]
  );

  const fetchHealthForHerd = useCallback(
    async (herdId: string): Promise<HealthRecord[]> => {
      if (!db) return [];
      return getHealthForHerd(db, herdId);
    },
    [db]
  );

  const fetchUpcoming = useCallback(
    async (limitDays = 30): Promise<HealthRecord[]> => {
      if (!db) return [];
      return getUpcomingTreatments(db, limitDays);
    },
    [db]
  );

  const fetchOverdue = useCallback(async (): Promise<HealthRecord[]> => {
    if (!db) return [];
    return getOverdueTreatments(db);
  }, [db]);

  return {
    addTreatment,
    fetchHealthForHerd,
    fetchUpcoming,
    fetchOverdue,
    isRecording,
    error,
  };
}
