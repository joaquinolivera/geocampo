'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback } from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import ParcelDetailPanel from '@/components/ParcelDetailPanel';
import InfraDetailPanel from '@/components/InfraDetailPanel';
import PastureFormModal from '@/components/PastureFormModal';
import type { SelectionState } from '@/lib/selection';
import { useFarmData } from '@/lib/FarmDataContext';
import { polygonAreaHectares } from '@/lib/farm-store';

// Map must be dynamically imported — mapbox-gl uses browser APIs (no SSR)
const FarmMap = dynamic(() => import('@/components/FarmMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
        <p className="text-muted text-sm">Cargando mapa satelital...</p>
      </div>
    </div>
  ),
});

interface FarmPageProps {
  params: Promise<{ slug: string }>;
}

export default function FarmPage({ params: _params }: FarmPageProps) {
  const { isCustomFarm, refresh } = useFarmData();

  // Selection can be a pasture or an infrastructure feature
  const [selection, setSelection] = useState<SelectionState>(null);

  // Drawing mode state
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [showPastureForm, setShowPastureForm] = useState(false);

  function clearSelection() {
    setSelection(null);
  }

  function startDrawing() {
    setSelection(null); // close any open panel
    setDrawingPoints([]);
    setDrawingMode(true);
  }

  function cancelDrawing() {
    setDrawingMode(false);
    setDrawingPoints([]);
  }

  function finalizeDrawing() {
    if (drawingPoints.length < 3) return;
    setShowPastureForm(true);
  }

  const handleDrawClick = useCallback((pt: [number, number]) => {
    setDrawingPoints((prev) => [...prev, pt]);
  }, []);

  function handlePastureSaved() {
    refresh();
    setDrawingMode(false);
    setDrawingPoints([]);
    setShowPastureForm(false);
  }

  function handlePastureFormClose() {
    setShowPastureForm(false);
    // Keep drawingMode active so user can re-try or add more points
  }

  // Build closed polygon ring from drawing points (close the ring)
  const drawnCoordinates: [number, number][][] =
    drawingPoints.length >= 3
      ? [[...drawingPoints, drawingPoints[0]]]
      : [];

  const estimatedAreaHa =
    drawnCoordinates.length > 0
      ? polygonAreaHectares(drawnCoordinates)
      : 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-charcoal">
      <TopBar onLogout={clearSelection} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left sidebar — parcelas + infraestructura + alertas */}
        <Sidebar selection={selection} onSelect={setSelection} />

        {/* Interactive satellite map */}
        <FarmMap
          selection={selection}
          onSelect={setSelection}
          drawingMode={drawingMode}
          drawingPoints={drawingPoints}
          onDrawClick={handleDrawClick}
        />

        {/* Drawing mode HUD — shown when actively drawing */}
        {drawingMode && (
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-3 rounded-2xl border border-surface2 shadow-2xl"
            style={{ backgroundColor: 'rgba(10,10,11,0.92)', backdropFilter: 'blur(10px)' }}
          >
            <span className="text-white text-sm font-medium">
              {drawingPoints.length === 0
                ? 'Hacé clic en el mapa para marcar vértices del potrero'
                : drawingPoints.length < 3
                ? `${drawingPoints.length} punto${drawingPoints.length > 1 ? 's' : ''} — mínimo 3`
                : `${drawingPoints.length} vértices — listo para guardar`}
            </span>
            {drawingPoints.length >= 3 && (
              <button
                onClick={finalizeDrawing}
                className="rounded-xl px-4 py-1.5 text-sm font-bold transition-all"
                style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}
              >
                Finalizar potrero
              </button>
            )}
            <button
              onClick={cancelDrawing}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-muted border border-surface2 hover:text-white transition-colors"
              style={{ backgroundColor: '#1A1A1B' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Floating "+" button — only for real farms, hidden while drawing */}
        {isCustomFarm && !drawingMode && (
          <button
            onClick={startDrawing}
            title="Agregar potrero"
            className="absolute bottom-8 right-8 z-20 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-2xl border border-surface2 transition-all hover:scale-110"
            style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}
          >
            +
          </button>
        )}

        {/* Right detail panel — slides over the map */}
        {!drawingMode && selection?.type === 'pasture' && (
          <ParcelDetailPanel pastureId={selection.id} onClose={clearSelection} />
        )}
        {!drawingMode && selection?.type === 'infra' && (
          <InfraDetailPanel featureId={selection.id} onClose={clearSelection} />
        )}
      </div>

      {/* Pasture form modal — appears after polygon is finalized */}
      {showPastureForm && drawnCoordinates.length > 0 && (
        <PastureFormModal
          coordinates={drawnCoordinates}
          estimatedAreaHa={estimatedAreaHa}
          onClose={handlePastureFormClose}
          onSaved={handlePastureSaved}
        />
      )}
    </div>
  );
}
