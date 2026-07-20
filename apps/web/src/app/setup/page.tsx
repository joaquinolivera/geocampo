'use client';

/**
 * @fileoverview Farm setup wizard — responsive, desktop two-column layout.
 *
 * Steps:
 *  1. Mi Campo      — farm name + owner
 *  2. Mis Potreros  — add pastures via map click OR GeoJSON file import
 *  3. Mi Hacienda   — herd per pasture
 *  4. Resumen       — review + save
 *
 * GeoJSON import: drop a .geojson / .json file (exported from QGIS, Google Earth,
 * or a phone GPS app) → polygons appear on the map → fill in metadata per potrero.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import 'mapbox-gl/dist/mapbox-gl.css';
import Map, {
  Source,
  Layer,
  Marker,
  NavigationControl,
  type MapRef,
  type MapMouseEvent,
} from 'react-map-gl/mapbox';
import {
  buildStoredFarm,
  saveStoredFarm,
  polygonCentroid,
  polygonAreaHectares,
  generatePolygon,
  type PastureInput,
  type HerdInput,
  type FarmInput,
} from '@/lib/farm-store';
import { setDemoSession, IS_DEMO_MODE } from '@/lib/supabase';
import { apiPath } from '@/lib/api';
import { type GrassType, type WaterSupplyType } from '@/lib/data';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ─── Constants ─────────────────────────────────────────────────────────────────

const GRASS_OPTIONS: { value: GrassType; label: string }[] = [
  { value: 'natural',   label: 'Campo natural' },
  { value: 'mejorado',  label: 'Campo mejorado' },
  { value: 'ryegrass',  label: 'Raigrás / Trébol' },
  { value: 'festuca',   label: 'Festuca / Trébol rojo' },
  { value: 'alfalfa',   label: 'Alfalfa' },
  { value: 'brachiaria',label: 'Brachiaria / Pasto estrella' },
  { value: 'sorgo',     label: 'Sorgo forrajero' },
  { value: 'maiz',      label: 'Maíz (silaje)' },
  { value: 'otro',      label: 'Otro' },
];

const WATER_OPTIONS: { value: WaterSupplyType; label: string; icon: string }[] = [
  { value: 'tajamar',  label: 'Tajamar / Represa', icon: '💧' },
  { value: 'molino',   label: 'Molino de viento',  icon: '⚙️' },
  { value: 'bebedero', label: 'Bebedero (bomba)',   icon: '🪣' },
  { value: 'arroyo',   label: 'Arroyo / Río',       icon: '🌊' },
  { value: 'pozo',     label: 'Pozo',               icon: '🪣' },
  { value: 'none',     label: 'Sin agua propia',    icon: '❌' },
];

const BREEDS = ['Hereford', 'Aberdeen Angus', 'Shorthorn', 'Brahman', 'Limousin', 'Charolais', 'Criollo', 'Otra'];

const COLORS = ['#DEFF9A', '#9ADEFF', '#FFB444', '#FF9ADE', '#B4FF9A', '#DEA0FF'];

// ─── Tiny UI helpers ───────────────────────────────────────────────────────────

const INPUT = 'w-full rounded-xl border border-surface2 bg-surface px-4 py-2.5 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors';
const SELECT = INPUT + ' cursor-pointer';

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <span className="text-white text-sm font-medium">{children}</span>
      {hint && <span className="text-muted text-xs ml-2">({hint})</span>}
    </div>
  );
}

function StepDot({ n, current }: { n: number; current: number }) {
  const done = current > n;
  const active = current === n;
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shrink-0"
        style={{
          backgroundColor: done ? '#DEFF9A' : active ? '#DEFF9A20' : 'transparent',
          borderColor: done || active ? '#DEFF9A' : '#2A2A2B',
          color: done ? '#0A0A0B' : active ? '#DEFF9A' : '#555',
        }}
      >
        {done ? '✓' : n}
      </div>
      {n < 4 && <div className="w-6 h-px hidden sm:block" style={{ backgroundColor: current > n ? '#DEFF9A' : '#2A2A2B' }} />}
    </div>
  );
}

// ─── GeoJSON parser ────────────────────────────────────────────────────────────

interface ParsedFeature {
  name: string;
  coordinates: [number, number][][];
  properties: Record<string, unknown>;
}

function parseGeoJSON(raw: unknown): ParsedFeature[] {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid GeoJSON');
  const obj = raw as Record<string, unknown>;

  const features: unknown[] =
    obj.type === 'FeatureCollection'
      ? (obj.features as unknown[]) ?? []
      : obj.type === 'Feature'
      ? [obj]
      : obj.type === 'Polygon'
      ? [{ type: 'Feature', geometry: obj, properties: {} }]
      : [];

  return features
    .map((f, i) => {
      const feat = f as Record<string, unknown>;
      const geom = feat.geometry as Record<string, unknown>;
      const props = (feat.properties ?? {}) as Record<string, unknown>;
      if (!geom || geom.type !== 'Polygon') return null;

      const coords = geom.coordinates as [number, number][][];
      const name =
        (props.name as string) ||
        (props.Name as string) ||
        (props.NOMBRE as string) ||
        (props.potrero as string) ||
        `Potrero ${i + 1}`;
      return { name, coordinates: coords, properties: props };
    })
    .filter(Boolean) as ParsedFeature[];
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);

  const [step, setStep] = useState(1);

  // Step 1
  const [farmName, setFarmName] = useState('');
  const [ownerName, setOwnerName] = useState('');

  // Step 2 — pastures
  const [pastures, setPastures] = useState<PastureInput[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null); // index being edited
  const [draft, setDraft] = useState<Partial<PastureInput>>({});
  // Multi-point polygon drawing
  const [pickingPolygon, setPickingPolygon] = useState(false);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Ref mirrors state so handleMapClick sees the current value synchronously
  const pickingPolygonRef = useRef(false);
  function startDrawing() {
    pickingPolygonRef.current = true;
    setDraftPoints([]);
    setPickingPolygon(true);
  }
  function stopDrawing() {
    pickingPolygonRef.current = false;
    setPickingPolygon(false);
  }

  // Map click — uses Map's own LngLat (correct coords) + ref guard (no stale closure)
  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (!pickingPolygonRef.current) return;
    setDraftPoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
  }, []);

  // Step 3 — herds
  const [herds, setHerds] = useState<Partial<HerdInput>[]>([]);


  // Fly to first imported/committed pasture
  useEffect(() => {
    if (pastures.length === 0 || !mapRef.current) return;
    const last = pastures[pastures.length - 1];
    const coords = last.coordinates ?? [];
    const center = coords.length ? polygonCentroid(coords) : last.center;
    if (center) {
      mapRef.current.flyTo({ center, zoom: 13, duration: 1000 });
    }
  }, [pastures.length]);

  // Fly to first draft vertex so the map zooms in where you're drawing
  useEffect(() => {
    if (draftPoints.length !== 1 || !mapRef.current) return;
    mapRef.current.flyTo({ center: draftPoints[0], zoom: 14, duration: 800 });
  }, [draftPoints.length]);

  // ── GeoJSON file import ──────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGeoError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const features = parseGeoJSON(raw);
        if (features.length === 0) throw new Error('No se encontraron polígonos en el archivo.');

        const imported: PastureInput[] = features.map((f) => {
          const areaHa = polygonAreaHectares(f.coordinates);
          const props = f.properties;
          return {
            name: f.name,
            coordinates: f.coordinates,
            areaHectares: Math.round(areaHa * 10) / 10,
            // Try to read capacity from properties (common field names)
            carryingCapacity: Number(props.capacidad ?? props.capacity ?? props.cap ?? Math.round(areaHa)) || Math.round(areaHa),
            grassType: (props.pasto ?? props.grass ?? undefined) as GrassType | undefined,
            waterSupply: (props.agua ?? props.water ?? undefined) as WaterSupplyType | undefined,
            notes: (props.notas ?? props.notes ?? '') as string,
          };
        });

        setPastures((prev) => [...prev, ...imported]);
      } catch (err) {
        setGeoError(err instanceof Error ? err.message : 'Error al leer el archivo GeoJSON.');
      }
      // Reset input so the same file can be re-imported
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  }

  // ── Pasture draft helpers ────────────────────────────────────────────────────
  const canAddDraft = !!(draft.name && draft.carryingCapacity);

  // ── Polygon drawing controls ──────────────────────────────────────────────────
  function closePolygon() {
    if (draftPoints.length < 3) return;
    stopDrawing(); // sets ref synchronously — next map click is ignored
    const ring: [number, number][] = [...draftPoints, draftPoints[0]];
    const coords: [number, number][][] = [ring];
    const areaHa = Math.round(polygonAreaHectares(coords) * 10) / 10;
    setDraft((d) => ({ ...d, coordinates: coords, areaHectares: areaHa }));
    setDraftPoints([]);
  }

  function cancelPolygon() {
    stopDrawing();
    setDraftPoints([]);
    setDraft((d) => ({ ...d, coordinates: undefined }));
  }

  function undoLastPoint() {
    setDraftPoints((prev) => prev.slice(0, -1));
  }

  function commitDraft() {
    if (!canAddDraft) return;
    const p = { ...draft } as PastureInput;
    if (!p.areaHectares) {
      p.areaHectares = p.coordinates ? polygonAreaHectares(p.coordinates) : 10;
    }
    // If no location was provided, auto-assign a staggered default
    if (!p.center && !p.coordinates) {
      const idx = editIdx !== null ? editIdx : pastures.length;
      p.center = [-63.0 + idx * 0.06, -34.0 + idx * 0.06];
    }
    if (editIdx !== null) {
      setPastures((prev) => prev.map((x, i) => (i === editIdx ? p : x)));
      setEditIdx(null);
    } else {
      setPastures((prev) => [...prev, p]);
    }
    setDraft({});
    setDraftPoints([]);
    setPickingPolygon(false);
  }

  function startEdit(i: number) {
    setEditIdx(i);
    setDraft({ ...pastures[i] });
  }

  function removePasture(i: number) {
    setPastures((prev) => prev.filter((_, idx) => idx !== i));
    if (editIdx === i) { setEditIdx(null); setDraft({}); }
  }

  // ── Step 3 init ──────────────────────────────────────────────────────────────
  function initHerds() {
    setHerds(
      pastures.map((p, i) => ({
        pastureId: `pasture-${i + 1}`,
        name: `Lote ${p.name}`,
        cattleCount: undefined,
        breed: 'Hereford',
        entryDate: new Date().toISOString().split('T')[0],
      })),
    );
  }

  const allHerdsValid = herds.length > 0 && herds.every(
    (h) => h.name && h.cattleCount && h.cattleCount > 0 && h.breed && h.entryDate,
  );

  // ── Save ─────────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const slug = farmName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (IS_DEMO_MODE) {
      // Demo mode only: save to localStorage
      const input: FarmInput = {
        name: farmName.trim(),
        ownerName: ownerName.trim(),
        pastures,
        herds: herds as HerdInput[],
      };
      saveStoredFarm(buildStoredFarm(input));
      setDemoSession(
        `${ownerName.trim().toLowerCase().replace(/\s+/g, '.')}@campo.local`,
        slug,
      );
      setSaving(false);
      router.push(`/${slug}`);
      return;
    }

    // Production: Supabase is the only source of truth
    const { getBrowserClient } = await import('@/lib/supabase');
    const client = getBrowserClient();
    if (!client) {
      setSaveError('No se pudo conectar con la base de datos.');
      setSaving(false);
      return;
    }
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) {
      router.push('/login');
      return;
    }

    try {
      const herdsWithIndex = (herds as HerdInput[]).map((h, i) => ({
        ...h,
        pastureIndex: i,
      }));
      const res = await fetch(apiPath('/api/farms'), {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug, name: farmName.trim(), pastures, herds: herdsWithIndex }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.error('[setup] save failed:', err);
      setSaveError('Error al guardar la estancia. Verificá tu conexión e intentá de nuevo.');
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(`/${slug}`);
  }

  // ── Map GeoJSON for saved pastures ───────────────────────────────────────────
  const mapGeoJSON = {
    type: 'FeatureCollection' as const,
    features: [
      ...pastures.map((p, i) => {
        const coords = p.coordinates ?? (p.center ? generatePolygon(p.center, p.areaHectares || 10).coordinates : null);
        if (!coords) return null;
        return {
          type: 'Feature' as const,
          properties: { id: i, name: p.name, color: COLORS[i % COLORS.length], editing: editIdx === i ? 1 : 0 },
          geometry: { type: 'Polygon' as const, coordinates: coords },
        };
      }).filter((f): f is NonNullable<typeof f> => f !== null),
      ...(draft.coordinates ? [{
        type: 'Feature' as const,
        properties: { id: -1, name: draft.name ?? '?', color: '#FFFFFF', editing: 1 },
        geometry: { type: 'Polygon' as const, coordinates: draft.coordinates },
      }] : []),
    ],
  };

  // ── Live drawing preview GeoJSON ──────────────────────────────────────────────
  // All geometry is on the Mapbox canvas so it renders through the transparent click-catcher.
  const drawingGeoJSON = {
    type: 'FeatureCollection' as const,
    features: [
      // Vertex dots — circle + label rendered on canvas
      ...draftPoints.map((pt, i) => ({
        type: 'Feature' as const,
        properties: { ptIndex: i, ptLabel: i === 0 ? '★' : String(i + 1) },
        geometry: { type: 'Point' as const, coordinates: pt },
      })),
      // Filled preview polygon (when ≥3 points)
      ...(draftPoints.length >= 3 ? [{
        type: 'Feature' as const,
        properties: { shape: 'poly' },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[...draftPoints, draftPoints[0]]],
        },
      }] : []),
      // Line connecting all points (always when ≥2)
      ...(draftPoints.length >= 2 ? [{
        type: 'Feature' as const,
        properties: { shape: 'line' },
        geometry: {
          type: 'LineString' as const,
          coordinates: draftPoints.length >= 3
            ? [...draftPoints, draftPoints[0]] // close the preview line
            : draftPoints,
        },
      }] : []),
    ],
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // The map panel is shared between step 2 and is always visible on desktop (right col)
  const mapPanel = (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden border border-surface2">
      {TOKEN ? (
        <Map
          ref={mapRef}
          mapboxAccessToken={TOKEN}
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
          initialViewState={{ longitude: -63.0, latitude: -34.0, zoom: 4 }}
          onClick={handleMapClick}
          style={{ cursor: pickingPolygon ? 'crosshair' : undefined, width: '100%', height: '100%' }}
        >
          <NavigationControl position="bottom-right" />

          {/* Drawn pasture polygons */}
          <Source id="setup-pastures" type="geojson" data={mapGeoJSON}>
            <Layer
              id="setup-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': ['case', ['==', ['get', 'editing'], 1], 0.45, 0.25],
              }}
            />
            <Layer
              id="setup-outline"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['case', ['==', ['get', 'editing'], 1], 3, 1.5],
              }}
            />
            <Layer
              id="setup-labels"
              type="symbol"
              layout={{ 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'] }}
              paint={{ 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1.5 }}
            />
          </Source>

          {/* Live drawing preview — all canvas-based so it renders through the click-catcher overlay */}
          <Source id="drawing-preview" type="geojson" data={drawingGeoJSON}>
            {/* Polygon fill preview */}
            <Layer
              id="drawing-fill"
              type="fill"
              filter={['==', ['get', 'shape'], 'poly']}
              paint={{ 'fill-color': '#FFFFFF', 'fill-opacity': 0.12 }}
            />
            {/* Dashed outline */}
            <Layer
              id="drawing-line"
              type="line"
              filter={['==', ['get', 'shape'], 'line']}
              paint={{ 'line-color': '#FFFFFF', 'line-width': 2, 'line-dasharray': [4, 2] }}
            />
            {/* Vertex circles */}
            <Layer
              id="drawing-points"
              type="circle"
              filter={['==', '$type', 'Point']}
              paint={{
                'circle-radius': 9,
                'circle-color': ['case', ['==', ['get', 'ptIndex'], 0], '#DEFF9A', '#1A1A1B'],
                'circle-stroke-color': '#FFFFFF',
                'circle-stroke-width': 2,
              }}
            />
            {/* Vertex labels */}
            <Layer
              id="drawing-labels"
              type="symbol"
              filter={['==', '$type', 'Point']}
              layout={{
                'text-field': ['get', 'ptLabel'],
                'text-size': 10,
                'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
                'text-allow-overlap': true,
              }}
              paint={{
                'text-color': ['case', ['==', ['get', 'ptIndex'], 0], '#0A0A0B', '#FFFFFF'],
              }}
            />
          </Source>

          {/* Center marker for pastures without polygon coords (auto-placed) */}
          {pastures.map((p, i) => {
            if (p.coordinates) return null;
            if (!p.center) return null;
            return (
              <Marker key={`pc-${i}`} longitude={p.center[0]} latitude={p.center[1]} anchor="center">
                <div
                  className="w-7 h-7 rounded-full border-2 border-charcoal flex items-center justify-center text-charcoal text-xs font-bold shadow"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                >
                  {i + 1}
                </div>
              </Marker>
            );
          })}
        </Map>
      ) : (
        <div className="h-full flex flex-col items-center justify-center bg-surface gap-2 p-4">
          <span className="text-4xl">🗺️</span>
          <p className="text-muted text-xs text-center">
            Agrega <code className="text-lime">NEXT_PUBLIC_MAPBOX_TOKEN</code> en{' '}
            <code className="text-lime">.env.local</code> para ver el mapa satelital
          </p>
        </div>
      )}

      {/* Informational status banner — pointer-events-none, no buttons here */}
      {pickingPolygon && (
        <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none z-10">
          <div className="bg-charcoal/90 border border-white/20 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
            {draftPoints.length === 0
              ? '📍 Clic en el mapa para marcar el primer vértice (sentido horario)'
              : draftPoints.length < 3
              ? `📍 ${draftPoints.length} punto${draftPoints.length > 1 ? 's' : ''} — necesitás al menos 3`
              : `✅ ${draftPoints.length} puntos — usá los botones del panel izquierdo para finalizar`}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-charcoal flex flex-col overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface2">
        <button
          onClick={() => router.push('/login')}
          className="text-muted text-sm hover:text-white transition-colors"
        >
          ← Volver
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lime text-lg">🌿</span>
          <span className="text-white font-bold text-sm">GeoCampo — Configurar campo</span>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((n) => <StepDot key={n} n={n} current={step} />)}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANEL — form (scrollable) */}
        <div className="w-full lg:w-[480px] xl:w-[520px] shrink-0 overflow-y-auto p-6 flex flex-col gap-5">

          {/* ── STEP 1 ────────────────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-white text-xl font-bold mb-1">Mi campo</h2>
                <p className="text-muted text-sm">Datos básicos del establecimiento.</p>
              </div>

              <div>
                <Label hint="Ej: Estancia Don Roberto">Nombre del campo</Label>
                <input className={INPUT} value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="La Esperanza" />
              </div>
              <div>
                <Label>Dueño / Responsable</Label>
                <input className={INPUT} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Juan Pérez" />
              </div>

              <button
                disabled={!farmName.trim() || !ownerName.trim()}
                onClick={() => setStep(2)}
                className="w-full rounded-xl py-3 font-bold text-charcoal text-sm disabled:opacity-40 hover:brightness-110 transition-all"
                style={{ backgroundColor: '#DEFF9A' }}
              >
                Siguiente — Mis potreros →
              </button>
            </>
          )}

          {/* ── STEP 2 ────────────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-white text-xl font-bold mb-1">Mis potreros</h2>
                <p className="text-muted text-sm">Importá un GeoJSON o agregá cada potrero a mano.</p>
              </div>

              {/* GeoJSON import */}
              <div className="rounded-xl border border-dashed border-surface2 p-4 flex flex-col gap-3">
                <p className="text-lime text-xs font-semibold uppercase tracking-wider">📂 Importar GeoJSON</p>
                <p className="text-muted text-xs leading-relaxed">
                  Exportá tus potreros desde QGIS, Google Earth o una app GPS como{' '}
                  <strong className="text-white">geojson.io</strong> y subí el archivo acá.
                  Se detectan automáticamente el nombre y la superficie de cada potrero.
                </p>
                <input ref={fileRef} type="file" accept=".geojson,.json" onChange={handleFileChange} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl border border-lime/30 bg-lime/5 py-2.5 text-lime text-sm font-medium hover:bg-lime/10 transition-colors"
                >
                  Seleccionar archivo .geojson
                </button>
                {geoError && <p className="text-critical text-xs">{geoError}</p>}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-surface2" />
                <span className="text-muted text-xs">o agregar a mano</span>
                <div className="flex-1 h-px bg-surface2" />
              </div>

              {/* Pasture list */}
              {pastures.length > 0 && (
                <div className="flex flex-col gap-2">
                  {pastures.map((p, i) => (
                    <div key={i} className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer ${editIdx === i ? 'border-lime/60 bg-lime/5' : 'border-surface2 bg-surface hover:border-surface2/80'}`}
                      onClick={() => startEdit(i)}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-muted text-xs">{p.areaHectares ? `${p.areaHectares} ha · ` : ''}{p.carryingCapacity} cab. cap.</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removePasture(i); }} className="text-muted hover:text-critical text-sm transition-colors">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Draft form */}
              <div className="rounded-xl border border-lime/20 bg-lime/5 p-4 flex flex-col gap-3">
                <p className="text-lime text-xs font-semibold uppercase tracking-wider">
                  {editIdx !== null ? `✏️ Editando potrero ${editIdx + 1}` : '+ Nuevo potrero'}
                </p>

                <div>
                  <Label>Nombre del potrero</Label>
                  <input className={INPUT} value={draft.name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Potrero Norte, Lote 3A…" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {draft.coordinates && draft.areaHectares && (
                    <div className="flex items-center gap-2 rounded-xl border border-lime/20 bg-lime/5 px-3 py-2 text-lime text-xs col-span-1">
                      <span>📐</span>
                      <span>{draft.areaHectares} ha calculadas</span>
                    </div>
                  )}
                  <div className={draft.coordinates && draft.areaHectares ? 'col-span-1' : 'col-span-2'}>
                    <Label hint="cabezas">Capacidad de carga</Label>
                    <input type="number" min={1} className={INPUT} value={draft.carryingCapacity ?? ''} onChange={(e) => setDraft((d) => ({ ...d, carryingCapacity: Number(e.target.value) }))} placeholder="20" />
                  </div>
                </div>

                <div>
                  <Label>Tipo de pastura principal</Label>
                  <select className={SELECT} value={draft.grassType ?? ''} onChange={(e) => setDraft((d) => ({ ...d, grassType: e.target.value as GrassType }))}>
                    <option value="">Seleccionar…</option>
                    {GRASS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Fuente de agua</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {WATER_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, waterSupply: o.value }))}
                        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all"
                        style={{
                          borderColor: draft.waterSupply === o.value ? '#DEFF9A' : '#2A2A2B',
                          backgroundColor: draft.waterSupply === o.value ? '#DEFF9A15' : 'transparent',
                          color: draft.waterSupply === o.value ? '#DEFF9A' : '#888',
                        }}
                      >
                        <span>{o.icon}</span>
                        <span>{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label hint="rotaciones, historial, observaciones">Observaciones</Label>
                  <textarea
                    className={INPUT + ' resize-none'}
                    rows={2}
                    value={draft.notes ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    placeholder="Ej: Potrero con sombra natural, historial de garrapatas en verano…"
                  />
                </div>

                <div>
                  <Label hint="opcional">Forma en el mapa</Label>

                  {/* GeoJSON imported polygon */}
                  {draft.coordinates && !pickingPolygon && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-xl border border-lime/30 bg-lime/5 px-3 py-2 text-lime text-xs font-medium">
                        ✓ {draft.coordinates[0].length - 1} vértices
                        {draft.areaHectares ? ` · ${draft.areaHectares.toFixed(1)} ha` : ''}
                      </div>
                      <button
                        onClick={() => {
                          setDraft((d) => ({ ...d, coordinates: undefined }));
                          setDraftPoints([]);
                          startDrawing();
                        }}
                        className="rounded-xl border border-surface2 px-3 py-2 text-muted text-xs hover:text-white transition-colors"
                      >
                        Redibujar
                      </button>
                    </div>
                  )}

                  {/* Drawing in progress — buttons here in the panel, never on the map */}
                  {pickingPolygon && (
                    <div className="flex flex-col gap-2">
                      <div className="rounded-xl border border-white/10 bg-surface px-3 py-2 text-xs text-muted">
                        {draftPoints.length === 0
                          ? '👆 Hacé clic en el mapa para marcar los vértices (sentido horario)'
                          : draftPoints.length < 3
                          ? `${draftPoints.length} punto${draftPoints.length > 1 ? 's' : ''} marcado${draftPoints.length > 1 ? 's' : ''} — necesitás al menos 3`
                          : `✅ ${draftPoints.length} puntos — listo para finalizar`}
                      </div>
                      <div className="flex gap-2">
                        {draftPoints.length > 0 && (
                          <button onClick={undoLastPoint}
                            className="flex-1 rounded-xl border border-surface2 py-2 text-white text-xs font-medium hover:bg-surface transition-colors">
                            ↩ Deshacer
                          </button>
                        )}
                        {draftPoints.length >= 3 && (
                          <button onClick={closePolygon}
                            className="flex-[2] rounded-xl py-2 font-bold text-charcoal text-xs hover:brightness-110 transition-all"
                            style={{ backgroundColor: '#DEFF9A' }}>
                            ✓ Finalizar polígono
                          </button>
                        )}
                        <button onClick={cancelPolygon}
                          className="flex-1 rounded-xl border border-surface2 py-2 text-muted text-xs hover:text-white hover:bg-surface transition-colors">
                          ✕ Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* No location yet */}
                  {!draft.coordinates && !pickingPolygon && (
                    <button
                      onClick={() => {
                        setDraftPoints([]);
                        startDrawing();
                      }}
                      className="w-full rounded-xl border py-2.5 text-sm font-medium transition-all hover:border-lime/40 hover:text-lime"
                      style={{ borderColor: '#2A2A2B', color: '#888', backgroundColor: 'transparent' }}
                    >
                      ✏️ Dibujar polígono en el mapa
                    </button>
                  )}
                </div>

                <button
                  disabled={!canAddDraft}
                  onClick={commitDraft}
                  className="w-full rounded-xl py-2.5 font-bold text-charcoal text-sm disabled:opacity-40 hover:brightness-110 transition-all"
                  style={{ backgroundColor: '#DEFF9A' }}
                >
                  {editIdx !== null ? 'Guardar cambios' : 'Agregar potrero'}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 rounded-xl py-3 border border-surface2 text-white text-sm hover:bg-surface transition-colors">← Atrás</button>
                <button
                  disabled={pastures.length === 0}
                  onClick={() => { initHerds(); setStep(3); }}
                  className="flex-[2] rounded-xl py-3 font-bold text-charcoal text-sm disabled:opacity-40 hover:brightness-110 transition-all"
                  style={{ backgroundColor: '#DEFF9A' }}
                >
                  Siguiente — Mi hacienda →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3 ────────────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <div>
                <h2 className="text-white text-xl font-bold mb-1">Mi hacienda</h2>
                <p className="text-muted text-sm">Cuánta hacienda hay en cada potrero hoy.</p>
              </div>

              {herds.map((h, i) => (
                <div key={i} className="rounded-xl border border-surface2 bg-surface p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <p className="text-white text-sm font-semibold">{pastures[i]?.name}</p>
                    <span className="text-muted text-xs ml-auto">{pastures[i]?.areaHectares} ha · cap. {pastures[i]?.carryingCapacity}</span>
                  </div>

                  <div>
                    <Label>Nombre del lote / tropa</Label>
                    <input className={INPUT} value={h.name ?? ''} onChange={(e) => setHerds((prev) => { const n = [...prev]; n[i] = { ...n[i], name: e.target.value }; return n; })} placeholder="Vacas preñadas lote A" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cabezas actuales</Label>
                      <input type="number" min={0} className={INPUT} value={h.cattleCount ?? ''} onChange={(e) => setHerds((prev) => { const n = [...prev]; n[i] = { ...n[i], cattleCount: Number(e.target.value) }; return n; })} placeholder="30" />
                    </div>
                    <div>
                      <Label>Raza</Label>
                      <select className={SELECT} value={h.breed ?? 'Hereford'} onChange={(e) => setHerds((prev) => { const n = [...prev]; n[i] = { ...n[i], breed: e.target.value }; return n; })}>
                        {BREEDS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Fecha de ingreso al potrero</Label>
                    <input type="date" className={INPUT} value={h.entryDate ?? ''} onChange={(e) => setHerds((prev) => { const n = [...prev]; n[i] = { ...n[i], entryDate: e.target.value }; return n; })} />
                  </div>

                  {/* Stocking warning */}
                  {h.cattleCount && pastures[i]?.carryingCapacity && h.cattleCount > pastures[i].carryingCapacity && (
                    <div className="rounded-xl border border-critical/30 bg-critical/10 px-3 py-2 text-critical text-xs">
                      ⚠️ {h.cattleCount} cab. supera la capacidad de {pastures[i].carryingCapacity} cab. — potrero sobrecargado.
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 rounded-xl py-3 border border-surface2 text-white text-sm hover:bg-surface transition-colors">← Atrás</button>
                <button disabled={!allHerdsValid} onClick={() => setStep(4)} className="flex-[2] rounded-xl py-3 font-bold text-charcoal text-sm disabled:opacity-40 hover:brightness-110 transition-all" style={{ backgroundColor: '#DEFF9A' }}>
                  Revisar y guardar →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 4 ────────────────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <div>
                <h2 className="text-white text-xl font-bold mb-1">Resumen</h2>
                <p className="text-muted text-sm">Verificá antes de guardar.</p>
              </div>

              <div className="rounded-xl border border-surface2 bg-surface px-4 py-3">
                <p className="text-muted text-xs uppercase tracking-wider mb-1">Campo</p>
                <p className="text-white font-bold">{farmName}</p>
                <p className="text-muted text-sm">{ownerName}</p>
              </div>

              {pastures.map((p, i) => {
                const h = herds[i];
                const overloaded = h?.cattleCount && h.cattleCount > p.carryingCapacity;
                const grass = GRASS_OPTIONS.find((g) => g.value === p.grassType);
                const water = WATER_OPTIONS.find((w) => w.value === p.waterSupply);
                return (
                  <div key={i} className="rounded-xl border border-surface2 bg-surface px-4 py-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <p className="text-white font-semibold text-sm">{p.name}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: overloaded ? '#FF444420' : '#DEFF9A20', color: overloaded ? '#FF4444' : '#DEFF9A' }}>
                        {overloaded ? '⚠️ Sobrecarga' : '✓ OK'}
                      </span>
                    </div>
                    <p className="text-muted text-xs">{p.areaHectares} ha · cap. {p.carryingCapacity} cab.</p>
                    {grass && <p className="text-muted text-xs">🌿 {grass.label}</p>}
                    {water && <p className="text-muted text-xs">{water.icon} {water.label}</p>}
                    {h && <p className="text-muted text-xs">🐄 {h.cattleCount} cab. {h.breed} — &ldquo;{h.name}&rdquo;</p>}
                    {p.notes && <p className="text-muted text-xs italic">"{p.notes}"</p>}
                  </div>
                );
              })}

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 rounded-xl py-3 border border-surface2 text-white text-sm hover:bg-surface transition-colors">← Editar</button>
                <button onClick={handleSave} disabled={saving} className="flex-[2] rounded-xl py-3 font-bold text-charcoal text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60" style={{ backgroundColor: '#DEFF9A' }}>
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                      Guardando…
                    </span>
                  ) : '🌿 Guardar y abrir mi campo'}
                </button>
              </div>
              {saveError && (
                <p className="text-red-400 text-xs mt-2 text-center">{saveError}</p>
              )}

              {/* Mobile map */}
              <div className="lg:hidden h-56 mt-2">{mapPanel}</div>
            </>
          )}

          <p className="text-muted text-xs text-center pb-2">
            Podés editar estos datos en cualquier momento volviendo a <strong>/setup</strong>.
          </p>
        </div>

        {/* RIGHT PANEL — map, desktop only */}
        <div className="hidden lg:flex flex-1 p-4">
          {mapPanel}
        </div>
      </div>
    </div>
  );
}
