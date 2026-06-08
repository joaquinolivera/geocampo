/**
 * @jest-environment node
 *
 * Tests for /api/chat helper functions (Phase J).
 *
 * We test the pure text-serializer functions from lib/embeddings.ts.
 * The route handler itself is integration-tested via Playwright (e2e/).
 */

import {
  pastureToText,
  herdToText,
  healthRecordToText,
} from '../lib/embeddings';
import type { Pasture, Herd, HealthRecord } from '../lib/data';

const MOCK_PASTURE: Pasture = {
  id:               'p1',
  name:             'Potrero Norte',
  areaHectares:     50,
  carryingCapacity: 60,
  color:            '#DEFF9A',
  geometry:         {
    type: 'Polygon',
    coordinates: [[[-58.4, -34.6], [-58.3, -34.6], [-58.3, -34.7], [-58.4, -34.7], [-58.4, -34.6]]],
  },
  grassType:   'natural',
  waterSupply: 'tajamar',
  notes:       'Revisar alambrado sur',
};

const MOCK_HERD: Herd = {
  id:          'h1',
  pastureId:   'p1',
  name:        'Lote Terneros',
  breed:       'Aberdeen Angus',
  cattleCount: 45,
  species:     'bovino',
  status:      'active',
  entryDate:   new Date('2024-03-01'),
  coordinate:  [-58.35, -34.65],
};

const MOCK_HEALTH: HealthRecord = {
  id:             'hr1',
  herdId:         'h1',
  treatmentType:  'vaccination',
  productName:    'Vacuna aftosa',
  dosage:         '2 ml',
  administeredAt: new Date('2024-05-10'),
  administeredBy: 'Dr. Pérez',
  nextDueDate:    new Date('2024-11-10'),
  notes:          'Revisar reacción',
};

// ─── pastureToText ────────────────────────────────────────────────────────────

describe('pastureToText()', () => {
  it('includes pasture name and area', () => {
    const text = pastureToText(MOCK_PASTURE);
    expect(text).toContain('Potrero Norte');
    expect(text).toContain('50.0 ha');
  });

  it('includes carrying capacity', () => {
    const text = pastureToText(MOCK_PASTURE);
    expect(text).toContain('60');
  });

  it('includes grassType and waterSupply when present', () => {
    const text = pastureToText(MOCK_PASTURE);
    expect(text).toContain('natural');
    expect(text).toContain('tajamar');
  });

  it('shows "sin hacienda" when no herd is passed', () => {
    const text = pastureToText(MOCK_PASTURE);
    expect(text).toContain('sin hacienda');
  });

  it('includes herd info and load percentage when herd is passed', () => {
    const text = pastureToText(MOCK_PASTURE, MOCK_HERD);
    expect(text).toContain('Lote Terneros');
    expect(text).toContain('45 cabezas');
    expect(text).toContain('75%'); // 45/60 = 75%
  });

  it('includes notes when present', () => {
    const text = pastureToText(MOCK_PASTURE);
    expect(text).toContain('Revisar alambrado sur');
  });

  it('omits notes line when notes is empty', () => {
    const p: Pasture = { ...MOCK_PASTURE, notes: '' };
    const text = pastureToText(p);
    expect(text).not.toContain('Notas:');
  });
});

// ─── herdToText ───────────────────────────────────────────────────────────────

describe('herdToText()', () => {
  it('includes herd name and breed', () => {
    const text = herdToText(MOCK_HERD);
    expect(text).toContain('Lote Terneros');
    expect(text).toContain('Aberdeen Angus');
  });

  it('includes cattle count', () => {
    const text = herdToText(MOCK_HERD);
    expect(text).toContain('45 cabezas');
  });

  it('includes status', () => {
    const text = herdToText(MOCK_HERD);
    expect(text).toContain('active');
  });

  it('includes entry date year', () => {
    const text = herdToText(MOCK_HERD);
    expect(text).toContain('2024');
  });
});

// ─── healthRecordToText ───────────────────────────────────────────────────────

describe('healthRecordToText()', () => {
  it('includes herd name', () => {
    const text = healthRecordToText(MOCK_HEALTH, 'Lote Terneros');
    expect(text).toContain('Lote Terneros');
  });

  it('includes treatment type', () => {
    const text = healthRecordToText(MOCK_HEALTH, 'Lote Terneros');
    expect(text).toContain('vaccination');
  });

  it('includes product name', () => {
    const text = healthRecordToText(MOCK_HEALTH, 'Lote Terneros');
    expect(text).toContain('Vacuna aftosa');
  });

  it('includes next due date year', () => {
    const text = healthRecordToText(MOCK_HEALTH, 'Lote Terneros');
    expect(text).toContain('2024');
  });

  it('includes dosage and administered by', () => {
    const text = healthRecordToText(MOCK_HEALTH, 'Lote Terneros');
    expect(text).toContain('2 ml');
    expect(text).toContain('Dr. Pérez');
  });

  it('includes notes when present', () => {
    const text = healthRecordToText(MOCK_HEALTH, 'Lote Terneros');
    expect(text).toContain('Revisar reacción');
  });
});
