/**
 * @fileoverview Next.js middleware — session protection for GeoCampo.
 *
 * Demo mode  (no Supabase): checks for `geocampo_session` cookie.
 * Production (Supabase set): refreshes the Supabase session on every request.
 *
 * Protected: everything except /login and Next.js internals.
 */

import { NextResponse, type NextRequest } from 'next/server';

// Must match the same placeholder detection used in src/lib/supabase.ts
const _url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const _key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const _isPlaceholder = (s: string) =>
  !s || s.includes('your-project') || s.includes('your_') || s.startsWith('your');
const IS_DEMO_MODE = _isPlaceholder(_url) || _isPlaceholder(_key);

const SESSION_COOKIE = 'geocampo_session';
const PUBLIC_PATHS = ['/login', '/setup', '/_next', '/favicon.ico'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// ─── Demo middleware ──────────────────────────────────────────────────────────

function demoMiddleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root / → redirect to farm slug stored in session
  if (pathname === '/') {
    try {
      const data = JSON.parse(decodeURIComponent(session.value));
      const slug = data.farmSlug ?? 'estancia-las-pampas';
      const farmUrl = request.nextUrl.clone();
      farmUrl.pathname = `/${slug}`;
      return NextResponse.redirect(farmUrl);
    } catch {
      // malformed cookie — boot to login
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
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
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Root / → redirect to farm slug
  if (pathname === '/') {
    if (user) {
      // Supabase user: look up their farm
      const { data: farm } = await supabase
        .from('farms')
        .select('slug')
        .eq('owner_id', user.id)
        .single();

      const slug = farm?.slug ?? 'mi-campo';
      const farmUrl = request.nextUrl.clone();
      farmUrl.pathname = `/${slug}`;
      return NextResponse.redirect(farmUrl);
    }

    // Local demo cookie user: use farmSlug from cookie
    try {
      const data = JSON.parse(decodeURIComponent(demoCookie!.value));
      const slug = data.farmSlug ?? 'estancia-las-pampas';
      const farmUrl = request.nextUrl.clone();
      farmUrl.pathname = `/${slug}`;
      return NextResponse.redirect(farmUrl);
    } catch {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
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
