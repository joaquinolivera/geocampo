/**
 * E2E — Authentication flow
 *
 * Tests the login page in demo mode (empty Supabase env → localStorage mode).
 */

import { test, expect } from '@playwright/test';

test.describe('Login — demo mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows the GeoCampo login page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'GeoCampo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar al campo' })).toBeVisible();
  });

  test('shows a demo mode indicator when Supabase is not configured', async ({ page }) => {
    await expect(page.getByText('Modo demostración')).toBeVisible();
  });

  test('navigates to the farm dashboard after demo login', async ({ page }) => {
    await page.locator('input[type="email"]').fill('test@geocampo.app');
    await page.locator('input[type="password"]').fill('demo1234');
    await page.getByRole('button', { name: 'Entrar al campo' }).click();
    // Should land on the demo farm slug
    await expect(page).toHaveURL(/estancia-las-pampas/, { timeout: 10_000 });
  });
});
