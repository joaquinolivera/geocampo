/**
 * @fileoverview Next.js middleware — session protection for GeoCampo.
 *
 * The web app has basePath: '/app' (see next.config.ts), so all routes are
 * mounted under /app in production. Middleware sees the full path including
 * the basePath prefix. BASE_PATH strips it for internal path comparisons and
 * is prepended again for any redirect targets.
 *
 * Demo mode  (no Supabase): checks for `geocampo_session` cookie.
 * Production (Supabase set): refreshes the Supabase session on every request.
 *
 * Protected: everything except /login, /register, /setup, /billing, /api/webhooks.
 */

import { NextResponse, type NextRequest } from 'next/server';

// Must match the same placeholder detection used in src/lib/supabase.ts
const _url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const _key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const _isPlaceholder = (s: string) =>
  !s || s.includes('your-project') || s.includes('your_') || s.startsWith('your');
const IS_DEMO_MODE = _isPlaceholder(_url) || _isPlaceholder(_key);

// Must match next.config.ts basePath
const BASE_PATH = '/app';

const SESSION_COOKIE = 'geocampo_session';

// Paths that are publicly accessible (relative to BASE_PATH, no /app prefix)
const PUBLIC_PATHS = ['/login', '/register', '/setup', '/billing', '/join', '/forgot-password', '/reset-password', '/api/webhooks', '/favicon.ico'];

/** Strip BASE_PATH prefix so we can compare against PUBLIC_PATHS */
function relativePath(pathname: string): string {
  if (pathname.startsWith(BASE_PATH + '/')) return pathname.slice(BASE_PATH.length);
  if (pathname === BASE_PATH) return '/';
  return pathname;
}

function isPublic(pathname: string): boolean {
  const rel = relativePath(pathname);
  return PUBLIC_PATHS.some((p) => rel.startsWith(p)) || rel.startsWith('/_next');
}

/** Build a redirect URL with basePath prefix */
function toAppPath(request: NextRequest, path: string): URL {
  const url = request.nextUrl.clone();
  url.pathname = BASE_PATH + path;
  return url;
}

// ─── Demo middleware ──────────────────────────────────────────────────────────

function demoMiddleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    const loginUrl = toAppPath(request, '/login');
    loginUrl.searchParams.set('next', relativePath(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // Root /app → redirect to farm slug stored in session
  if (pathname === BASE_PATH || pathname === BASE_PATH + '/') {
    try {
      const data = JSON.parse(decodeURIComponent(session.value));
      const slug = data.farmSlug ?? 'estancia-las-pampas';
      return NextResponse.redirect(toAppPath(request, `/${slug}`));
    } catch {
      return NextResponse.redirect(toAppPath(request, '/login'));
    }
  }

  return NextResponse.next();
}

// ─── Production middleware (Supabase SSR) ─────────────────────────────────────

async function supabaseMiddleware(request: NextRequest): Promise<NextResponse> {
  const { createServerClient } = await import('@supabase/ssr');
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    }
  );

  // Refresh session — required for Server Components
  const { data: { user } } = await supabase.auth.getUser();

  if (isPublic(pathname)) return response;

  // Accept either a real Supabase session OR the local demo cookie (setup wizard users)
  const demoCookie = request.cookies.get(SESSION_COOKIE);
  const hasLocalSession = !!demoCookie?.value;

  if (!user && !hasLocalSession) {
    const loginUrl = toAppPath(request, '/login');
    loginUrl.searchParams.set('next', relativePath(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // ── Subscription gate (Supabase users only) ───────────────────────────────
  // Skip /billing and /api to avoid redirect loops.
  const rel = relativePath(pathname);
  if (user && !rel.startsWith('/billing') && !rel.startsWith('/api')) {
    const { data: farm } = await supabase
      .from('farms')
      .select('subscription_status, trial_ends_at')
      .eq('owner_id', user.id)
      .single();

    if (farm) {
      const status    = farm.subscription_status as string | null;
      const trialEnd  = farm.trial_ends_at ? new Date(farm.trial_ends_at) : null;
      const trialOver = !trialEnd || trialEnd < new Date();

      const blocked =
        (status === 'past_due' || status === 'canceled' || status === 'incomplete') &&
        trialOver;

      if (blocked) {
        return NextResponse.redirect(toAppPath(request, '/billing'));
      }
    }
  }

  // Root /app → redirect to farm slug
  if (pathname === BASE_PATH || pathname === BASE_PATH + '/') {
    if (user) {
      const { data: farm } = await supabase
        .from('farms')
        .select('slug')
        .eq('owner_id', user.id)
        .single();

      if (farm?.slug) {
        return NextResponse.redirect(toAppPath(request, `/${farm.slug}`));
      }

      // No farm in Supabase — send to setup wizard
      return NextResponse.redirect(toAppPath(request, '/setup'));
    }

    // Local demo cookie user
    try {
      const data = JSON.parse(decodeURIComponent(demoCookie!.value));
      const slug = data.farmSlug ?? 'estancia-las-pampas';
      return NextResponse.redirect(toAppPath(request, `/${slug}`));
    } catch {
      return NextResponse.redirect(toAppPath(request, '/login'));
    }
  }

  return response;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  if (IS_DEMO_MODE) {
    return demoMiddleware(request);
  }
  return supabaseMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
