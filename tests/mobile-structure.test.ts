/**
 * @fileoverview Phase 1 TDD: Mobile App Structure Tests
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('GeoCampo Mobile App Structure', () => {
  const appDir = resolve(__dirname, '../apps/mobile/app');

  describe('Expo Router Configuration', () => {
    it('should have root layout', () => {
      expect(existsSync(resolve(appDir, '_layout.tsx'))).toBe(true);
    });

    it('should have tab navigation layout', () => {
      expect(existsSync(resolve(appDir, '(tabs)/_layout.tsx'))).toBe(true);
    });

    it('should have all tab screens', () => {
      const tabs = ['index.tsx', 'map.tsx', 'herds.tsx', 'health.tsx'];
      tabs.forEach((tab) => {
        expect(existsSync(resolve(appDir, '(tabs)', tab))).toBe(true);
      });
    });
  });

  describe('Expo Configuration', () => {
    it('should have app.json with correct scheme', () => {
      const appJson = JSON.parse(
        readFileSync(resolve(__dirname, '../apps/mobile/app.json'), 'utf-8')
      );
      expect(appJson.expo.scheme).toBe('geocampo');
      expect(appJson.expo.name).toBe('GeoCampo');
    });

    it('should configure for web output', () => {
      const appJson = JSON.parse(
        readFileSync(resolve(__dirname, '../apps/mobile/app.json'), 'utf-8')
      );
      expect(appJson.expo.web.bundler).toBe('metro');
    });
  });

  describe('Monorepo Configuration', () => {
    it('should have pnpm-workspace.yaml', () => {
      expect(existsSync(resolve(__dirname, '../pnpm-workspace.yaml'))).toBe(true);
    });

    it('should have metro config for monorepo', () => {
      const metroConfig = readFileSync(
        resolve(__dirname, '../apps/mobile/metro.config.js'),
        'utf-8'
      );
      expect(metroConfig).toContain('watchFolders');
      expect(metroConfig).toContain('nodeModulesPaths');
    });
  });
});
