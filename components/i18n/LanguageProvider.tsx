"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LANGUAGE_STORAGE_KEY,
  isLocale,
  resolveLocale,
  type Locale,
} from "@/lib/i18n/storage";
import {
  translate,
  type MessageKey,
  type TranslateParams,
} from "@/lib/i18n/translate";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: TranslateParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function applyLang(locale: Locale) {
  document.documentElement.lang = locale;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const resolved = resolveLocale(readStoredLocale());
    setLocaleState(resolved);
    applyLang(resolved);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    const resolved = resolveLocale(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, resolved);
    } catch {
      /* quota / mode privé */
    }
    setLocaleState(resolved);
    applyLang(resolved);
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) =>
      translate(locale, key, params),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage doit être utilisé dans LanguageProvider.");
  }
  return ctx;
}
