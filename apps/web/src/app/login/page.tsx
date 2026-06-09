'use client';

import { Suspense, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IS_DEMO_MODE, setDemoSession, getBrowserClient, DEMO_FARM_SLUG } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';

// ─── Inner component (uses useSearchParams — must be inside Suspense) ──────────

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get('next');
  const { t } = useT();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(t('auth.errEmpty'));
      return;
    }

    startTransition(() => { void (async () => {
      if (IS_DEMO_MODE) {
        setDemoSession(email.trim());
        router.push(nextPath ?? `/${DEMO_FARM_SLUG}`);
        return;
      }

      const client = getBrowserClient();
      if (!client) {
        setError(t('auth.errConfig'));
        return;
      }

      const { error: authError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const msg = authError.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong') || msg.includes('email not confirmed')) {
          setError('Email o contraseña incorrectos.');
        } else {
          setError(authError.message);
        }
        return;
      }

      router.push(nextPath ?? '/');
      router.refresh();
    })(); });
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center p-6">
      {/* Language toggle — top right */}
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
          <h1 className="text-white text-2xl font-bold tracking-tight">{t('auth.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('auth.tagline')}</p>
        </div>

        {/* Demo notice */}
        {IS_DEMO_MODE && (
          <div className="mb-6 rounded-xl border border-lime/20 bg-lime/5 px-4 py-3">
            <p className="text-lime text-xs font-semibold mb-0.5">{t('auth.demoTitle')}</p>
            <p className="text-muted text-xs">{t('auth.demoBody')}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              autoComplete="email"
              disabled={isPending}
              className="w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 disabled:opacity-50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="current-password"
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
                {t('auth.loggingIn')}
              </span>
            ) : (
              t('auth.loginBtn')
            )}
          </button>
        </form>

        {/* Register link */}
        {!IS_DEMO_MODE && (
          <p className="text-muted text-sm text-center mt-5">
            ¿No tenés cuenta?{' '}
            <a
              href="/register"
              className="text-lime font-semibold hover:brightness-110 transition-all"
            >
              Registrate
            </a>
          </p>
        )}

        {/* Support footer */}
        <p className="text-muted text-xs text-center mt-5">
          {t('auth.support')}{' '}
          <a
            href="mailto:soporte@geocampo.com"
            className="text-lime/70 hover:text-lime transition-colors"
          >
            {t('auth.supportLink')}
          </a>
        </p>
      </div>

      {/* Setup link */}
      <a
        href="/setup"
        className="mt-4 text-lime/60 hover:text-lime text-xs underline-offset-2 hover:underline transition-colors"
      >
        🌿 Configurar mi campo por primera vez →
      </a>

      {/* Bottom tagline */}
      <p className="text-muted text-xs mt-4 text-center">
        {t('auth.footer')} {new Date().getFullYear()}
      </p>
    </div>
  );
}

// ─── Page export — Suspense wraps useSearchParams ──────────────────────────────

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
