'use client';

/**
 * Web i18n provider — English / Spanish toggle
 *
 * Language preference is stored in localStorage ('geocampo_lang').
 * Defaults to Spanish (primary market: Argentina / Uruguay).
 *
 * Usage:
 *   const { t, language, setLanguage } = useT();
 *   t('auth.loginBtn')                    // → 'Enter the field' (en) / 'Entrar al campo' (es)
 *   t('alerts.dueIn', { days: 3 })        // → 'Due in 3 day(s)'
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { en, es, interpolate, getPath, type Language, type Translations } from '@geocampo/i18n';

// ── Translations map ───────────────────────────────────────────────────────────

const TRANSLATIONS: Record<Language, Translations> = { en, es };

const STORAGE_KEY = 'geocampo_lang';
const DEFAULT_LANG: Language = 'es';

// ── Context ───────────────────────────────────────────────────────────────────

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translate a dot-separated key with optional interpolation vars */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(DEFAULT_LANG);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === 'en' || stored === 'es') setLang(stored);
    } catch {
      // Private browsing — ignore
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const strings = TRANSLATIONS[language] as unknown as Record<string, unknown>;
      const raw = getPath(strings, key);
      return interpolate(raw, vars);
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useT() must be used inside <LanguageProvider>');
  }
  return ctx;
}
