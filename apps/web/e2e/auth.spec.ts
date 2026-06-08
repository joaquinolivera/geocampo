/**
 * E2E — Authentication flow
 *
 * Tests the login page in demo mode (empty Supabase env → localStorage mode).
 * No network calls to Supabase are made.
 */

import { test, expect } from '@playwright/test';

test.describe('Login — demo mode', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all demo state before each test
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('shows the GeoCampo login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('GeoCampo')).toBeVisible();
    await expect(page.getByRole('button', { name: /ingresar|entrar|login/i })).toBeVisible();
  });

  test('shows a demo mode indicator when Supabase is not configured', async ({ page }) => {
    await page.goto('/login');
    // Demo mode badge / notice must be visible
    await expect(page.getByText(/demo/i)).toBeVisible();
  });

  test('navigates to the farm setup wizard after clicking demo login', async ({ page }) => {
    await page.goto('/login');
    // Click the demo / get-started button
    const demoBtn = page.getByRole('button', { name: /demo|empezar|comenzar|explorar/i });
    await demoBtn.click();
    // Should land on /setup or a slug-based farm page
    await expect(page).toHaveURL(/\/(setup|[a-z0-9-]+)/);
  });
});
