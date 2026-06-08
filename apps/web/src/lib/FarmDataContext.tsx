'use client';

/**
 * @fileoverview FarmDataContext — provides farm data to all dashboard components.
 *
 * Priority:
 *  1. localStorage (user's real farm, saved via /setup wizard)
 *  2. Demo data (PASTURES, HERDS, … from data.ts)
 *
 * Components replace `import { PASTURES, HERDS } from '@/lib/data'`
 * with `const { PASTURES, HERDS } = useFarmData()`.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  DEMO_FARM,
  PASTURES as DEMO_PASTURES,
  HERDS as DEMO_HERDS,
  WEIGHTS as DEMO_WEIGHTS,
  HEALTH_RECORDS as DEMO_HEALTH,
  MOVEMENTS as DEMO_MOVEMENTS,
  INFRASTRUCTURE as DEMO_INFRA,
  type Pasture,
  type Herd,
  type WeightRecord,
  type HealthRecord,
  type Movement,
  type InfrastructureFeature,
} from './data';
import { loadStoredFarm } from './farm-store';

export interface FarmDataShape {
  DEMO_FARM: typeof DEMO_FARM;
  PASTURES: Pasture[];
  HERDS: Herd[];
  WEIGHTS: WeightRecord[];
  HEALTH_RECORDS: HealthRecord[];
  MOVEMENTS: Movement[];
  INFRASTRUCTURE: InfrastructureFeature[];
  isCustomFarm: boolean; // true if loaded from /setup
  /** Re-reads localStorage — call after any mutation (addWeightRecord, etc.) */
  refresh: () => void;
}

const defaultData: FarmDataShape = {
  DEMO_FARM,
  PASTURES: DEMO_PASTURES,
  HERDS: DEMO_HERDS,
  WEIGHTS: DEMO_WEIGHTS,
  HEALTH_RECORDS: DEMO_HEALTH,
  MOVEMENTS: DEMO_MOVEMENTS,
  INFRASTRUCTURE: DEMO_INFRA,
  isCustomFarm: false,
  refresh: () => {},
};

const FarmDataCtx = createContext<FarmDataShape>(defaultData);

export function FarmDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FarmDataShape>(defaultData);

  const loadFromStorage = useCallback(() => {
    const stored = loadStoredFarm();
    if (!stored) return;

    setData((prev) => ({
      ...prev,
      DEMO_FARM: {
        id: stored.id,
        name: stored.name,
        ownerName: stored.ownerName,
        totalAreaHectares: stored.totalAreaHectares,
        location: stored.location,
      },
      PASTURES: stored.pastures,
      HERDS: stored.herds.map((h) => ({
        ...h,
        species: ((h as { species?: string }).species ?? 'bovino') as import('@/lib/data').HerdSpecies,
        entryDate: typeof h.entryDate === 'string' ? new Date(h.entryDate) : h.entryDate,
      })),
      WEIGHTS: stored.weightRecords.map((w) => ({
        ...w,
        weighedAt: typeof w.weighedAt === 'string' ? new Date(w.weighedAt) : w.weighedAt,
      })),
      HEALTH_RECORDS: stored.healthRecords.map((r) => ({
        ...r,
        administeredAt: typeof r.administeredAt === 'string' ? new Date(r.administeredAt) : r.administeredAt,
        nextDueDate: r.nextDueDate
          ? (typeof r.nextDueDate === 'string' ? new Date(r.nextDueDate) : r.nextDueDate)
          : null,
      })),
      MOVEMENTS: stored.movements.map((m) => ({
        ...m,
        movedAt: typeof m.movedAt === 'string' ? new Date(m.movedAt) : m.movedAt,
      })),
      INFRASTRUCTURE: stored.infrastructure,
      isCustomFarm: true,
    }));
  }, []);

  useEffect(() => { loadFromStorage(); }, [loadFromStorage]);

  // Expose refresh so any component can trigger a re-read after a mutation
  useEffect(() => {
    setData((prev) => ({ ...prev, refresh: loadFromStorage }));
  }, [loadFromStorage]);

  return <FarmDataCtx.Provider value={data}>{children}</FarmDataCtx.Provider>;
}

export function useFarmData(): FarmDataShape {
  return useContext(FarmDataCtx);
}
