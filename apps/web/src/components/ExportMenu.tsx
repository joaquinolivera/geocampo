'use client';

import { useState, useRef, useEffect } from 'react';
import { useFarmData } from '@/lib/FarmDataContext';
import { exportWeightsCsv, exportHealthCsv, exportMovementsCsv } from '@/lib/export-csv';
import { exportFarmPdf } from '@/lib/export-pdf';

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const farmData = useFarmData();
  const { WEIGHTS, HEALTH_RECORDS, MOVEMENTS, HERDS } = farmData;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handlePdf = async () => {
    setPdfLoading(true);
    setOpen(false);
    try {
      await exportFarmPdf(farmData);
    } finally {
      setPdfLoading(false);
    }
  };

  const items = [
    {
      icon: '📄',
      label: pdfLoading ? 'Generando PDF…' : 'Resumen PDF',
      count: null,
      onClick: handlePdf,
      disabled: pdfLoading,
    },
    {
      icon: '⚖️',
      label: 'Pesajes CSV',
      count: WEIGHTS.length,
      onClick: () => { exportWeightsCsv(WEIGHTS, HERDS); setOpen(false); },
      disabled: WEIGHTS.length === 0,
    },
    {
      icon: '💉',
      label: 'Sanidad CSV',
      count: HEALTH_RECORDS.length,
      onClick: () => { exportHealthCsv(HEALTH_RECORDS, HERDS); setOpen(false); },
      disabled: HEALTH_RECORDS.length === 0,
    },
    {
      icon: '🔀',
      label: 'Movimientos CSV',
      count: MOVEMENTS.length,
      onClick: () => { exportMovementsCsv(MOVEMENTS); setOpen(false); },
      disabled: MOVEMENTS.length === 0,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2 py-1 rounded-lg border transition-colors"
        style={{
          borderColor: open ? '#DEFF9A' : '#2A2A2B',
          color: open ? '#DEFF9A' : '#6A6A6B',
          backgroundColor: open ? '#DEFF9A15' : 'transparent',
        }}
        title="Exportar datos"
      >
        ⬇️ CSV
      </button>

      {open && (
        <div
          className="absolute right-0 top-8 z-50 w-52 rounded-xl border border-surface2 shadow-2xl overflow-hidden"
          style={{ backgroundColor: '#111112' }}
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted border-b border-surface2">
            Exportar datos
          </p>
          {items.map(({ icon, label, count, onClick, disabled }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-surface2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{icon}</span>
              <span className="flex-1 text-left text-white">{label}</span>
              {count !== null && <span className="text-muted text-xs">{count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
