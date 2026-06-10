'use client';

/**
 * /veterinaria — Veterinary calendar
 *
 * Month-view grid showing all health record nextDueDates.
 * Color coding:
 *   overdue  (past)   → red
 *   urgent   (≤7d)    → orange
 *   upcoming (≤30d)   → lime
 *   ok       (>30d)   → muted dot
 *
 * Clicking a day shows a popover with the records due on that day.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useFarmData } from '@/lib/FarmDataContext';
import {
  getDueStatus,
  dueStatusColor,
  treatmentTypeLabel,
} from '@/lib/alerts';

const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

interface DayRecord {
  id: string;
  herdName: string;
  treatmentType: string;
  productName: string | null;
  status: ReturnType<typeof getDueStatus>;
}

export default function VeterinariaPage() {
  const { HEALTH_RECORDS, HERDS, farmSlug } = useFarmData();

  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // 'YYYY-MM-DD'

  // Build map: 'YYYY-MM-DD' → DayRecord[]
  const recordsByDay = useMemo(() => {
    const map = new Map<string, DayRecord[]>();
    for (const r of HEALTH_RECORDS) {
      if (!r.nextDueDate) continue;
      const d = r.nextDueDate instanceof Date ? r.nextDueDate : new Date(r.nextDueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const herd = HERDS.find((h) => h.id === r.herdId);
      const entry: DayRecord = {
        id:            r.id,
        herdName:      herd?.name ?? 'Rodeo',
        treatmentType: r.treatmentType,
        productName:   r.productName ?? null,
        status:        getDueStatus(d),
      };
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [HEALTH_RECORDS, HERDS]);

  // Summary counts
  const totalOverdue  = useMemo(() => [...recordsByDay.values()].flat().filter((r) => r.status === 'overdue').length,  [recordsByDay]);
  const totalUrgent   = useMemo(() => [...recordsByDay.values()].flat().filter((r) => r.status === 'urgent').length,   [recordsByDay]);
  const totalUpcoming = useMemo(() => [...recordsByDay.values()].flat().filter((r) => r.status === 'upcoming').length, [recordsByDay]);

  // Calendar grid for the current month
  const { firstDOW, daysInMonth, daysInPrevMonth } = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last  = new Date(viewYear, viewMonth + 1, 0);
    return {
      firstDOW:       first.getDay(),          // 0=Sun
      daysInMonth:    last.getDate(),
      daysInPrevMonth: new Date(viewYear, viewMonth, 0).getDate(),
    };
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function dayKey(day: number): string {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function dotColor(records: DayRecord[]): string {
    if (records.some((r) => r.status === 'overdue'))  return '#FF4444';
    if (records.some((r) => r.status === 'urgent'))   return '#FFB444';
    if (records.some((r) => r.status === 'upcoming')) return '#DEFF9A';
    return '#6A6A6B';
  }

  const backHref = farmSlug ? `/${farmSlug}` : '/';
  const selectedRecords = selectedDay ? (recordsByDay.get(selectedDay) ?? []) : [];

  // Build grid cells: leading empty + current month days + trailing empty
  const leadingEmpty = firstDOW;
  const totalCells   = Math.ceil((leadingEmpty + daysInMonth) / 7) * 7;
  const trailingEmpty = totalCells - leadingEmpty - daysInMonth;

  return (
    <div className="min-h-screen bg-charcoal text-white">
      {/* Header */}
      <div className="border-b border-surface2 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="text-muted hover:text-white transition-colors text-sm">← Campo</Link>
          <h1 className="text-lg font-bold">💉 Calendario sanitario</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {totalOverdue  > 0 && <Chip color="#FF4444" label={`${totalOverdue} vencidos`} />}
          {totalUrgent   > 0 && <Chip color="#FFB444" label={`${totalUrgent} urgentes`} />}
          {totalUpcoming > 0 && <Chip color="#DEFF9A" label={`${totalUpcoming} próximos`} />}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="rounded-xl px-3 py-2 text-muted border border-surface2 hover:text-white hover:border-white/20 transition-colors text-sm"
          >
            ← Anterior
          </button>
          <h2 className="text-white font-bold text-lg">
            {MONTH_NAMES_ES[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={nextMonth}
            className="rounded-xl px-3 py-2 text-muted border border-surface2 hover:text-white hover:border-white/20 transition-colors text-sm"
          >
            Siguiente →
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES_ES.map((d) => (
            <div key={d} className="text-center text-muted text-xs font-semibold py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Leading filler */}
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`pre-${i}`} className="h-12 rounded-xl" style={{ backgroundColor: '#0A0A0B' }}>
              <span className="text-muted/20 text-xs p-2 block">
                {daysInPrevMonth - leadingEmpty + i + 1}
              </span>
            </div>
          ))}

          {/* Current month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day     = i + 1;
            const key     = dayKey(day);
            const records = recordsByDay.get(key) ?? [];
            const isToday =
              day === today.getDate() &&
              viewMonth === today.getMonth() &&
              viewYear  === today.getFullYear();
            const isSelected = selectedDay === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className="h-12 rounded-xl flex flex-col items-center justify-start pt-1.5 gap-0.5 transition-all"
                style={{
                  backgroundColor: isSelected ? '#DEFF9A15' : isToday ? '#ffffff08' : '#111112',
                  border: `1px solid ${isSelected ? '#DEFF9A40' : isToday ? '#DEFF9A20' : '#1A1A1B'}`,
                  outline: 'none',
                }}
              >
                <span
                  className="text-xs font-medium leading-none"
                  style={{ color: isToday ? '#DEFF9A' : '#FFFFFF' }}
                >
                  {day}
                </span>
                {records.length > 0 && (
                  <div className="flex gap-0.5">
                    {records.slice(0, 3).map((r, ri) => (
                      <span
                        key={ri}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: dotColor([r]) }}
                      />
                    ))}
                    {records.length > 3 && (
                      <span className="text-muted text-[8px]">+{records.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}

          {/* Trailing filler */}
          {Array.from({ length: trailingEmpty }).map((_, i) => (
            <div key={`post-${i}`} className="h-12 rounded-xl" style={{ backgroundColor: '#0A0A0B' }}>
              <span className="text-muted/20 text-xs p-2 block">{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="mt-6 rounded-2xl border border-surface2 overflow-hidden" style={{ backgroundColor: '#111112' }}>
            <div className="px-5 py-3 border-b border-surface2 flex items-center justify-between">
              <p className="text-white font-semibold text-sm">
                {(() => {
                  const [y, m, d] = selectedDay.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  });
                })()}
              </p>
              <button onClick={() => setSelectedDay(null)} className="text-muted hover:text-white text-xs">✕</button>
            </div>
            {selectedRecords.length === 0 ? (
              <p className="text-muted text-sm text-center py-6">Sin tratamientos este día.</p>
            ) : (
              <div className="divide-y divide-surface2">
                {selectedRecords.map((r) => {
                  const color = dueStatusColor(r.status);
                  const statusLabel =
                    r.status === 'overdue'  ? 'Vencido'  :
                    r.status === 'urgent'   ? 'Urgente'  :
                    r.status === 'upcoming' ? 'Próximo'  : 'OK';
                  return (
                    <div key={r.id} className="px-5 py-4 flex items-center gap-4">
                      <div
                        className="w-2 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">
                          {treatmentTypeLabel(r.treatmentType as 'vaccination' | 'deworming' | 'treatment' | 'checkup')}
                          {r.productName && <span className="text-muted ml-2 font-normal">· {r.productName}</span>}
                        </p>
                        <p className="text-muted text-xs mt-0.5">{r.herdName}</p>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-1 rounded-lg shrink-0"
                        style={{ backgroundColor: color + '22', color }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full font-semibold"
      style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}
