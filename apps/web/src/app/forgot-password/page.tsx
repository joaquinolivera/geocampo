'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Ingresá tu email.'); return; }

    startTransition(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) { setError('Supabase no está configurado.'); return; }

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/app/reset-password`
          : '/app/reset-password';

      const { error: err } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (err) { setError(err.message); return; }
      setSent(true);
    })(); });
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-surface2 p-8 text-center" style={{ backgroundColor: '#111112' }}>
          <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-3xl mb-4 mx-auto">✉️</div>
          <h2 className="text-white text-xl font-bold mb-2">Revisá tu email</h2>
          <p className="text-muted text-sm mb-6">
            Si <span className="text-white font-medium">{email}</span> tiene una cuenta,
            recibirás un link para restablecer tu contraseña.
          </p>
          <Link
            href="/login"
            className="inline-block w-full rounded-xl py-3 font-bold text-charcoal text-sm text-center hover:brightness-110 transition-all"
            style={{ backgroundColor: '#DEFF9A' }}
          >
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-surface2 p-8" style={{ backgroundColor: '#111112' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-3xl mb-4">🌿</div>
          <h1 className="text-white text-2xl font-bold tracking-tight">¿Olvidaste tu contraseña?</h1>
          <p className="text-muted text-sm mt-1 text-center">Te enviamos un link para restablecerla.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              disabled={isPending}
              className="w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 disabled:opacity-50 transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-critical/30 bg-critical/10 px-4 py-3">
              <p className="text-critical text-sm">{error}</p>
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
                Enviando…
              </span>
            ) : 'Enviar link de recuperación'}
          </button>
        </form>

        <p className="text-muted text-sm text-center mt-5">
          <Link href="/login" className="text-lime font-semibold hover:brightness-110 transition-all">
            ← Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
