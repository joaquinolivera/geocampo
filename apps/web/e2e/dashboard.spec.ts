/**
 * E2E — Dashboard (farm map + panels)
 *
 * Seeds localStorage with a minimal demo farm then loads the dashboard.
 * These tests run in demo mode so no real Supabase connection is needed.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEMO_FARM_ID = 'demo-e2e-farm';

const DEMO_FARM = {
  id:                DEMO_FARM_ID,
  name:              'Estancia E2E',
  ownerName:         'Test User',
  totalAreaHectares: 150,
  location:          [-58.4, -34.6],
  pastures: [
    {
      id:               'pasture-1',
      farmId:           DEMO_FARM_ID,
      name:             'Potrero Norte',
      areaHectares:     80,
      carryingCapacity: 100,
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-58.42, -34.58], [-58.38, -34.58],
          [-58.38, -34.62], [-58.42, -34.62],
          [-58.42, -34.58],
        ]],
      },
      grassType:   'kikuyu',
      waterSupply: 'represa',
      notes:       '',
    },
  ],
  herds: [
    {
      id:          'herd-1',
      farmId:      DEMO_FARM_ID,
      pastureId:   'pasture-1',
      name:        'Lote A',
      breed:       'Aberdeen Angus',
      cattleCount: 60,
      species:     'bovine',
      status:      'active',
      entryDate:   new Date('2024-01-15').toISOString(),
      coordinate:  [-58.40, -34.60],
    },
  ],
  infrastructure:  [],
  movements:       [],
  healthRecords:   [],
  weightRecords:   [],
  employees:       [],
  fuelLogs:        [],
  expenses:        [],
  machinery:       [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function seedDemoFarm(page: Page) {
  await page.addInitScript((farm) => {
    localStorage.setItem('geocampo_farm', JSON.stringify(farm));
    localStorage.setItem('geocampo_demo_slug', 'e2e-farm');
    localStorage.setItem('geocampo_is_custom_farm', 'true');
  }, DEMO_FARM);
}

// ─── Dashboard loads ──────────────────────────────────────────────────────────

test.describe('Dashboard — initial load', () => {
  test('shows farm name in TopBar', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await expect(page.getByText('Estancia E2E')).toBeVisible({ timeout: 15_000 });
  });

  test('shows total cattle count in TopBar', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await expect(page.getByText('60')).toBeVisible({ timeout: 15_000 });
  });

  test('shows pastures count in TopBar', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    // "1 potrero"
    await expect(page.getByText('1')).toBeVisible({ timeout: 15_000 });
  });

  test('renders the map container', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await expect(page.locator('.mapboxgl-canvas, canvas')).toBeVisible({ timeout: 20_000 });
  });

  test('shows sidebar with Potreros tab', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await expect(page.getByText(/potrero/i)).toBeVisible({ timeout: 15_000 });
  });
});

// ─── ERP panel ────────────────────────────────────────────────────────────────

test.describe('ERP Panel', () => {
  test('toggles ERP panel from TopBar', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    const erpBtn = page.getByRole('button', { name: /erp/i });
    await erpBtn.click();
    await expect(page.getByText(/empleados/i)).toBeVisible({ timeout: 5_000 });
  });

  test('closes ERP panel on second click', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    const erpBtn = page.getByRole('button', { name: /erp/i });
    await erpBtn.click();
    await expect(page.getByText(/empleados/i)).toBeVisible();
    await erpBtn.click();
    await expect(page.getByText(/empleados/i)).not.toBeVisible({ timeout: 3_000 });
  });

  test('can switch between ERP sub-tabs', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /erp/i }).click();
    // Click Combustible tab
    await page.getByRole('button', { name: /combustible/i }).click();
    await expect(page.getByText(/litros|combustible/i)).toBeVisible();
    // Click Gastos tab
    await page.getByRole('button', { name: /gastos/i }).click();
    await expect(page.getByText(/gasto|total/i)).toBeVisible();
  });

  test('shows add employee modal when clicking Agregar', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /erp/i }).click();
    await page.getByRole('button', { name: /agregar/i }).first().click();
    await expect(page.getByPlaceholder(/nombre/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ─── AI Chat panel ────────────────────────────────────────────────────────────

test.describe('AI Chat Panel', () => {
  test('toggles chat panel from TopBar', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /ia/i }).click();
    await expect(page.getByText(/asistente ia/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/preguntá/i)).toBeVisible();
  });

  test('shows welcome message on open', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /ia/i }).click();
    await expect(page.getByText(/geocampo/i)).toBeVisible();
  });

  test('shows suggestion chips before first message', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /ia/i }).click();
    await expect(page.getByText(/potrero/i)).toBeVisible({ timeout: 5_000 });
  });

  test('sends a message and receives a streaming response (demo mode)', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /ia/i }).click();
    const input = page.getByPlaceholder(/preguntá/i);
    await input.fill('¿Cuántas hectáreas tengo?');
    await input.press('Enter');

    // Wait for the assistant's streaming response to appear
    await expect(page.getByText(/supabase|demo|configurá/i)).toBeVisible({ timeout: 15_000 });
  });

  test('closes chat panel on close button click', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /ia/i }).click();
    await expect(page.getByText(/asistente ia/i)).toBeVisible();
    await page.getByText('×').click();
    await expect(page.getByText(/asistente ia/i)).not.toBeVisible({ timeout: 3_000 });
  });
});

// ─── Language toggle ──────────────────────────────────────────────────────────

test.describe('Language toggle', () => {
  test('switches between Spanish and English', async ({ page }) => {
    await seedDemoFarm(page);
    await page.goto('/e2e-farm');
    await page.waitForLoadState('networkidle');

    // Find the language toggle (ES / EN)
    const langToggle = page.getByRole('button', { name: /es|en/i });
    const before = await langToggle.textContent();
    await langToggle.click();
    const after = await langToggle.textContent();
    expect(before).not.toBe(after);
  });
});
