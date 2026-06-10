/**
 * POST /api/auth/exchange
 *
 * Called by the login page immediately after client-side signInWithPassword.
 * Receives the access_token + refresh_token and calls setSession server-side,
 * which causes @supabase/ssr to write the auth cookies onto the response.
 *
 * This guarantees the session cookies exist before the browser navigates to
 * /app, so middleware's supabase.auth.getUser() can find the session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      access_token?: string;
      refresh_token?: string;
    };

    const { access_token, refresh_token } = body;

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            );
          },
        },
      }
    );

    // setSession writes access_token + refresh_token into the response cookies.
    // The browser stores these, so subsequent requests (including to middleware)
    // will include them.
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
