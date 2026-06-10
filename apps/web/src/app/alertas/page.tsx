'use client';

/**
 * /alertas — Unified alerts center
 *
 * Two sections:
 *  1. Stocking load alerts (pastures over carrying capacity)
 *  2. Veterinary due dates (overdue + urgent)
 *
 * All data comes from FarmDataContext — no extra fetches needed.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { useFarmData } from '@/lib/FarmDataContext';
import {
  buildLoadAlert,
  getDueStatus,
  daysUntilDue,
  treatmentTypeLabel,
  dueStatusColor,
  loadStatusColor,
  loadStatusLabel,
} from '@/lib/alerts';

export default function AlertasPage() {
  const { PASTURES, HERDS, HEALTH_RECORDS, farmSlug } = useFarmData();

  // ── Load alerts ────────────────────────────────────────────────
  const loadAlerts = useMemo(() => {
    return PASTURES
      .map((p) => {
        const herd = HERDS.find((h) => h.pastureId === p.id);
        return buildLoadAlert(p, herd);
      })
      .filter((a) => a !== null && a.status !== 'ok')
      .sort((a, b) => {
        if (!a || !b) return 0;
        const ord = { critical: 0, warning: 1, ok: 2 };
        return ord[a.status] - ord[b.status];
      });
  }, [PASTURES, HERDS]);

  // ── Health due alerts ─────────────────────────────────────────
  const healthAlerts = useMemo(() => {
    return HEALTH_RECORDS
      .filter((r) => r.nextDueDate)
      .map((r) => {
        const status = getDueStatus(r.nextDueDate!);
        const days   = daysUntilDue(r.nextDueDate!);
        const herd   = HERDS.find((h) => h.id === r.herdId);
        return { record: r, status, days, herdName: herd?.name ?? 'Rodeo desconocido' };
      })
      .filter((x) => x.status === 'overdue' || x.status === 'urgent')
      .sort((a, b) => a.days - b.days); // most overdue first
  }, [HEALTH_RECORDS, HERDS]);

  const totalAlerts = loadAlerts.length + healthAlerts.length;
  const backHref    = farmSlug ? `/${farmSlug}` : '/';

  return (
    <div className="min-h-screen bg-charcoal text-white">
      {/* Header */}
      <div className="border-b border-surface2 px-6 py-4 flex items-center gap-4">
        <Link href={backHref} className="text-muted hover:text-white transition-colors text-sm">← Campo</Link>
        <h1 className="text-lg font-bold">⚠️ Alertas</h1>
        {totalAlerts > 0 && (
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-critical/20 text-critical border border-critical/30">
            {totalAlerts} activa{totalAlerts !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">

        {totalAlerts === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="text-5xl">✅</span>
            <p className="text-white font-semibold text-lg">Todo en orden</p>
            <p className="text-muted text-sm">No hay alertas de carga ni sanitarias activas.</p>
          </div>
        )}

        {/* ── Stocking load alerts ─────────────────────────────── */}
        {loadAlerts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              🐄 Carga animal
              <span className="ml-2 text-xs font-normal normal-case text-muted/60">
                ({loadAlerts.length} potrero{loadAlerts.length !== 1 ? 's' : ''} con problema)
              </span>
            </h2>
            <div className="space-y-3">
              {loadAlerts.map((alert) => {
                if (!alert) return null;
                const color = loadStatusColor(alert.status);
                const herd  = HERDS.find((h) => h.pastureId === alert.pastureId);
                return (
                  <div
                    key={alert.pastureId}
                    className="rounded-2xl border px-5 py-4 flex items-center gap-5"
                    style={{ borderColor: color + '40', backgroundColor: color + '08' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: color + '20' }}
                    >
                      {alert.status === 'critical' ? '🔴' : '🟡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{alert.pastureName}</p>
                      <p className="text-sm mt-0.5" style={{ color }}>
                        {loadStatusLabel(alert.status)} — {alert.capacityPercent}% de capacidad
                        <span className="text-muted ml-2 text-xs">
                          ({alert.cattleCount} / {alert.carryingCapacity} cabezas)
                        </span>
                      </p>
                      {herd && (
                        <p className="text-muted text-xs mt-0.5">Rodeo: {herd.name}</p>
                      )}
                    </div>
                    {farmSlug && (
                      <Link
                        href={`/${farmSlug}/${alert.pastureId}`}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-surface2 text-muted hover:text-white hover:border-white/30 transition-colors shrink-0"
                      >
                        Ver potrero →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Health due alerts ─────────────────────────────────── */}
        {healthAlerts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              💉 Sanidad vencida o urgente
              <span className="ml-2 text-xs font-normal normal-case text-muted/60">
                ({healthAlerts.length} tratamiento{healthAlerts.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <div className="space-y-3">
              {healthAlerts.map(({ record, status, days, herdName }) => {
                const color = dueStatusColor(status);
                const dueLabel =
                  days < 0
                    ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`
                    : days === 0
                    ? 'Vence hoy'
                    : `Vence en ${days} día${days !== 1 ? 's' : ''}`;

                return (
                  <div
                    key={record.id}
                    className="rounded-2xl border px-5 py-4 flex items-center gap-5"
                    style={{ borderColor: color + '40', backgroundColor: color + '08' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ backgroundColor: color + '20' }}
                    >
                      {status === 'overdue' ? '🔴' : '🟡'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{treatmentTypeLabel(record.treatmentType)}</p>
                      <p className="text-sm mt-0.5" style={{ color }}>{dueLabel}</p>
                      <p className="text-muted text-xs mt-0.5">
                        {record.productName && <span>{record.productName} · </span>}
                        Rodeo: {herdName}
                      </p>
                    </div>
                    <Link
                      href="/veterinaria"
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-surface2 text-muted hover:text-white hover:border-white/30 transition-colors shrink-0"
                    >
                      Ver calendario →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── All-clear pastures (info) ─────────────────────────── */}
        {loadAlerts.length === 0 && healthAlerts.length === 0 && totalAlerts === 0 && null}

      </div>
    </div>
  );
}
