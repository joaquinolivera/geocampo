/**
 * Mobile i18n provider — English / Spanish toggle
 *
 * Language preference is stored in AsyncStorage ('geocampo_lang').
 * Defaults to Spanish (primary market: Argentina / Uruguay).
 *
 * Usage:
 *   const { t, language, setLanguage } = useT();
 *   t('herds.title')                     // → 'Lotes' (es) / 'Herds' (en)
 *   t('alerts.dueIn', { days: 3 })       // → 'Vence en 3 día(s)'
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { en, es, interpolate, getPath, type Language, type Translations } from '@geocampo/i18n';

const TRANSLATIONS: Record<Language, Translations> = { en, es };
const STORAGE_KEY = 'geocampo_lang';
const DEFAULT_LANG: Language = 'es';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(DEFAULT_LANG);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'es') setLang(stored);
      })
      .catch(() => {
        // Storage unavailable — use default
      });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
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

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT() must be used inside <LanguageProvider>');
  return ctx;
}
