'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import ParcelDetailPanel from '@/components/ParcelDetailPanel';
import InfraDetailPanel from '@/components/InfraDetailPanel';
import PastureFormModal from '@/components/PastureFormModal';
import ERPPanel from '@/components/ERPPanel';
import ChatPanel from '@/components/ChatPanel';
import MobileNav from '@/components/MobileNav';
import type { SelectionState } from '@/lib/selection';
import { useFarmData } from '@/lib/FarmDataContext';
import { polygonAreaHectares } from '@/lib/farm-store';
import { pasturesDb } from '@/lib/db/pastures';
import { useCanDo } from '@/components/RoleGate';

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
  const { DEMO_FARM, isCustomFarm, refresh } = useFarmData();
  const { canEditPastures, canViewFinancials } = useCanDo();

  // Selection can be a pasture or an infrastructure feature
  const [selection, setSelection] = useState<SelectionState>(null);

  // Mobile sidebar visibility
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Drawing mode state
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [showPastureForm, setShowPastureForm] = useState(false);

  // ERP panel toggle
  const [showERP, setShowERP] = useState(false);

  // Chat panel toggle
  const [showChat, setShowChat] = useState(false);

  // Redraw mode — when set, finalizing replaces an existing pasture's polygon
  const [redrawPastureId, setRedrawPastureId] = useState<string | null>(null);

  function clearSelection() {
    setSelection(null);
  }

  function startDrawing() {
    setRedrawPastureId(null);
    setSelection(null);
    setDrawingPoints([]);
    setDrawingMode(true);
  }

  // If arriving from pasture detail page with ?redraw=pastureId, auto-start redraw
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const redrawId = params.get('redraw');
    if (redrawId && canEditPastures) {
      startRedraw(redrawId);
      window.history.replaceState(null, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Called from ParcelDetailPanel → "Redibujar límite" */
  const startRedraw = useCallback((pastureId: string) => {
    setRedrawPastureId(pastureId);
    setSelection(null);
    setDrawingPoints([]);
    setDrawingMode(true);
  }, []);

  function cancelDrawing() {
    setDrawingMode(false);
    setDrawingPoints([]);
    setRedrawPastureId(null);
  }

  function finalizeDrawing() {
    if (drawingPoints.length < 3) return;
    if (redrawPastureId) {
      // Redraw path — update existing pasture's geometry
      const coords: [number, number][][] = [[...drawingPoints, drawingPoints[0]]];
      void pasturesDb.update(redrawPastureId, { coordinates: coords }).then(() => {
        refresh();
      });
      setDrawingMode(false);
      setDrawingPoints([]);
      setRedrawPastureId(null);
    } else {
      setShowPastureForm(true);
    }
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

  const isRedrawMode = drawingMode && redrawPastureId !== null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-charcoal">
      <TopBar
        onLogout={clearSelection}
        onToggleERP={canViewFinancials ? () => setShowERP((v) => !v) : undefined}
        erpOpen={showERP}
        onToggleChat={() => setShowChat((v) => !v)}
        chatOpen={showChat}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left sidebar — hidden on mobile unless toggled; always shown on md+ */}
        {showERP
          ? <ERPPanel onClose={() => setShowERP(false)} />
          : (
              <>
                {/* Desktop sidebar */}
                <div className="hidden md:flex h-full">
                  <Sidebar selection={selection} onSelect={setSelection} onStartDrawing={startDrawing} />
                </div>
                {/* Mobile sidebar overlay */}
                {mobileSidebarOpen && (
                  <div className="md:hidden absolute inset-0 z-30 flex">
                    <div
                      className="flex-1 overflow-y-auto"
                      style={{ backgroundColor: '#0A0A0B', maxWidth: '85vw' }}
                    >
                      <Sidebar selection={selection} onSelect={(s) => { setSelection(s); setMobileSidebarOpen(false); }} onStartDrawing={startDrawing} />
                    </div>
                    <div className="flex-1 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
                  </div>
                )}
              </>
            )
        }

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
                ? isRedrawMode
                  ? 'Dibujá el nuevo límite del potrero'
                  : 'Hacé clic en el mapa para marcar vértices del potrero'
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
                {isRedrawMode ? 'Guardar nuevo límite' : 'Finalizar potrero'}
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

        {/* Floating "+" button — only for real farms + edit-capable roles, hidden while drawing */}
        {isCustomFarm && !drawingMode && canEditPastures && (
          <button
            onClick={startDrawing}
            title="Agregar potrero"
            className="absolute bottom-8 right-8 z-20 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-2xl border border-surface2 transition-all hover:scale-110"
            style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}
          >
            +
          </button>
        )}

        {/* Chat panel — slides in from the right */}
        {showChat && (
          <ChatPanel onClose={() => setShowChat(false)} />
        )}

        {/* Right detail panel — slides over the map */}
        {!drawingMode && !showChat && selection?.type === 'pasture' && (
          <ParcelDetailPanel
            pastureId={selection.id}
            onClose={clearSelection}
            onStartRedraw={startRedraw}
          />
        )}
        {!drawingMode && !showChat && selection?.type === 'infra' && (
          <InfraDetailPanel featureId={selection.id} onClose={clearSelection} />
        )}
      </div>

      {/* Pasture form modal — appears after polygon is finalized (new pasture only) */}
      {showPastureForm && drawnCoordinates.length > 0 && (
        <PastureFormModal
          coordinates={drawnCoordinates}
          estimatedAreaHa={estimatedAreaHa}
          farmId={DEMO_FARM.id}
          onClose={handlePastureFormClose}
          onSaved={handlePastureSaved}
        />
      )}

      {/* Mobile bottom navigation bar */}
      <MobileNav
        onToggleSidebar={() => setMobileSidebarOpen((v) => !v)}
        sidebarOpen={mobileSidebarOpen}
      />
    </div>
  );
}
