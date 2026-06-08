/**
 * @fileoverview Tests for stocking rate & ADG alert utilities
 */

import {
  calculateStockingRate,
  calculateCapacityPercent,
  getLoadStatus,
  buildLoadAlert,
  getActiveAlerts,
  calculateADG,
  loadStatusLabel,
  loadStatusColor,
} from '../src/utils/alerts';
import type { Weight } from '../src/types';

// ─── Stocking rate ──────────────────────────────────────────────────────────

describe('calculateStockingRate', () => {
  it('returns heads per hectare', () => {
    expect(calculateStockingRate(50, 25)).toBe(2);
  });

  it('returns 0 when area is 0', () => {
    expect(calculateStockingRate(50, 0)).toBe(0);
  });

  it('returns 0 when area is negative', () => {
    expect(calculateStockingRate(50, -10)).toBe(0);
  });
});

// ─── Capacity percent ───────────────────────────────────────────────────────

describe('calculateCapacityPercent', () => {
  it('returns 100 when at capacity', () => {
    expect(calculateCapacityPercent(50, 50)).toBe(100);
  });

  it('returns 80 when at 80% capacity', () => {
    expect(calculateCapacityPercent(40, 50)).toBe(80);
  });

  it('returns >100 when over capacity', () => {
    expect(calculateCapacityPercent(60, 50)).toBe(120);
  });

  it('returns 0 when carryingCapacity is 0', () => {
    expect(calculateCapacityPercent(50, 0)).toBe(0);
  });
});

// ─── Load status ────────────────────────────────────────────────────────────

describe('getLoadStatus', () => {
  it('returns ok below 80%', () => {
    expect(getLoadStatus(79)).toBe('ok');
    expect(getLoadStatus(0)).toBe('ok');
    expect(getLoadStatus(50)).toBe('ok');
  });

  it('returns warning at 80-99%', () => {
    expect(getLoadStatus(80)).toBe('warning');
    expect(getLoadStatus(90)).toBe('warning');
    expect(getLoadStatus(99)).toBe('warning');
  });

  it('returns critical at 100% or above', () => {
    expect(getLoadStatus(100)).toBe('critical');
    expect(getLoadStatus(120)).toBe('critical');
  });
});

// ─── buildLoadAlert ─────────────────────────────────────────────────────────

describe('buildLoadAlert', () => {
  it('returns a LoadAlert with correct fields', () => {
    const alert = buildLoadAlert('p-1', 'Potrero Norte', 45, 50);
    expect(alert).not.toBeNull();
    expect(alert!.pastureId).toBe('p-1');
    expect(alert!.pastureName).toBe('Potrero Norte');
    expect(alert!.capacityPercent).toBe(90);
    expect(alert!.status).toBe('warning');
  });

  it('returns critical alert when over capacity', () => {
    const alert = buildLoadAlert('p-2', 'Potrero Sur', 28, 25);
    expect(alert!.status).toBe('critical');
    expect(alert!.capacityPercent).toBe(112);
  });

  it('returns null when no carryingCapacity defined', () => {
    expect(buildLoadAlert('p-1', 'Norte', 45, undefined as any)).toBeNull();
    expect(buildLoadAlert('p-1', 'Norte', 45, 0)).toBeNull();
  });
});

// ─── getActiveAlerts ────────────────────────────────────────────────────────

describe('getActiveAlerts', () => {
  it('filters out ok alerts', () => {
    const alerts = [
      buildLoadAlert('p-1', 'Norte', 40, 50)!, // ok (80%)
      buildLoadAlert('p-2', 'Sur', 45, 50)!,   // warning (90%)
      buildLoadAlert('p-3', 'Este', 55, 50)!,  // critical (110%)
    ];
    const active = getActiveAlerts(alerts);
    expect(active).toHaveLength(2);
    expect(active.map((a) => a.status)).toEqual(['warning', 'critical']);
  });

  it('returns empty array when no active alerts', () => {
    const alerts = [buildLoadAlert('p-1', 'Norte', 20, 50)!]; // ok (40%)
    expect(getActiveAlerts(alerts)).toHaveLength(0);
  });
});

// ─── calculateADG ───────────────────────────────────────────────────────────

function makeWeight(days: number, avgKg: number, count = 30): Weight {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return {
    id: `w-${days}`,
    herdId: 'herd-1',
    weightKg: avgKg * count,
    cattleCount: count,
    averageWeightKg: avgKg,
    weighedAt: date,
    createdAt: date,
  };
}

describe('calculateADG', () => {
  it('returns null when fewer than 2 records', () => {
    expect(calculateADG([])).toBeNull();
    expect(calculateADG([makeWeight(30, 400)])).toBeNull();
  });

  it('calculates ADG correctly', () => {
    // 30 days ago: 400 kg avg, today: 430 kg avg → 1 kg/day
    const weights = [makeWeight(30, 400), makeWeight(0, 430)];
    const adg = calculateADG(weights);
    expect(adg).toBe(1);
  });

  it('handles records passed in reverse order', () => {
    const weights = [makeWeight(0, 430), makeWeight(30, 400)];
    expect(calculateADG(weights)).toBe(1);
  });

  it('returns correct ADG with multiple records (uses oldest and newest)', () => {
    // 60 days: 380kg, 30 days: 410kg, 0 days: 440kg → (440-380)/60 = 1.0
    const weights = [makeWeight(60, 380), makeWeight(30, 410), makeWeight(0, 440)];
    expect(calculateADG(weights)).toBe(1);
  });

  it('returns null when timestamps are identical', () => {
    const w = makeWeight(0, 400);
    const w2 = { ...w, id: 'w2', averageWeightKg: 420 };
    expect(calculateADG([w, w2])).toBeNull();
  });
});

// ─── Label & color helpers ──────────────────────────────────────────────────

describe('loadStatusLabel', () => {
  it('returns Spanish labels', () => {
    expect(loadStatusLabel('ok')).toBe('Carga normal');
    expect(loadStatusLabel('warning')).toBe('Cerca del límite');
    expect(loadStatusLabel('critical')).toBe('Sobrecarga crítica');
  });
});

describe('loadStatusColor', () => {
  it('returns correct hex colors', () => {
    expect(loadStatusColor('ok')).toBe('#DEFF9A');
    expect(loadStatusColor('warning')).toBe('#FFB444');
    expect(loadStatusColor('critical')).toBe('#FF4444');
  });
});
