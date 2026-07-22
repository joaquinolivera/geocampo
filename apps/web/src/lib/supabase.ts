/**
 * @fileoverview Supabase client helpers — multi-tenant SaaS edition.
 *
 * Two modes:
 *  1. Demo mode  — env vars empty → localStorage, no real auth
 *  2. Production — Supabase configured → real DB + RLS per farm_id
 *
 * Multi-tenancy: every user belongs to one or more farms via farm_members.
 * The active farm is stored in sessionStorage and exposed via useFarm().
 */

export const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? '';
// Support both the classic JWT anon key and Supabase's newer "publishable key" format
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

// Treat missing OR placeholder values as demo mode
const isPlaceholder = (s: string) =>
  !s ||
  s.includes('your-project') ||
  s.includes('REPLACE') ||
  s.startsWith('your') ||
  s === 'https://REPLACE.supabase.co';

export const IS_DEMO_MODE =
  isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_ANON_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

export type FarmRole = 'owner' | 'manager' | 'vet' | 'employee' | 'viewer';

export interface FarmMembership {
  farmId:   string;
  farmName: string;
  farmSlug: string;
  role:     FarmRole;
}

export interface UserSession {
  userId:       string;
  email:        string;
  displayName:  string;
  memberships:  FarmMembership[];
  activeFarmId: string | null;
}

// ─── Browser client (singleton) ───────────────────────────────────────────────

let _browserClient: ReturnType<typeof _createBrowserClient> | null = null;

function _createBrowserClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createBrowserClient } = require('@supabase/ssr');
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function getBrowserClient() {
  if (IS_DEMO_MODE) return null;
  if (!_browserClient) _browserClient = _createBrowserClient();
  return _browserClient;
}

// ─── Server client (used in Server Components / Route Handlers) ───────────────

export async function getServerClient() {
  if (IS_DEMO_MODE) return null;
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll:    () => cookieStore.getAll(),
      setAll: (pairs: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
        try {
          pairs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {
          // read-only context (Server Component) — ignore
        }
      },
    },
  });
}

// ─── Service-role client (server-only, bypasses RLS) ─────────────────────────
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser.

export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  // Use the raw JS client — no cookie handling needed for server-to-server calls.
  const { createClient } = require('@supabase/supabase-js');
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── User session helpers ─────────────────────────────────────────────────────

/**
 * Fetch the current user's memberships from Supabase.
 * Returns null in demo mode.
 */
export async function getUserSession(): Promise<UserSession | null> {
  const client = getBrowserClient();
  if (!client) return null;

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;

  const { data: memberships } = await client
    .from('farm_members')
    .select('farm_id, role, farms(id, slug, name)')
    .eq('user_id', user.id);

  const mapped: FarmMembership[] = (memberships ?? []).map((m: {
    farm_id: string;
    role: FarmRole;
    farms: { id: string; slug: string; name: string } | null;
  }) => ({
    farmId:   m.farm_id,
    farmName: m.farms?.name ?? '',
    farmSlug: m.farms?.slug ?? '',
    role:     m.role,
  }));

  const stored = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('geocampo_active_farm')
    : null;

  const activeFarmId = stored && mapped.some(m => m.farmId === stored)
    ? stored
    : mapped[0]?.farmId ?? null;

  return {
    userId:       user.id,
    email:        user.email ?? '',
    displayName:  user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuario',
    memberships:  mapped,
    activeFarmId,
  };
}

/** Switch the active farm (persisted in sessionStorage) */
export function setActiveFarm(farmId: string) {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('geocampo_active_farm', farmId);
  }
}

/** Get the active farm_id from sessionStorage */
export function getActiveFarmId(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem('geocampo_active_farm');
}

// ─── Demo auth helpers (unchanged) ───────────────────────────────────────────

export const DEMO_FARM_SLUG    = 'estancia-las-pampas';
export const DEMO_SESSION_COOKIE = 'geocampo_session';

export interface DemoSession {
  email:     string;
  farmSlug:  string;
  name:      string;
}

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

export function setDemoSession(email: string, farmSlug?: string) {
  const session: DemoSession = {
    email,
    farmSlug: farmSlug ?? DEMO_FARM_SLUG,
    name:     email.split('@')[0],
  };
  const encoded  = encodeURIComponent(JSON.stringify(session));
  const expires  = new Date(Date.now() + 7 * 86_400_000).toUTCString();
  document.cookie = `${DEMO_SESSION_COOKIE}=${encoded}; path=/; expires=${expires}; SameSite=Lax`;
}

export function clearDemoSession() {
  document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ─── Auth actions ─────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, farmName?: string) {
  const client = getBrowserClient();
  if (!client) throw new Error('Demo mode — signup not available');
  return client.auth.signUp({
    email,
    password,
    options: { data: { farm_name: farmName } },
  });
}

export async function signIn(email: string, password: string) {
  const client = getBrowserClient();
  if (!client) throw new Error('Demo mode — use any email/password');
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const client = getBrowserClient();
  if (!client) { clearDemoSession(); return; }
  await client.auth.signOut();
}
