'use client';

/**
 * @fileoverview FarmDataContext — provides farm data to all dashboard components.
 *
 * Production mode (IS_DEMO_MODE=false):
 *  - All data comes from Supabase. No localStorage fallback.
 *  - If the user has no session or no farm, state stays empty and
 *    middleware redirects to /login or /setup.
 *
 * Demo mode (IS_DEMO_MODE=true, env vars missing):
 *  - Uses demo seed data from data.ts.
 *
 * Components replace `import { PASTURES, HERDS } from '@/lib/data'`
 * with `const { PASTURES, HERDS } = useFarmData()`.
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { type FarmRole } from './useRole';
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
import { getBrowserClient, IS_DEMO_MODE } from './supabase';
import { clearStoredFarm } from './farm-store';

// ─── Cattle shape (production) ────────────────────────────────────────────────
// This mirrors the `cattle` table + new columns from migration 014.

export interface CattleRecord {
  id:            string;
  farmId:        string;
  herdId:        string | null;
  visualTagId:   string | null;
  chipId:        string | null;
  sex:           'male' | 'female' | 'castrated' | null;
  breed:         string | null;
  /** Cattle category (cattle_category enum): vaca|vaquillona|ternera|toro|novillo|ternero|torito */
  category:      string | null;
  /** Sheep category text: oveja|carnero|borrego|borrega|cordero|cordera|capon */
  sheepCategory: string | null;
  /** Species of this individual animal (matches herd.species) */
  species:       'bovino' | 'ovino' | 'caprino' | 'equino' | 'porcino' | 'otro';
  dob:           string | null;  // ISO date string
  status:        'active' | 'sold' | 'deceased' | 'transferred';
  notes:         string | null;
  ownerName:     string | null;
  color:         string | null;
  origen:        string | null;  // cattle_origen enum
  padreVid:      string | null;
  madreVid:      string | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface FarmDataShape {
  DEMO_FARM: typeof DEMO_FARM;
  PASTURES: Pasture[];
  HERDS: Herd[];
  WEIGHTS: WeightRecord[];
  HEALTH_RECORDS: HealthRecord[];
  MOVEMENTS: Movement[];
  INFRASTRUCTURE: InfrastructureFeature[];
  CATTLE: CattleRecord[];
  isCustomFarm: boolean;
  /** The active farm's UUID (null until loaded from Supabase) */
  farmId: string | null;
  /** The active farm's slug (for building links) */
  farmSlug: string | null;
  /** Current user's role on this farm */
  userRole: FarmRole;
  /** Re-reads from Supabase — call after any mutation (addWeightRecord, etc.) */
  refresh: () => void;
}

// In production: start with empty state so no demo data ever flashes.
// In demo mode: start with seed data from data.ts.
const defaultData: FarmDataShape = IS_DEMO_MODE
  ? {
      DEMO_FARM,
      PASTURES: DEMO_PASTURES,
      HERDS: DEMO_HERDS,
      WEIGHTS: DEMO_WEIGHTS,
      HEALTH_RECORDS: DEMO_HEALTH,
      MOVEMENTS: DEMO_MOVEMENTS,
      INFRASTRUCTURE: DEMO_INFRA,
      CATTLE: [],
      isCustomFarm: false,
      farmId: null,
      farmSlug: null,
      userRole: null,
      refresh: () => {},
    }
  : {
      DEMO_FARM,
      PASTURES: [],
      HERDS: [],
      WEIGHTS: [],
      HEALTH_RECORDS: [],
      MOVEMENTS: [],
      INFRASTRUCTURE: [],
      CATTLE: [],
      isCustomFarm: false,
      farmId: null,
      farmSlug: null,
      userRole: null,
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
  species: string;
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
    species: (h.species as Herd['species']) ?? 'bovino',
    status: 'active',
    entryDate: h.entry_date ? new Date(h.entry_date) : new Date(),
    coordinate: pastureCenter,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FarmDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FarmDataShape>(defaultData);
  const farmIdRef = useRef<string | null>(null);

  // Production: wipe any stale localStorage on mount so it can never bleed in
  useEffect(() => {
    if (!IS_DEMO_MODE) clearStoredFarm();
  }, []);

  // Load from Supabase (authenticated users in production mode)
  const loadFromSupabase = useCallback(async () => {
    const client = getBrowserClient();
    if (!client) return false;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return false;

    // Get the user's farm (first accepted membership)
    const { data: memberships, error: mErr } = await client
      .from('farm_members')
      .select('farm_id, role, farms(id, slug, name, owner_id)')
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .limit(1);

    if (mErr || !memberships?.length) return false;

    const farmRow = (memberships[0].farms as SupabaseFarm | null);
    if (!farmRow) return false;

    const farmId = farmRow.id;
    const userRole = (memberships[0].role as FarmRole) ?? null;
    farmIdRef.current = farmId;

    // Fetch pastures
    const { data: pastureRows } = await client
      .from('pastures')
      .select('id, farm_id, name, coordinates, area_hectares, carrying_capacity, grass_type, water_supply, notes, color')
      .eq('farm_id', farmId);

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
      .select('id, farm_id, pasture_id, name, species, cattle_count, breed, entry_date')
      .eq('farm_id', farmId);

    const herds: Herd[] = (herdRows ?? []).map((h: SupabaseHerd) => {
      const center: [number, number] = (h.pasture_id ? pastureCenter[h.pasture_id] : null) ?? [-58.5, -25.3];
      return mapHerd(h, center);
    });

    // Fetch weight_records
    const { data: weightRows } = await client
      .from('weight_records')
      .select('id, herd_id, cattle_count, average_weight_kg, weighed_at, weighed_by, notes')
      .eq('farm_id', farmId)
      .order('weighed_at', { ascending: false })
      .limit(500);

    const weights: WeightRecord[] = (weightRows ?? []).map((r: Record<string, unknown>) => ({
      id:              r.id as string,
      herdId:          r.herd_id as string,
      cattleCount:     Number(r.cattle_count),
      averageWeightKg: Number(r.average_weight_kg),
      weightKg:        Number(r.cattle_count) * Number(r.average_weight_kg),
      weighedAt:       new Date(r.weighed_at as string),
      weighedBy:       (r.weighed_by as string | null) ?? '',
      notes:           (r.notes as string | null),
    }));

    // Fetch health_records
    const { data: healthRows } = await client
      .from('health_records')
      .select('id, herd_id, treatment_type, product_name, dosage, administered_by, administered_at, next_due_date, notes')
      .eq('farm_id', farmId)
      .order('administered_at', { ascending: false })
      .limit(500);

    const healthRecords: HealthRecord[] = (healthRows ?? []).map((r: Record<string, unknown>) => ({
      id:             r.id as string,
      herdId:         r.herd_id as string,
      treatmentType:  r.treatment_type as HealthRecord['treatmentType'],
      productName:    (r.product_name as string | null),
      dosage:         (r.dosage as string | null),
      administeredBy: (r.administered_by as string | null) ?? '',
      administeredAt: new Date(r.administered_at as string),
      nextDueDate:    r.next_due_date ? new Date(r.next_due_date as string) : null,
      notes:          (r.notes as string | null),
    }));

    // Fetch movements
    const { data: movementRows } = await client
      .from('movements')
      .select('id, herd_id, herd_name, from_pasture_id, from_pasture_name, to_pasture_id, to_pasture_name, moved_at, moved_by, notes')
      .eq('farm_id', farmId)
      .order('moved_at', { ascending: false })
      .limit(500);

    const movements: Movement[] = (movementRows ?? []).map((r: Record<string, unknown>) => ({
      id:              r.id as string,
      herdId:          r.herd_id as string,
      herdName:        r.herd_name as string,
      fromPastureId:   (r.from_pasture_id as string | null) ?? undefined,
      fromPastureName: (r.from_pasture_name as string | null),
      toPastureId:     r.to_pasture_id as string,
      toPastureName:   (r.to_pasture_name as string | null) ?? '',
      movedAt:         new Date(r.moved_at as string),
      movedBy:         (r.moved_by as string | null) ?? '',
      notes:           (r.notes as string | null) ?? undefined,
    }));

    // Fetch individual cattle
    const { data: cattleRows } = await client
      .from('cattle')
      .select(`
        id, farm_id, herd_id,
        visual_tag_id, chip_id,
        species, sex, breed, category, sheep_category, dob, status, notes,
        owner_name, color, origen, padre_vid, madre_vid,
        created_at, updated_at
      `)
      .eq('farm_id', farmId)
      .order('visual_tag_id', { ascending: true });

    const cattle: CattleRecord[] = (cattleRows ?? []).map((r: Record<string, unknown>) => ({
      id:            r.id as string,
      farmId:        r.farm_id as string,
      herdId:        (r.herd_id as string | null),
      visualTagId:   (r.visual_tag_id as string | null),
      chipId:        (r.chip_id as string | null),
      species:       ((r.species as string | null) ?? 'bovino') as CattleRecord['species'],
      sex:           (r.sex as CattleRecord['sex']),
      breed:         (r.breed as string | null),
      category:      (r.category as string | null),
      sheepCategory: (r.sheep_category as string | null),
      dob:           (r.dob as string | null),
      status:        (r.status as CattleRecord['status']) ?? 'active',
      notes:         (r.notes as string | null),
      ownerName:     (r.owner_name as string | null),
      color:         (r.color as string | null),
      origen:        (r.origen as string | null),
      padreVid:      (r.padre_vid as string | null),
      madreVid:      (r.madre_vid as string | null),
      createdAt:     r.created_at as string,
      updatedAt:     r.updated_at as string,
    }));

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
      WEIGHTS: weights,
      HEALTH_RECORDS: healthRecords,
      MOVEMENTS: movements,
      CATTLE: cattle,
      INFRASTRUCTURE: prev.INFRASTRUCTURE,
      isCustomFarm: true,
      farmId,
      farmSlug: farmRow.slug,
      userRole,
    }));
    return true;
  }, []);

  useEffect(() => {
    async function init() {
      if (!IS_DEMO_MODE) {
        // Production: Supabase only. If no session/farm, state stays empty
        // and middleware handles the redirect to /login or /setup.
        await loadFromSupabase();
      }
      // Demo mode: defaultData (seed data from data.ts) is already set via useState.
    }
    void init();
  }, [loadFromSupabase]);

  // refresh: re-reads from Supabase after any mutation
  const refresh = useCallback(() => {
    if (!IS_DEMO_MODE) {
      void loadFromSupabase();
    }
  }, [loadFromSupabase]);

  useEffect(() => {
    setData((prev) => ({ ...prev, refresh }));
  }, [refresh]);

  // D4 — Real-time sync: subscribe to changes for the active farm (production only)
  // Requires realtime enabled in Supabase dashboard for these tables:
  //   weight_records, health_records, movements, herds, pastures
  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const client = getBrowserClient();
    if (!client) return;

    let farmId: string | null = null;

    const sub = client
      .channel('farm-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weight_records' }, () => { if (farmId) refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_records' }, () => { if (farmId) refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => { if (farmId) refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'herds' }, () => { if (farmId) refresh(); })
      .subscribe();

    // Grab farmId once we have data so we only react to our farm's changes
    setData((prev) => { farmId = prev.DEMO_FARM.id; return prev; });

    return () => { void client.removeChannel(sub); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <FarmDataCtx.Provider value={data}>{children}</FarmDataCtx.Provider>;
}

export function useFarmData(): FarmDataShape {
  return useContext(FarmDataCtx);
}
