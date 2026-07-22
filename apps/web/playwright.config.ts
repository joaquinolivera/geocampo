import { defineConfig, devices } from '@playwright/test';

/**
 * GeoCampo web — Playwright E2E configuration.
 *
 * Run:  npx playwright test
 * UI:   npx playwright test --ui
 *
 * Expects the dev server on http://localhost:3001 (apps/web runs on that port).
 * Start it with: pnpm dev:web
 */
export default defineConfig({
  testDir:     './e2e',
  fullyParallel: false,   // tests share localStorage state
  timeout:     30_000,
  expect:      { timeout: 8_000 },
  reporter:    [['html', { outputFolder: 'playwright-report' }], ['list']],

  use: {
    baseURL: 'http://localhost:3001',
    storageState: undefined,
    // Each test gets a fresh context so localStorage is clean
    contextOptions: { storageState: undefined },
    trace:       'on-first-retry',
    screenshot:  'only-on-failure',
    video:       'retain-on-failure',
  },

  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start the dev server if not already running
  webServer: {
    command: 'pnpm dev:web',
    url:     'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
