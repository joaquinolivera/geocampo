/**
 * @fileoverview Supabase client helpers for the GeoCampo web dashboard.
 *
 * Two modes:
 *  1. Demo mode  — NEXT_PUBLIC_SUPABASE_URL not set.
 *     Auth is simulated with a signed cookie. No real DB calls.
 *  2. Production — Supabase configured. Uses @supabase/ssr for Next.js 15.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Treat missing OR placeholder values as demo mode
const isPlaceholder = (s: string) =>
  !s || s.includes('your-project') || s.includes('your_') || s.startsWith('your');
export const IS_DEMO_MODE = isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY);

// ─── Browser client (used in client components) ───────────────────────────────

let _browserClient: ReturnType<typeof _createBrowserClient> | null = null;

function _createBrowserClient() {
  // Dynamic import so the module doesn't break in demo mode where the package
  // might not yet be installed.
  const { createBrowserClient } = require('@supabase/ssr');
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function getBrowserClient() {
  if (IS_DEMO_MODE) return null;
  if (!_browserClient) _browserClient = _createBrowserClient();
  return _browserClient;
}

// ─── Demo auth helpers ────────────────────────────────────────────────────────
// Used when NEXT_PUBLIC_SUPABASE_URL is not configured.

export const DEMO_FARM_SLUG = 'estancia-las-pampas';
export const DEMO_SESSION_COOKIE = 'geocampo_session';

export interface DemoSession {
  email: string;
  farmSlug: string;
  name: string;
}

/** Check demo cookie in browser context */
export function getDemoSession(): DemoSession | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(DEMO_SESSION_COOKIE + '='));
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.split('=').slice(1).join('=')));
  } catch {
    return null;
  }
}

export function setDemoSession(email: string) {
  const session: DemoSession = {
    email,
    farmSlug: DEMO_FARM_SLUG,
    name: email.split('@')[0],
  };
  const encoded = encodeURIComponent(JSON.stringify(session));
  // 7-day expiry
  const expires = new Date(Date.now() + 7 * 86_400_000).toUTCString();
  document.cookie = `${DEMO_SESSION_COOKIE}=${encoded}; path=/; expires=${expires}; SameSite=Lax`;
}

export function clearDemoSession() {
  document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
