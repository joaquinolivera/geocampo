'use client';

/**
 * /[slug]/[pastureId] — Dedicated pasture detail page
 *
 * Reached by double-clicking a pasture on the map.
 * Renders ParcelDetailPanel in a full-page wrapper.
 * "Close" → go back to farm map. "Redraw" → go back to farm map with redraw flag.
 */

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ParcelDetailPanel from '@/components/ParcelDetailPanel';
import { useFarmData } from '@/lib/FarmDataContext';

interface Props {
  params: Promise<{ slug: string; pastureId: string }>;
}

export default function PastureDetailPage({ params }: Props) {
  const { slug, pastureId } = use(params);
  const router = useRouter();
  const { PASTURES } = useFarmData();

  const pasture = PASTURES.find((p) => p.id === pastureId);

  const handleClose = () => router.push(`/${slug}`);
  // For redraw, go back to map — the map page can re-enter drawing mode
  // by passing a query param that it reads on mount.
  const handleRedraw = (id: string) => router.push(`/${slug}?redraw=${id}`);

  return (
    <div className="min-h-screen bg-charcoal text-white flex flex-col">

      {/* Top nav bar */}
      <div className="border-b border-surface2 px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <Link
          href={`/${slug}`}
          className="text-muted hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← Volver al mapa
        </Link>
        {pasture && (
          <>
            <span className="text-surface2">/</span>
            <span className="text-white text-sm font-medium">{pasture.name}</span>
          </>
        )}
      </div>

      {/* Detail panel takes full width */}
      <div className="flex-1 overflow-y-auto">
        {pasture ? (
          <div className="max-w-2xl mx-auto py-6 px-4">
            <ParcelDetailPanel
              pastureId={pastureId}
              onClose={handleClose}
              onStartRedraw={handleRedraw}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <p className="text-muted text-sm">Potrero no encontrado.</p>
            <Link href={`/${slug}`} className="text-lime text-sm hover:brightness-110">
              ← Volver al mapa
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
