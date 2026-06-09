'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase';
import LanguageToggle from '@/components/LanguageToggle';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [farmName, setFarmName]   = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Email y contraseña son obligatorios.');
      return;
    }
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
      if (!client) {
        setError('Supabase no está configurado.');
        return;
      }

      const { error: signUpError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            farm_name: farmName.trim() || undefined,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
    })(); });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-6">
        <div
          className="w-full max-w-sm rounded-2xl border border-surface2 p-8 text-center"
          style={{ backgroundColor: '#111112' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-3xl mb-4 mx-auto">
            ✉️
          </div>
          <h2 className="text-white text-xl font-bold mb-2">¡Revisá tu email!</h2>
          <p className="text-muted text-sm mb-6">
            Te enviamos un link de confirmación a <span className="text-white font-medium">{email}</span>.
            Una vez confirmado, podés iniciar sesión.
          </p>
          <a
            href="/login"
            className="inline-block w-full rounded-xl py-3 font-bold text-charcoal text-sm text-center transition-all hover:brightness-110"
            style={{ backgroundColor: '#DEFF9A' }}
          >
            Ir al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-6">
      {/* Language toggle */}
      <div className="absolute top-5 right-5">
        <LanguageToggle />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl border border-surface2 p-8"
        style={{ backgroundColor: '#111112' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center text-3xl mb-4">
            🌿
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Crear cuenta</h1>
          <p className="text-muted text-sm mt-1">GeoCampo — gestión ganadera</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Email
            </label>
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

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Contraseña
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
            <label className="block text-white text-sm font-medium mb-2">
              Confirmá la contraseña
            </label>
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

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Nombre del campo
              <span className="text-muted text-xs font-normal ml-2">(opcional)</span>
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Estancia Las Pampas"
              autoComplete="organization"
              disabled={isPending}
              className="w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-critical/30 bg-critical/10 px-4 py-3">
              <p className="text-critical text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl py-3 font-bold text-charcoal text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: '#DEFF9A' }}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                Creando cuenta…
              </span>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="text-muted text-sm text-center mt-5">
          ¿Ya tenés cuenta?{' '}
          <a
            href="/login"
            className="text-lime font-semibold hover:brightness-110 transition-all"
          >
            Iniciá sesión
          </a>
        </p>
      </div>

      {/* Bottom tagline */}
      <p className="text-muted text-xs mt-6 text-center">
        © GeoCampo {new Date().getFullYear()}
      </p>
    </div>
  );
}
