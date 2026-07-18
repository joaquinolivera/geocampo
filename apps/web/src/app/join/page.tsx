'use client';

/**
 * /join?token=xxx
 *
 * Accepts a team invitation. The user must be logged in.
 * If not logged in, we redirect to /login?redirect=/join?token=xxx
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';

type State = 'loading' | 'success' | 'error' | 'needs-login';

function JoinContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token');

  const [state, setState]     = useState<State>('loading');
  const [farmSlug, setSlug]   = useState('');
  const [role, setRole]       = useState('');
  const [errorMsg, setError]  = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('Enlace de invitación inválido.');
      return;
    }

    async function accept() {
      const client = getBrowserClient();
      if (!client) {
        setState('error');
        setError('Supabase no está configurado.');
        return;
      }

      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        setState('needs-login');
        return;
      }

      const res = await fetch('/api/team/accept', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });

      const json = await res.json() as { farmSlug?: string; role?: string; error?: string };

      if (!res.ok) {
        setState('error');
        setError(json.error ?? 'Error al aceptar la invitación.');
        return;
      }

      setSlug(json.farmSlug ?? '');
      setRole(json.role ?? '');
      setState('success');

      // Redirect after 2s
      setTimeout(() => {
        router.push(`/${json.farmSlug ?? ''}`);
      }, 2000);
    }

    void accept();
  }, [token, router]);

  const ROLE_LABELS: Record<string, string> = {
    owner:    'Dueño/a',
    capataz:  'Capataz',
    manager:  'Administrador/a',
    empleado: 'Empleado/a',
    employee: 'Empleado/a',
    vet:      'Veterinario/a',
    viewer:   'Observador/a',
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-6">
      <div
        className="w-full max-w-sm rounded-2xl border border-surface2 p-8 text-center"
        style={{ backgroundColor: '#111112' }}
      >
        <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-3xl mb-4 mx-auto">
          🌿
        </div>

        {state === 'loading' && (
          <>
            <h2 className="text-white text-xl font-bold mb-2">Verificando invitación…</h2>
            <div className="flex justify-center mt-4">
              <span className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        )}

        {state === 'needs-login' && (
          <>
            <h2 className="text-white text-xl font-bold mb-2">Iniciá sesión para unirte</h2>
            <p className="text-muted text-sm mb-6">
              Necesitás una cuenta para aceptar esta invitación.
            </p>
            <Link
              href={`/login?redirect=/join?token=${token ?? ''}`}
              className="inline-block w-full rounded-xl py-3 font-bold text-charcoal text-sm text-center transition-all hover:brightness-110"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              Iniciar sesión
            </Link>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-white text-xl font-bold mb-2">¡Te uniste al campo!</h2>
            <p className="text-muted text-sm mb-1">
              Tu rol: <span className="text-white font-semibold">{ROLE_LABELS[role] ?? role}</span>
            </p>
            <p className="text-muted text-xs mt-4">Redirigiendo…</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <h2 className="text-white text-xl font-bold mb-2">Error al unirse</h2>
            <p className="text-muted text-sm mb-6">{errorMsg}</p>
            <Link
              href="/login"
              className="inline-block w-full rounded-xl py-3 font-bold text-charcoal text-sm text-center transition-all hover:brightness-110"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              Ir al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
