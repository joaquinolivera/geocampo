/**
 * @geocampo/i18n — Shared internationalization package
 *
 * Provides type-safe English/Spanish translations consumable by both
 * the Next.js web dashboard and the Expo mobile app.
 *
 * Usage (React):
 *   const { t, language, setLanguage } = useLanguage();
 *   t('auth.loginBtn')                       // → 'Enter the field'
 *   t('alerts.dueIn', { days: 3 })           // → 'Due in 3 day(s)'
 */

export { en } from './translations/en';
export { es } from './translations/es';
export type { Translations } from './translations/en';
// DeepStringMap is intentionally not re-exported (internal to the package)

export type Language = 'en' | 'es';

/**
 * Simple template interpolation: replaces {key} placeholders with values.
 * Example: interpolate('Due in {days} day(s)', { days: 3 }) → 'Due in 3 day(s)'
 */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce<string>(
    (str, [key, val]) => str.replaceAll(`{${key}}`, String(val)),
    template
  );
}

/**
 * Walks a dot-separated path through a nested object.
 * Example: getPath(en, 'auth.loginBtn') → 'Enter the field'
 */
export function getPath(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === 'string') return current;
  // Path not found — return the path itself as fallback (clearly visible in UI)
  return path;
}
