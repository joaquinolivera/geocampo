'use client';

/**
 * @fileoverview FarmDataContext — provides farm data to all dashboard components.
 *
 * Priority:
 *  1. Supabase (real DB, when IS_DEMO_MODE=false and user authenticated)
 *  2. localStorage (user's real farm, saved via /setup wizard)
 *  3. Demo data (PASTURES, HERDS, … from data.ts)
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
  type GrassType,
  type WaterSupplyType,
} from './data';
import { loadStoredFarm } from './farm-store';
import { getBrowserClient, IS_DEMO_MODE } from './supabase';

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

// ─── Supabase row types (snake_case from DB) ──────────────────────────────────

interface SupabaseFarm {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
}

interface SupabasePasture {
  id: string;
  farm_id: string;
  name: string;
  coordinates: [number, number][][] | null;
  area_hectares: number | null;
  carrying_capacity: number | null;
  grass_type: string | null;
  water_supply: string | null;
  notes: string | null;
  color: string | null;
}

interface SupabaseHerd {
  id: string;
  farm_id: string;
  pasture_id: string | null;
  name: string;
  cattle_count: number;
  breed: string | null;
  entry_date: string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapPasture(p: SupabasePasture): Pasture {
  // Derive a center coordinate for the herd marker from the polygon
  const coords = p.coordinates ?? [];
  const ring = coords[0] ?? [];
  const center: [number, number] =
    ring.length > 0
      ? [
          ring.reduce((s, c) => s + c[0], 0) / ring.length,
          ring.reduce((s, c) => s + c[1], 0) / ring.length,
        ]
      : [-58.5, -25.3]; // Fallback: centre of Paraguay/Argentina

  return {
    id: p.id,
    name: p.name,
    areaHectares: p.area_hectares ?? 0,
    carryingCapacity: p.carrying_capacity ?? 0,
    color: p.color ?? '#84cc16',
    geometry: {
      type: 'Polygon',
      coordinates: coords.length > 0 ? coords : [[center]],
    },
    grassType: (p.grass_type as GrassType) ?? undefined,
    waterSupply: (p.water_supply as WaterSupplyType) ?? undefined,
    notes: p.notes ?? undefined,
    // Store the computed center so herds can use it
    _center: center,
  } as Pasture & { _center: [number, number] };
}

function mapHerd(
  h: SupabaseHerd,
  pastureCenter: [number, number],
): Herd {
  return {
    id: h.id,
    name: h.name,
    pastureId: h.pasture_id ?? '',
    cattleCount: h.cattle_count,
    breed: h.breed ?? '',
    species: 'bovino',
    status: 'active',
    entryDate: h.entry_date ? new Date(h.entry_date) : new Date(),
    coordinate: pastureCenter,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FarmDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FarmDataShape>(defaultData);

  // Load from localStorage (offline / demo-cookie users)
  const loadFromStorage = useCallback(() => {
    const stored = loadStoredFarm();
    if (!stored) return false;

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
    return true;
  }, []);

  // Load from Supabase (authenticated users in production mode)
  const loadFromSupabase = useCallback(async () => {
    const client = getBrowserClient();
    if (!client) { console.log('[FarmData] no client (demo mode)'); return false; }

    const { data: { user }, error: userErr } = await client.auth.getUser();
    if (!user) { console.log('[FarmData] no user', userErr); return false; }
    console.log('[FarmData] user', user.email);

    // Get the user's farm (first membership)
    const { data: memberships, error: mErr } = await client
      .from('farm_members')
      .select('farm_id, role, farms(id, slug, name, owner_id)')
      .eq('user_id', user.id)
      .limit(1);

    console.log('[FarmData] memberships', memberships, mErr);
    if (mErr || !memberships?.length) return false;

    const farmRow = (memberships[0].farms as SupabaseFarm | null);
    console.log('[FarmData] farmRow', farmRow);
    if (!farmRow) return false;

    const farmId = farmRow.id;

    // Fetch pastures
    const { data: pastureRows } = await client
      .from('pastures')
      .select('id, farm_id, name, coordinates, area_hectares, carrying_capacity, grass_type, water_supply, notes, color')
      .eq('farm_id', farmId);

    console.log('[FarmData] pastureRows', pastureRows?.length, pastureRows);
    const pastures: Pasture[] = (pastureRows ?? []).map((p: SupabasePasture) =>
      mapPasture(p)
    );

    // Build a lookup: pastureId → center coordinate
    const pastureCenter: Record<string, [number, number]> = {};
    for (const p of pastures) {
      const ext = p as Pasture & { _center?: [number, number] };
      pastureCenter[p.id] = ext._center ?? [-58.5, -25.3];
    }

    // Fetch herds
    const { data: herdRows } = await client
      .from('herds')
      .select('id, farm_id, pasture_id, name, cattle_count, breed, entry_date')
      .eq('farm_id', farmId);

    console.log('[FarmData] herdRows', herdRows?.length, herdRows);
    const herds: Herd[] = (herdRows ?? []).map((h: SupabaseHerd) => {
      const center: [number, number] = (h.pasture_id ? pastureCenter[h.pasture_id] : null) ?? [-58.5, -25.3];
      return mapHerd(h, center);
    });

    // Total area from all pastures
    const totalAreaHectares = pastures.reduce((s, p) => s + p.areaHectares, 0);

    setData((prev) => ({
      ...prev,
      DEMO_FARM: {
        id: farmRow.id,
        name: farmRow.name,
        ownerName: user.email?.split('@')[0] ?? 'Usuario',
        totalAreaHectares,
        location: (pastures[0] as (Pasture & { _center?: [number, number] }) | undefined)?._center ?? [-58.39, -34.62] as [number, number],
      },
      PASTURES: pastures,
      HERDS: herds,
      // Weight/health/movements are still localStorage-driven for now
      WEIGHTS: prev.WEIGHTS,
      HEALTH_RECORDS: prev.HEALTH_RECORDS,
      MOVEMENTS: prev.MOVEMENTS,
      INFRASTRUCTURE: prev.INFRASTRUCTURE,
      isCustomFarm: true,
    }));
    return true;
  }, []);

  useEffect(() => {
    async function init() {
      console.log('[FarmData] init, IS_DEMO_MODE=', IS_DEMO_MODE);
      // In production mode, prefer Supabase; fall back to localStorage
      if (!IS_DEMO_MODE) {
        const ok = await loadFromSupabase();
        console.log('[FarmData] loadFromSupabase =>', ok);
        if (!ok) loadFromStorage();
      } else {
        loadFromStorage();
      }
    }
    void init();
  }, [loadFromSupabase, loadFromStorage]);

  // refresh: re-runs both paths so mutations (weight, health, etc.) are reflected
  const refresh = useCallback(() => {
    if (!IS_DEMO_MODE) {
      void loadFromSupabase().then((ok) => { if (!ok) loadFromStorage(); });
    } else {
      loadFromStorage();
    }
  }, [loadFromSupabase, loadFromStorage]);

  useEffect(() => {
    setData((prev) => ({ ...prev, refresh }));
  }, [refresh]);

  return <FarmDataCtx.Provider value={data}>{children}</FarmDataCtx.Provider>;
}

export function useFarmData(): FarmDataShape {
  return useContext(FarmDataCtx);
}
