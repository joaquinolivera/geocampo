'use client';

/**
 * MobileNav — bottom navigation bar shown only on mobile (< md).
 * Slides up a sheet with main navigation links.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useFarmData } from '@/lib/FarmDataContext';

interface MobileNavProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const NAV_LINKS = [
  { href: '/lotes',       label: 'Lotes',     icon: '🐄' },
  { href: '/maquinaria',  label: 'Flota',      icon: '🚜' },
  { href: '/mercado',     label: 'Mercado',    icon: '🌤' },
  { href: '/veterinaria', label: 'Sanidad',    icon: '💉' },
  { href: '/alertas',     label: 'Alertas',    icon: '⚠️' },
  { href: '/movimientos', label: 'Movimientos',icon: '↗' },
  { href: '/erp',         label: 'ERP',        icon: '📊' },
  { href: '/team',        label: 'Equipo',     icon: '👥' },
  { href: '/account',     label: 'Cuenta',     icon: '⚙️' },
];

export default function MobileNav({ onToggleSidebar, sidebarOpen }: MobileNavProps) {
  const { DEMO_FARM, farmSlug } = useFarmData();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Bottom bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-surface2 px-2 py-2"
        style={{ backgroundColor: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(12px)' }}
      >
        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
          style={{ backgroundColor: sidebarOpen ? '#DEFF9A15' : 'transparent', color: sidebarOpen ? '#DEFF9A' : '#6A6A6B' }}
        >
          <span className="text-xl">☰</span>
          <span className="text-[10px]">Mapa</span>
        </button>

        {/* Farm home */}
        <Link
          href={farmSlug ? `/${farmSlug}` : '/'}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted"
        >
          <span className="text-xl">🌿</span>
          <span className="text-[10px] max-w-[60px] truncate">{DEMO_FARM.name}</span>
        </Link>

        {/* Lotes shortcut */}
        <Link href="/lotes" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted">
          <span className="text-xl">🐄</span>
          <span className="text-[10px]">Lotes</span>
        </Link>

        {/* Alerts shortcut */}
        <Link href="/alertas" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted">
          <span className="text-xl">⚠️</span>
          <span className="text-[10px]">Alertas</span>
        </Link>

        {/* More menu */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
          style={{ backgroundColor: menuOpen ? '#DEFF9A15' : 'transparent', color: menuOpen ? '#DEFF9A' : '#6A6A6B' }}
        >
          <span className="text-xl">⋯</span>
          <span className="text-[10px]">Más</span>
        </button>
      </div>

      {/* Slide-up menu overlay */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />

          {/* Sheet */}
          <div
            className="md:hidden fixed bottom-14 left-0 right-0 z-50 rounded-t-2xl border-t border-x border-surface2 p-4"
            style={{ backgroundColor: 'rgba(17,17,18,0.98)', backdropFilter: 'blur(12px)' }}
          >
            <div className="w-10 h-1 rounded-full bg-surface2 mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-surface2 py-4 text-muted hover:text-white hover:border-lime/30 transition-colors"
                  style={{ backgroundColor: '#0A0A0B' }}
                >
                  <span className="text-2xl">{link.icon}</span>
                  <span className="text-xs font-medium">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
