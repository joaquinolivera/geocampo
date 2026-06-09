'use client';

/**
 * /reset-password
 *
 * Supabase sends the user here after they click the password-reset email.
 * The URL contains an access_token in the fragment (#access_token=...&type=recovery).
 * Supabase JS picks it up automatically via onAuthStateChange, then we let
 * the user set a new password with updateUser({ password }).
 */

import { useEffect, useState, useTransition } from 'react';
import { getBrowserClient } from '@/lib/supabase';

type Stage = 'waiting' | 'ready' | 'success' | 'error';

export default function ResetPasswordPage() {
  const [stage, setStage]         = useState<Stage>('waiting');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Wait for Supabase to process the recovery token from the URL fragment
  useEffect(() => {
    const client = getBrowserClient();
    if (!client) { setStage('error'); setErrorMsg('Supabase no está configurado.'); return; }

    const { data: { subscription } } = client.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStage('ready');
      }
    });

    // Also check if there's already a session (token already consumed)
    void client.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) setStage('ready');
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    startTransition(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) { setErrorMsg('Supabase no está configurado.'); return; }

      const { error } = await client.auth.updateUser({ password });
      if (error) { setErrorMsg(error.message); return; }

      setStage('success');
      // Hard-navigate to dashboard after a short delay
      setTimeout(() => { window.location.assign('/app'); }, 2000);
    })(); });
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-surface2 p-8" style={{ backgroundColor: '#111112' }}>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-3xl mb-4">🌿</div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Nueva contraseña</h1>
        </div>

        {stage === 'waiting' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            <p className="text-muted text-sm">Verificando enlace…</p>
          </div>
        )}

        {stage === 'error' && (
          <div className="rounded-xl border border-critical/30 bg-critical/10 px-4 py-3 text-center">
            <p className="text-critical text-sm">{errorMsg ?? 'El enlace expiró o no es válido.'}</p>
            <a href="/forgot-password" className="text-lime text-sm mt-2 inline-block hover:brightness-110">
              Solicitar nuevo enlace →
            </a>
          </div>
        )}

        {stage === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-4xl">✅</span>
            <p className="text-white font-semibold">¡Contraseña actualizada!</p>
            <p className="text-muted text-sm">Redirigiendo al campo…</p>
          </div>
        )}

        {stage === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Nueva contraseña
                <span className="text-muted text-xs font-normal ml-2">(mín. 6 caracteres)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isPending}
                className="w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 disabled:opacity-50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Confirmá la contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isPending}
                className="w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 disabled:opacity-50 transition-colors"
              />
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-critical/30 bg-critical/10 px-4 py-3">
                <p className="text-critical text-sm">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl py-3 font-bold text-charcoal text-sm transition-all disabled:opacity-60 hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                  Guardando…
                </span>
              ) : 'Guardar nueva contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
