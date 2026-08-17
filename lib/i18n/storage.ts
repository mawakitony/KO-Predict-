export const LANGUAGE_STORAGE_KEY = "ko-predict-language";

export const LOCALES = ["fr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LOCALE_BCP47: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-US",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr" || value === "en";
}

/** Résout la langue : choix stocké valide, sinon français. */
export function resolveLocale(stored: string | null | undefined): Locale {
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export const LANGUAGE_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(LANGUAGE_STORAGE_KEY)};var s=localStorage.getItem(k);document.documentElement.lang=s==="en"?"en":"fr";}catch(e){}})();`;
