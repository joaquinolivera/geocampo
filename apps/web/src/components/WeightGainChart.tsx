'use client';

/**
 * @fileoverview WeightGainChart — average weight per weighing date for a herd.
 *
 * Shows a line chart of kg promedio over time.
 * Displayed inside ParcelDetailPanel when the herd has ≥2 weight records.
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { WeightRecord } from '@/lib/data';

interface Props {
  records: WeightRecord[];  // filtered to a single herd, any order
}

const fmt = new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: 'short' });

export default function WeightGainChart({ records }: Props) {
  if (records.length < 2) return null;

  // Sort ascending by date, keep last 12 entries max
  const sorted = [...records]
    .sort((a, b) => a.weighedAt.getTime() - b.weighedAt.getTime())
    .slice(-12);

  const data = sorted.map((r) => ({
    date: fmt.format(r.weighedAt),
    kg:   r.averageWeightKg,
  }));

  // Simple ADG between first and last record
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];
  const daysDiff = Math.max(
    1,
    (last.weighedAt.getTime() - first.weighedAt.getTime()) / 86_400_000,
  );
  const adg = ((last.averageWeightKg - first.averageWeightKg) / daysDiff).toFixed(2);
  const adgPositive = parseFloat(adg) >= 0;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs uppercase tracking-wider font-medium">
          Evolución de peso
        </p>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: adgPositive ? '#DEFF9A20' : '#FF444420',
            color: adgPositive ? '#DEFF9A' : '#FF6B6B',
          }}
        >
          {adgPositive ? '+' : ''}{adg} kg/día (GPD)
        </span>
      </div>

      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A1B', border: '1px solid #2A2A2B', borderRadius: 8 }}
              labelStyle={{ color: '#AAAAAB', fontSize: 11 }}
              itemStyle={{ color: '#DEFF9A', fontSize: 12 }}
              formatter={(v) => [`${Number(v).toFixed(1)} kg`, 'Peso prom.']}
            />
            <ReferenceLine y={first.averageWeightKg} stroke="#2A2A2B" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="kg"
              stroke="#DEFF9A"
              strokeWidth={2}
              dot={{ fill: '#DEFF9A', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
