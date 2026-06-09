'use client';

/**
 * /erp — Unified ERP Dashboard
 *
 * Pulls from all cost sources:
 *   - expenses (general ledger)
 *   - gastos_lote (lote costs)
 *   - fuel_logs (machinery fuel)
 *   - machinery_maintenance (maintenance costs)
 *
 * Shows:
 *   - P&L summary (income vs cost, net result)
 *   - Cost breakdown by category (last 12 months)
 *   - Cost per head
 *   - Cash flow (monthly income vs expense bars)
 *   - Quick nav to sub-modules
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';
import RequiresPlan from '@/components/RequiresPlan';

interface CostRow { month: string; total: number }
interface CategoryRow { category: string; total: number }
interface SaleRow { month: string; total: number }

interface ERPSummary {
  totalIncome: number;
  totalCost:   number;
  netResult:   number;
  totalCattle: number;
  costPerHead: number | null;
  monthlyCosts: CostRow[];
  monthlySales: SaleRow[];
  costByCategory: CategoryRow[];
  openLotes: number;
  closedLotes: number;
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtARS(n: number) {
  return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function ERPDashboardPage() {
  const { farmId, HERDS } = useFarmData();
  const [summary, setSummary] = useState<ERPSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const totalCattle = HERDS.reduce((s, h) => s + h.cattleCount, 0);

  useEffect(() => {
    if (!farmId) return;
    const client = getBrowserClient();
    if (!client) { setLoading(false); return; }

    void (async () => {
      // 12-month window
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      const sinceStr = since.toISOString().slice(0, 10);

      // Fetch in parallel
      const [expRes, gastoRes, fuelRes, maintRes, lotesRes, salesRes] = await Promise.all([
        client.from('expenses').select('date,amount,category').eq('farm_id', farmId).gte('date', sinceStr),
        client.from('gastos_lote').select('fecha,monto').eq('farm_id', farmId).gte('fecha', sinceStr),
        client.from('fuel_logs').select('fecha,costo_total').eq('farm_id', farmId).gte('fecha', sinceStr),
        client.from('machinery_maintenance').select('date,cost').eq('farm_id', farmId).gte('date', sinceStr),
        client.from('lotes_comerciales').select('estado').eq('farm_id', farmId),
        client.from('sales').select('date,total_price').eq('farm_id', farmId).gte('date', sinceStr),
      ]);

      // Build monthly cost map
      const monthlyCostMap: Record<string, number> = {};
      const catMap: Record<string, number> = {};

      const addToMonth = (dateStr: string | null, amount: number | null, cat = 'other') => {
        if (!dateStr || !amount) return;
        const m = dateStr.slice(0, 7);
        monthlyCostMap[m] = (monthlyCostMap[m] ?? 0) + Number(amount);
        catMap[cat] = (catMap[cat] ?? 0) + Number(amount);
      };

      for (const r of (expRes.data ?? [])) {
        addToMonth(r.date, r.amount, r.category);
      }
      for (const r of (gastoRes.data ?? [])) {
        addToMonth(r.fecha, r.monto, 'lote');
      }
      for (const r of (fuelRes.data ?? [])) {
        addToMonth(r.fecha, r.costo_total, 'combustible');
      }
      for (const r of (maintRes.data ?? [])) {
        addToMonth(r.date, r.cost, 'maquinaria');
      }

      // Build monthly sales map
      const monthlySalesMap: Record<string, number> = {};
      for (const r of (salesRes.data ?? [])) {
        if (!r.date || !r.total_price) continue;
        const m = (r.date as string).slice(0, 7);
        monthlySalesMap[m] = (monthlySalesMap[m] ?? 0) + Number(r.total_price);
      }

      // Generate last 12 months ordered
      const months: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        months.push(getMonthKey(d));
      }

      const monthlyCosts = months.map((m) => ({ month: m, total: monthlyCostMap[m] ?? 0 }));
      const monthlySales = months.map((m) => ({ month: m, total: monthlySalesMap[m] ?? 0 }));

      const totalCost   = Object.values(monthlyCostMap).reduce((s, v) => s + v, 0);
      const totalIncome = Object.values(monthlySalesMap).reduce((s, v) => s + v, 0);

      const costByCategory = Object.entries(catMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      const openLotes   = (lotesRes.data ?? []).filter((l: { estado: string }) => l.estado === 'abierto').length;
      const closedLotes = (lotesRes.data ?? []).filter((l: { estado: string }) => l.estado === 'cerrado').length;

      setSummary({
        totalIncome,
        totalCost,
        netResult: totalIncome - totalCost,
        totalCattle,
        costPerHead: totalCattle > 0 ? totalCost / totalCattle : null,
        monthlyCosts,
        monthlySales,
        costByCategory,
        openLotes,
        closedLotes,
      });
      setLoading(false);
    })();
  }, [farmId, totalCattle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RequiresPlan feature="canUseERP">
      <div className="min-h-screen bg-charcoal text-white">

        {/* Header */}
        <div className="border-b border-surface2 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted hover:text-white transition-colors text-sm">← Campo</Link>
            <h1 className="text-lg font-bold">Dashboard ERP</h1>
          </div>
          <p className="text-muted text-xs">Últimos 12 meses</p>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

          {/* KPI row */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPICard
                label="Ingresos"
                value={fmtARS(summary.totalIncome)}
                sub="ventas 12 meses"
                color="text-lime"
              />
              <KPICard
                label="Costos totales"
                value={fmtARS(summary.totalCost)}
                sub="todos los rubros"
                color="text-red-400"
              />
              <KPICard
                label="Resultado neto"
                value={fmtARS(summary.netResult)}
                sub={summary.netResult >= 0 ? 'ganancia' : 'pérdida'}
                color={summary.netResult >= 0 ? 'text-lime' : 'text-red-400'}
              />
              <KPICard
                label="Costo por cabeza"
                value={summary.costPerHead != null ? fmtARS(summary.costPerHead) : '—'}
                sub={`sobre ${summary.totalCattle} cabezas`}
              />
            </div>
          )}

          {/* Cash flow chart */}
          {summary && summary.monthlyCosts.some((m) => m.total > 0) && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Flujo mensual</h2>
              <CashFlowBars
                costs={summary.monthlyCosts}
                sales={summary.monthlySales}
              />
            </section>
          )}

          {/* Cost breakdown */}
          {summary && summary.costByCategory.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Costos por rubro</h2>
              <div className="rounded-2xl border border-surface2 overflow-hidden" style={{ backgroundColor: '#111112' }}>
                {summary.costByCategory.map((c, i) => (
                  <div
                    key={c.category}
                    className="flex items-center justify-between px-5 py-3 border-b border-surface2 last:border-0"
                  >
                    <span className="text-white text-sm capitalize">{CATEGORY_LABEL[c.category] ?? c.category}</span>
                    <div className="flex items-center gap-4">
                      <div
                        className="h-1.5 rounded-full bg-lime/60"
                        style={{ width: `${Math.max(4, (c.total / (summary.totalCost || 1)) * 120)}px` }}
                      />
                      <span className="text-white text-sm font-semibold w-28 text-right">{fmtARS(c.total)}</span>
                      <span className="text-muted text-xs w-10 text-right">
                        {summary.totalCost > 0 ? `${Math.round((c.total / summary.totalCost) * 100)}%` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lotes summary + quick links */}
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Módulos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ModuleCard
                icon="🐄"
                title="Lotes Comerciales"
                sub={summary ? `${summary.openLotes} abiertos · ${summary.closedLotes} cerrados` : ''}
                href="/lotes"
              />
              <ModuleCard
                icon="🚜"
                title="Maquinaria"
                sub="Combustible · Mantenimiento · Depreciación"
                href="/maquinaria"
              />
              <ModuleCard
                icon="💸"
                title="Gastos ERP"
                sub="Empleados · Gastos generales · Combustible"
                href="/"
                action="ERP"
              />
            </div>
          </section>

        </div>
      </div>
    </RequiresPlan>
  );
}

// ── Sub-components ────────────────────────────────────────────

function KPICard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-surface2 px-5 py-4" style={{ backgroundColor: '#111112' }}>
      <p className="text-muted text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`font-black text-xl leading-none mb-1 ${color ?? 'text-white'}`}>{value}</p>
      <p className="text-muted text-xs">{sub}</p>
    </div>
  );
}

function CashFlowBars({ costs, sales }: { costs: CostRow[]; sales: SaleRow[] }) {
  const maxVal = Math.max(
    ...costs.map((c) => c.total),
    ...sales.map((s) => s.total),
    1,
  );

  return (
    <div className="rounded-2xl border border-surface2 p-5 overflow-x-auto" style={{ backgroundColor: '#111112' }}>
      <div className="flex items-end gap-2 min-w-0" style={{ minWidth: '500px', height: '120px' }}>
        {costs.map((c, i) => {
          const sale    = sales[i]?.total ?? 0;
          const costH   = Math.round((c.total / maxVal) * 100);
          const saleH   = Math.round((sale  / maxVal) * 100);
          const [yr, mo] = c.month.split('-');
          const label    = MONTHS_ES[parseInt(mo, 10) - 1] ?? mo;

          return (
            <div key={c.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-0.5 w-full" style={{ height: '90px' }}>
                {saleH > 0 && (
                  <div
                    className="flex-1 rounded-t opacity-80"
                    style={{ height: `${saleH}%`, backgroundColor: '#DEFF9A' }}
                    title={`Ingresos: ${fmtARS(sale)}`}
                  />
                )}
                {costH > 0 && (
                  <div
                    className="flex-1 rounded-t opacity-80"
                    style={{ height: `${costH}%`, backgroundColor: '#FF6B6B' }}
                    title={`Costos: ${fmtARS(c.total)}`}
                  />
                )}
                {costH === 0 && saleH === 0 && (
                  <div className="flex-1 rounded-t" style={{ height: '4px', backgroundColor: '#2A2A2B' }} />
                )}
              </div>
              <span className="text-muted text-[9px]">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#DEFF9A' }} />
          <span className="text-muted text-xs">Ingresos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF6B6B' }} />
          <span className="text-muted text-xs">Costos</span>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ icon, title, sub, href, action }: { icon: string; title: string; sub: string; href: string; action?: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-surface2 px-5 py-5 hover:border-lime/30 transition-colors flex items-start gap-4"
      style={{ backgroundColor: '#111112' }}
    >
      <span className="text-3xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-muted text-xs mt-0.5 leading-relaxed">{sub}</p>
      </div>
    </Link>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  veterinary:     'Veterinaria',
  feed:           'Alimentación',
  fuel:           'Combustible',
  labor:          'Mano de obra',
  infrastructure: 'Infraestructura',
  machinery:      'Maquinaria',
  transport:      'Transporte',
  taxes:          'Impuestos',
  other:          'Otros',
  lote:           'Lotes comerciales',
  combustible:    'Combustible (flota)',
};
