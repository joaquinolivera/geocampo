'use client';

/**
 * @fileoverview GeoCampo interactive satellite map.
 *
 * Layers rendered (in z-order):
 *  1. Pasture polygons  — filled + outlined, coloured by stocking load
 *  2. Fence lines       — dashed slate lines
 *  3. Corral polygons   — orange outlined polygons
 *  4. Infrastructure markers — water/building/corral-centroid Markers
 *  5. Herd markers      — coloured by load status
 *  6. Legend overlay
 */

import { useCallback, useMemo, useRef, useState } from 'react';
// react-map-gl v8: import from 'react-map-gl/mapbox' (mapbox-gl renderer)
import Map, {
  Source,
  Layer,
  Marker,
  NavigationControl,
  ScaleControl,
  type MapRef,
  type MapMouseEvent,
} from 'react-map-gl/mapbox';
import type { FeatureCollection, LineString, Polygon as GeoPolygon } from 'geojson';
import { type InfrastructureFeature } from '@/lib/data';
import { useFarmData } from '@/lib/FarmDataContext';
import { buildLoadAlert, loadStatusColor, calculateCapacityPercent } from '@/lib/alerts';
import type { SelectionState } from '@/lib/selection';
import { useT } from '@/lib/i18n';

// Mapbox GL CSS — imported here (client component) so it never runs on the server
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

interface FarmMapProps {
  selection: SelectionState;
  onSelect: (s: SelectionState) => void;
  /** When true, map clicks add polygon vertices instead of selecting features */
  drawingMode?: boolean;
  drawingPoints?: [number, number][];
  onDrawClick?: (pt: [number, number]) => void;
}

function centroid(coords: [number, number][][]): [number, number] {
  const ring = coords[0];
  const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lon, lat];
}

const INFRA_ICON: Record<string, string> = {
  tajamar: '💧', molino: '⚙️', bebedero: '🪣', pozo: '🪣',
  casco: '🏠', galpon: '🏗️', tambo: '🏚️', otro: '📍',
  manga: '🟧', corral: '🟧', bañadero: '🛁', embarcadero: '🚢',
};

const INFRA_COLOR: Record<InfrastructureFeature['type'], string> = {
  water: '#38BDF8',
  fence: '#94A3B8',
  corral: '#FB923C',
  building: '#D4B483',
};

const CONDITION_COLOR: Record<string, string> = {
  buena: '#DEFF9A',
  regular: '#FFB444',
  mala: '#FF4444',
};

export default function FarmMap({
  selection,
  onSelect,
  drawingMode = false,
  drawingPoints = [],
  onDrawClick,
}: FarmMapProps) {
  const { t } = useT();
  const { PASTURES, HERDS, INFRASTRUCTURE, DEMO_FARM } = useFarmData();
  const mapRef = useRef<MapRef>(null);
  const [hoveredPastureId, setHoveredPastureId] = useState<string | null>(null);

  const selectedPastureId = selection?.type === 'pasture' ? selection.id : null;
  const selectedInfraId   = selection?.type === 'infra'   ? selection.id : null;

  // Pasture polygon GeoJSON
  const pastureGeoJSON = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: PASTURES.map((pasture) => {
        const herd = HERDS.find((h) => h.pastureId === pasture.id);
        const alert = buildLoadAlert(pasture, herd);
        const color = alert ? loadStatusColor(alert.status) : '#DEFF9A';
        const pct = herd ? calculateCapacityPercent(herd.cattleCount, pasture.carryingCapacity) : 0;
        return {
          type: 'Feature' as const,
          properties: {
            id: pasture.id,
            name: pasture.name,
            color,
            pct: Math.round(pct),
            selected: selectedPastureId === pasture.id ? 1 : 0,
            hovered: hoveredPastureId === pasture.id ? 1 : 0,
          },
          geometry: pasture.geometry as GeoPolygon,
        };
      }),
    }),
    [selectedPastureId, hoveredPastureId]
  );

  const fenceGeoJSON = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: INFRASTRUCTURE.filter(
        (f) => f.type === 'fence' && f.geometry.type === 'LineString'
      ).map((f) => ({
        type: 'Feature' as const,
        properties: { id: f.id, name: f.name },
        geometry: f.geometry as LineString,
      })),
    }),
    []
  );

  const corralGeoJSON = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: INFRASTRUCTURE.filter(
        (f) => f.type === 'corral' && f.geometry.type === 'Polygon'
      ).map((f) => ({
        type: 'Feature' as const,
        properties: { id: f.id, selected: selectedInfraId === f.id ? 1 : 0 },
        geometry: f.geometry as GeoPolygon,
      })),
    }),
    [selectedInfraId]
  );

  const pointInfra = useMemo(() => {
    const pts: Array<{ feature: InfrastructureFeature; coord: [number, number] }> = [];
    INFRASTRUCTURE.forEach((f) => {
      if (f.geometry.type === 'Point') {
        pts.push({ feature: f, coord: f.geometry.coordinates as [number, number] });
      } else if (f.type === 'corral' && f.geometry.type === 'Polygon') {
        pts.push({
          feature: f,
          coord: centroid(f.geometry.coordinates as [number, number][][]),
        });
      }
    });
    return pts;
  }, []);

  // Draft polygon GeoJSON for drawing mode
  const draftLineGeoJSON = useMemo<FeatureCollection>(() => {
    if (drawingPoints.length < 2) {
      return { type: 'FeatureCollection', features: [] };
    }
    const coords = [...drawingPoints, drawingPoints[0]]; // close ring for preview
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords } as LineString,
        },
      ],
    };
  }, [drawingPoints]);

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (drawingMode) {
        onDrawClick?.([e.lngLat.lng, e.lngLat.lat]);
        return;
      }
      const map = mapRef.current;
      if (!map) return;
      const features = map.queryRenderedFeatures(e.point, { layers: ['pasture-fill'] });
      if (features.length > 0) {
        const id = features[0].properties?.id as string;
        onSelect(selectedPastureId === id ? null : { type: 'pasture', id });
      } else {
        onSelect(null);
      }
    },
    [selectedPastureId, onSelect, drawingMode, onDrawClick]
  );

  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    const map = mapRef.current;
    if (!map) return;
    if (drawingMode) {
      map.getCanvas().style.cursor = 'crosshair';
      return;
    }
    // Guard: layer may not yet be in the style (race condition on first render)
    if (!map.getLayer('pasture-fill')) return;
    const features = map.queryRenderedFeatures(e.point, { layers: ['pasture-fill'] });
    const id = features[0]?.properties?.id as string | undefined;
    setHoveredPastureId(id ?? null);
    map.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';
  }, [drawingMode]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPastureId(null);
  }, []);

  // No-token fallback
  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface gap-4 p-8">
        <span className="text-5xl">🗺️</span>
        <p className="text-lime text-xl font-bold">{t('map.noTokenTitle')}</p>
        <p className="text-muted text-sm text-center max-w-sm">
          {t('map.noTokenBody').split('NEXT_PUBLIC_MAPBOX_TOKEN').map((part, i) =>
            i === 0 ? (
              part
            ) : (
              <span key={i}>
                <code className="bg-surface2 px-1 rounded text-lime">NEXT_PUBLIC_MAPBOX_TOKEN</code>
                {part}
              </span>
            )
          )}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4 w-full max-w-xs">
          {PASTURES.map((p) => {
            const herd = HERDS.find((h) => h.pastureId === p.id);
            const alert = buildLoadAlert(p, herd);
            const color = alert ? loadStatusColor(alert.status) : '#DEFF9A';
            return (
              <button
                key={p.id}
                onClick={() =>
                  onSelect(selection?.id === p.id ? null : { type: 'pasture', id: p.id })
                }
                className="rounded-xl p-4 text-left border transition-all"
                style={{
                  backgroundColor: color + '18',
                  borderColor: selection?.id === p.id ? color : '#2A2A2B',
                }}
              >
                <div className="font-bold text-white text-sm">{p.name}</div>
                <div className="text-xs mt-1" style={{ color }}>
                  {herd
                    ? `${herd.cattleCount}/${p.carryingCapacity} ${t('parcel.heads')}`
                    : t('parcel.noHerd')}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={MAP_STYLE}
        initialViewState={{ longitude: DEMO_FARM.location[0], latitude: DEMO_FARM.location[1], zoom: 11.5 }}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="metric" />

        {/* Pasture polygons */}
        <Source id="pastures" type="geojson" data={pastureGeoJSON}>
          <Layer
            id="pasture-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': [
                'case',
                ['==', ['get', 'selected'], 1], 0.5,
                ['==', ['get', 'hovered'], 1], 0.38,
                0.22,
              ],
            }}
          />
          <Layer
            id="pasture-outline"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['case', ['==', ['get', 'selected'], 1], 3, 1.5],
              'line-opacity': 0.9,
            }}
          />
          <Layer
            id="pasture-labels"
            type="symbol"
            layout={{
              'text-field': ['get', 'name'],
              'text-size': 13,
              'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
            }}
            paint={{
              'text-color': '#FFFFFF',
              'text-halo-color': '#000000',
              'text-halo-width': 1.5,
            }}
          />
          <Layer
            id="pasture-pct"
            type="symbol"
            layout={{
              'text-field': ['concat', ['to-string', ['get', 'pct']], '%'],
              'text-size': 11,
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
              'text-offset': [0, 1.2],
            }}
            paint={{
              'text-color': ['get', 'color'],
              'text-halo-color': '#000000',
              'text-halo-width': 1,
            }}
          />
        </Source>

        {/* Fence lines */}
        <Source id="fences" type="geojson" data={fenceGeoJSON}>
          <Layer
            id="fence-line"
            type="line"
            paint={{
              'line-color': '#94A3B8',
              'line-width': 2,
              'line-dasharray': [4, 3],
              'line-opacity': 0.8,
            }}
          />
        </Source>

        {/* Corral polygons */}
        <Source id="corrals" type="geojson" data={corralGeoJSON}>
          <Layer
            id="corral-fill"
            type="fill"
            paint={{
              'fill-color': '#FB923C',
              'fill-opacity': ['case', ['==', ['get', 'selected'], 1], 0.35, 0.15],
            }}
          />
          <Layer
            id="corral-outline"
            type="line"
            paint={{
              'line-color': '#FB923C',
              'line-width': ['case', ['==', ['get', 'selected'], 1], 2.5, 1.5],
              'line-opacity': 0.9,
            }}
          />
        </Source>

        {/* Infrastructure point markers */}
        {pointInfra.map(({ feature: f, coord }) => {
          const color = INFRA_COLOR[f.type];
          const isSelected = selectedInfraId === f.id;
          const condColor = CONDITION_COLOR[f.condition] ?? '#DEFF9A';
          return (
            <Marker
              key={f.id}
              longitude={coord[0]}
              latitude={coord[1]}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect(isSelected ? null : { type: 'infra', id: f.id });
              }}
            >
              <div className="flex flex-col items-center cursor-pointer group" title={f.name}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-base border-2 shadow-lg transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: '#0A0A0B',
                    borderColor: isSelected ? condColor : color,
                    boxShadow: isSelected ? `0 0 0 3px ${color}40` : undefined,
                  }}
                >
                  {INFRA_ICON[f.subtype] ?? '📍'}
                </div>
                <div
                  className="w-2 h-2 rounded-full -mt-1 border border-charcoal"
                  style={{ backgroundColor: condColor }}
                />
                <div
                  className="absolute bottom-full mb-2 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: '#0A0A0B', color }}
                >
                  {f.name}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Herd markers */}
        {HERDS.map((herd) => {
          const pasture = PASTURES.find((p) => p.id === herd.pastureId);
          const alert = pasture ? buildLoadAlert(pasture, herd) : null;
          const color = alert ? loadStatusColor(alert.status) : '#DEFF9A';
          const isActive = selectedPastureId === herd.pastureId;
          return (
            <Marker
              key={herd.id}
              longitude={herd.coordinate[0]}
              latitude={herd.coordinate[1]}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect({ type: 'pasture', id: herd.pastureId });
              }}
            >
              <div className="flex flex-col items-center cursor-pointer group" title={herd.name}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 shadow-lg transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: '#0A0A0B',
                    borderColor: color,
                    boxShadow: isActive ? `0 0 0 3px ${color}50` : undefined,
                  }}
                >
                  🐄
                </div>
                <div
                  className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold shadow"
                  style={{ backgroundColor: color, color: '#0A0A0B' }}
                >
                  {herd.cattleCount}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Drawing mode — draft polygon preview */}
        {drawingMode && (
          <>
            <Source id="draft-line" type="geojson" data={draftLineGeoJSON}>
              <Layer
                id="draft-line-layer"
                type="line"
                paint={{
                  'line-color': '#DEFF9A',
                  'line-width': 2,
                  'line-dasharray': [4, 3],
                  'line-opacity': 0.9,
                }}
              />
            </Source>
            {drawingPoints.map((pt, i) => (
              <Marker key={i} longitude={pt[0]} latitude={pt[1]} anchor="center">
                <div
                  className="w-3 h-3 rounded-full border-2"
                  style={{
                    backgroundColor: i === 0 ? '#DEFF9A' : '#0A0A0B',
                    borderColor: '#DEFF9A',
                  }}
                />
              </Marker>
            ))}
          </>
        )}

        {/* Map legend */}
        <div
          className="absolute bottom-16 right-4 rounded-xl border border-surface2 p-3 space-y-1.5 text-[11px]"
          style={{
            backgroundColor: 'rgba(10,10,11,0.88)',
            backdropFilter: 'blur(8px)',
            minWidth: 180,
          }}
        >
          {/* Stocking load */}
          <p className="text-muted font-semibold uppercase tracking-wider text-[10px] mb-2">
            {t('map.legendLoad')}
          </p>
          {[
            { color: '#DEFF9A', label: t('map.loadNormal') },
            { color: '#FFB444', label: t('map.loadWarning') },
            { color: '#FF4444', label: t('map.loadCritical') },
          ].map((item) => (
            <div key={item.color} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-white">{item.label}</span>
            </div>
          ))}

          <div className="border-t border-surface2 my-2" />

          {/* Infrastructure */}
          <p className="text-muted font-semibold uppercase tracking-wider text-[10px] mb-2">
            {t('map.legendInfra')}
          </p>
          {[
            { color: '#38BDF8', label: t('map.infraWater'), icon: '💧' },
            { color: '#94A3B8', label: t('map.infraFence'), icon: '—' },
            { color: '#FB923C', label: t('map.infraCorral'), icon: '🟧' },
            { color: '#D4B483', label: t('map.infraBuilding'), icon: '🏠' },
          ].map((item) => (
            <div key={item.color} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-white">{item.label}</span>
            </div>
          ))}

          <div className="border-t border-surface2 my-2" />

          {/* Condition */}
          <p className="text-muted font-semibold uppercase tracking-wider text-[10px] mb-2">
            {t('map.legendCondition')}
          </p>
          {[
            { color: '#DEFF9A', label: t('map.condGood') },
            { color: '#FFB444', label: t('map.condFair') },
            { color: '#FF4444', label: t('map.condPoor') },
          ].map((item) => (
            <div key={item.color} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </Map>
    </div>
  );
}
