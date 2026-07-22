/**
 * POST /api/auth/login
 *
 * Creates a Supabase server client backed by next/headers cookies()
 * directly in this handler (no shared helper), so the setAll callback
 * writes session cookies into the HTTP response without any silent
 * try/catch swallowing the write.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  console.log('[login] handler called');

  try {
    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos.' }, { status: 400 });
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (pairs: { name: string; value: string; options?: Record<string, unknown> }[]) => {
            console.log('[login] setAll — setting cookies:', pairs.map(p => p.name));
            pairs.forEach(({ name, value, options }) => {
              // No try/catch here — let errors surface so we can see them
              cookieStore.set(name, value, { path: '/', ...(options ?? {}) } as Parameters<typeof cookieStore.set>[2]);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    console.log('[login] signIn result — user:', data?.user?.id ?? 'null', '| error:', error?.message ?? 'none');

    if (error) {
      const msg = error.message.toLowerCase();
      const userFacingError =
        msg.includes('invalid') ||
        msg.includes('credentials') ||
        msg.includes('wrong') ||
        msg.includes('email not confirmed')
          ? 'Email o contraseña incorrectos.'
          : error.message;
      return NextResponse.json({ error: userFacingError }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[login] caught error:', err);
    return NextResponse.json({ error: 'Error del servidor.' }, { status: 500 });
  }
}
