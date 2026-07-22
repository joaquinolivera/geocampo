'use client';

/**
 * /account — User account settings
 *
 * Allows logged-in users to:
 *   - See their current email
 *   - Change their password
 */

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';

export default function AccountPage() {
  const { farmSlug } = useFarmData();

  const [email, setEmail]         = useState<string | null>(null);
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const client = getBrowserClient();
    if (!client) return;
    void client.auth.getUser().then(({ data }: { data: { user: { email?: string } | null } }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    startTransition(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) { setError('Supabase no está configurado.'); return; }

      const { error: err } = await client.auth.updateUser({ password });
      if (err) { setError(err.message); return; }

      setPassword('');
      setConfirm('');
      setSuccess(true);
    })(); });
  };

  const backHref = farmSlug ? `/${farmSlug}` : '/';

  return (
    <div className="min-h-screen bg-charcoal text-white">

      {/* Header */}
      <div className="border-b border-surface2 px-6 py-4 flex items-center gap-4">
        <Link href={backHref} className="text-muted hover:text-white transition-colors text-sm">← Campo</Link>
        <h1 className="text-lg font-bold">Mi cuenta</h1>
      </div>

      <div className="max-w-md mx-auto px-6 py-8 space-y-6">

        {/* Email display */}
        <div className="rounded-2xl border border-surface2 px-6 py-5" style={{ backgroundColor: '#111112' }}>
          <p className="text-muted text-xs uppercase tracking-wider mb-1">Email</p>
          <p className="text-white font-medium">{email ?? '—'}</p>
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-surface2 px-6 py-5" style={{ backgroundColor: '#111112' }}>
          <h2 className="text-white font-semibold mb-4">Cambiar contraseña</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
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

            {error && (
              <div className="rounded-xl border border-critical/30 bg-critical/10 px-4 py-3">
                <p className="text-critical text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-lime/30 bg-lime/10 px-4 py-3">
                <p className="text-lime text-sm font-medium">✅ Contraseña actualizada correctamente.</p>
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
              ) : 'Actualizar contraseña'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
