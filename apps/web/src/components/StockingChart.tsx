'use client';

/**
 * @fileoverview StockingChart — cattle head count per herd over time.
 *
 * Uses weight_records.cattle_count as the data source (each pesaje records
 * the head count on that date). Shows up to 3 herds as stacked area lines.
 *
 * Displayed at the bottom of the Sidebar "Potreros" tab when there are
 * at least 3 weight records across herds.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { WeightRecord, Herd } from '@/lib/data';

interface Props {
  herds: Herd[];
  weights: WeightRecord[];
}

const HERD_COLORS = ['#DEFF9A', '#9ADEFF', '#FFB444', '#FF9ADE'];

const fmtDate = new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: 'short' });

export default function StockingChart({ herds, weights }: Props) {
  // Only show herds that have at least 1 weight record
  const activeHerds = herds.filter((h) => weights.some((w) => w.herdId === h.id)).slice(0, 4);
  if (weights.length < 3 || activeHerds.length === 0) return null;

  // Collect all unique dates sorted ascending
  const dateSet = new Set(
    weights.map((w) => fmtDate.format(new Date(w.weighedAt)))
  );
  const dates = [...dateSet].sort();

  // For each date, get the latest cattle_count per herd on or before that date
  const data = dates.map((dateLabel) => {
    const row: Record<string, string | number> = { date: dateLabel };
    for (const herd of activeHerds) {
      const herdWeights = weights
        .filter((w) => {
          const d = fmtDate.format(new Date(w.weighedAt));
          return w.herdId === herd.id && d === dateLabel;
        });
      if (herdWeights.length > 0) {
        row[herd.name] = herdWeights[herdWeights.length - 1].cattleCount;
      }
    }
    return row;
  });

  // Only keep rows that have at least one herd value
  const chartData = data.filter((row) =>
    activeHerds.some((h) => row[h.name] !== undefined)
  );
  if (chartData.length < 2) return null;

  return (
    <div className="mx-4 mb-4 mt-2 rounded-xl border border-surface2 p-3">
      <p className="text-muted text-xs uppercase tracking-wider font-medium mb-3">
        Hacienda en el tiempo
      </p>
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              {activeHerds.map((h, i) => (
                <linearGradient key={h.id} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={HERD_COLORS[i]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={HERD_COLORS[i]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2B" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6A6A6B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6A6A6B', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A1B', border: '1px solid #2A2A2B', borderRadius: 8 }}
              labelStyle={{ color: '#AAAAAB', fontSize: 11 }}
              itemStyle={{ fontSize: 12 }}
              formatter={(v: number, name: string) => [`${v} cab.`, name]}
            />
            {activeHerds.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: 10, color: '#6A6A6B', paddingTop: 4 }}
              />
            )}
            {activeHerds.map((h, i) => (
              <Area
                key={h.id}
                type="monotone"
                dataKey={h.name}
                stroke={HERD_COLORS[i]}
                fill={`url(#grad-${i})`}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
