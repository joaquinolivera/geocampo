'use client';

import { useT } from '@/lib/i18n';

/**
 * EN / ES language toggle pill — designed for the TopBar.
 * Clicking the inactive language switches immediately.
 */
export default function LanguageToggle() {
  const { language, setLanguage } = useT();

  return (
    <div
      className="flex items-center rounded-lg border border-surface2 overflow-hidden text-[11px] font-bold"
      role="group"
      aria-label="Language / Idioma"
    >
      {(['en', 'es'] as const).map((lang) => {
        const active = language === lang;
        return (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            aria-pressed={active}
            aria-label={lang === 'en' ? 'English' : 'Español'}
            className="px-2.5 py-1 transition-all uppercase tracking-widest"
            style={{
              backgroundColor: active ? '#DEFF9A' : 'transparent',
              color: active ? '#0A0A0B' : '#6A6A6B',
              cursor: active ? 'default' : 'pointer',
            }}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
