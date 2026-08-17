import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { formatDate, formatDateShort, formatDateTime } from "@/lib/i18n/format-date";
import { fr } from "@/lib/i18n/fr";
import {
  DEFAULT_LOCALE,
  LANGUAGE_BOOTSTRAP_SCRIPT,
  LANGUAGE_STORAGE_KEY,
  isLocale,
  resolveLocale,
} from "@/lib/i18n/storage";
import {
  collectMessageKeys,
  messagesFor,
  translate,
} from "@/lib/i18n/translate";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("i18n — locale et persistance", () => {
  it("clé localStorage officielle et français par défaut", () => {
    expect(LANGUAGE_STORAGE_KEY).toBe("ko-predict-language");
    expect(DEFAULT_LOCALE).toBe("fr");
  });

  it("n’accepte que fr | en", () => {
    expect(isLocale("fr")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(false);
    expect(isLocale("FR")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale("")).toBe(false);
  });

  it("sans préférence : français", () => {
    expect(resolveLocale(null)).toBe("fr");
    expect(resolveLocale(undefined)).toBe("fr");
    expect(resolveLocale("de")).toBe("fr");
  });

  it("switch FR → EN puis EN → FR", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(translate("fr", "nav.learners")).toBe("Apprenants");
    expect(translate("en", "nav.learners")).toBe("Learners");
    expect(translate("en", "nav.dashboard")).toBe("Dashboard");
    expect(translate("fr", "nav.dashboard")).toBe("Tableau de bord");
  });

  it("bootstrap pose html lang sans navigator.language", () => {
    expect(LANGUAGE_BOOTSTRAP_SCRIPT).toContain(LANGUAGE_STORAGE_KEY);
    expect(LANGUAGE_BOOTSTRAP_SCRIPT).toContain("document.documentElement.lang");
    expect(LANGUAGE_BOOTSTRAP_SCRIPT).not.toContain("navigator.language");
    expect(LANGUAGE_BOOTSTRAP_SCRIPT).not.toContain("location.reload");
  });
});

describe("i18n — dictionnaires et t()", () => {
  it("FR et EN exposent les mêmes clés", () => {
    expect(collectMessageKeys(en)).toEqual(collectMessageKeys(fr));
  });

  it("labels admin Lot A", () => {
    expect(translate("fr", "nav.learners")).toBe("Apprenants");
    expect(translate("en", "nav.learners")).toBe("Learners");
    expect(translate("fr", "nav.team")).toBe("Équipe WOLOYEM");
    expect(translate("en", "nav.team")).toBe("WOLOYEM team");
    expect(translate("fr", "status.active")).toBe("Actif");
    expect(translate("en", "status.active")).toBe("Active");
    expect(translate("fr", "status.pending")).toBe("En attente");
    expect(translate("en", "status.pending")).toBe("Pending");
    expect(translate("fr", "status.disabled")).toBe("Désactivé");
    expect(translate("en", "status.disabled")).toBe("Disabled");
    expect(translate("fr", "status.notActivated")).toBe("Non activé");
    expect(translate("en", "status.notActivated")).toBe("Not activated");
    expect(translate("fr", "status.view")).toBe("Voir");
    expect(translate("en", "status.view")).toBe("View");
    expect(translate("fr", "status.resetAccess")).toBe("Réinitialiser l’accès");
    expect(translate("en", "status.resetAccess")).toBe("Reset access");
  });

  it("labels learner Lot A", () => {
    expect(translate("fr", "nav.progress")).toBe("Ma progression");
    expect(translate("en", "nav.progress")).toBe("My progress");
    expect(translate("fr", "nav.plan")).toBe("Mon plan");
    expect(translate("en", "nav.plan")).toBe("My plan");
    expect(translate("fr", "chrome.learnerSpace")).toBe("Espace apprenant");
    expect(translate("en", "chrome.learnerSpace")).toBe("Learner space");
    expect(translate("fr", "common.darkMode")).toBe("Mode sombre");
    expect(translate("en", "common.darkMode")).toBe("Dark mode");
  });

  it("interpole les paramètres sans ternaire de locale", () => {
    expect(translate("fr", "chrome.hello", { name: "Ada" })).toBe(
      "Bonjour, Ada",
    );
    expect(translate("en", "chrome.hello", { name: "Ada" })).toBe("Hello, Ada");
    expect(messagesFor("fr")).toBe(fr);
    expect(messagesFor("en")).toBe(en);
  });
});

describe("i18n — dates Intl", () => {
  it("formate une date calendaire FR et EN", () => {
    expect(formatDate("2026-08-17", "fr")).toBe("17 août 2026");
    expect(formatDate("2026-08-17", "en")).toBe("August 17, 2026");
    expect(formatDateShort("2026-08-17", "fr")).toBe("17 août");
    expect(formatDateShort("2026-08-17", "en")).toBe("August 17");
  });

  it("date/heure avec connecteur traduit", () => {
    const frLabel = formatDateTime("2026-08-17T15:30:00", "fr");
    const enLabel = formatDateTime("2026-08-17T15:30:00", "en");
    expect(frLabel).toContain("août");
    expect(frLabel).toContain(" à ");
    expect(enLabel).toContain("August");
    expect(enLabel).toContain(" at ");
  });

  it("valeurs vides : fallback dictionnaire, dates stockées non mutées", () => {
    expect(formatDate(null, "fr")).toBe("Donnée insuffisante");
    expect(formatDate(undefined, "en")).toBe("Insufficient data");
    expect(formatDateShort(null, "fr")).toBe("—");
  });
});

describe("i18n — câblage Lot A", () => {
  it("layout racine : LanguageProvider dans ThemeProvider + lang html", () => {
    const src = readSrc("app/layout.tsx");
    expect(src).toContain("LanguageProvider");
    expect(src).toContain("LANGUAGE_BOOTSTRAP_SCRIPT");
    expect(src).toContain("ThemeProvider");
    expect(src).toContain('lang="fr"');
    expect(src).toMatch(
      /<ThemeProvider>\s*<LanguageProvider>\{children\}<\/LanguageProvider>\s*<\/ThemeProvider>/,
    );
    expect(src).not.toContain("LanguageToggle");
    expect(src).not.toMatch(/app\/api/);
  });

  it("LanguageProvider lit/écrit la clé et met à jour html lang sans reload", () => {
    const src = readSrc("components/i18n/LanguageProvider.tsx");
    expect(src).toContain("LANGUAGE_STORAGE_KEY");
    expect(src).toContain("localStorage.setItem");
    expect(src).toContain("document.documentElement.lang");
    expect(src).not.toContain("location.reload");
    expect(src).not.toContain("navigator.language");
  });

  it("LanguageToggle : capsule FR|EN accessible", () => {
    const src = readSrc("components/i18n/LanguageToggle.tsx");
    expect(src).toContain('role="radiogroup"');
    expect(src).toContain('role="radio"');
    expect(src).toContain("aria-checked");
    expect(src).toContain("aria-label");
    expect(src).toContain("ArrowRight");
    expect(src).toContain("setLocale");
    expect(src).not.toContain("locale === \"fr\" ?");
  });

  it("switch présent dans les deux hubs, desktop + mobile", () => {
    const admin = readSrc("components/admin/AdminHubLayout.tsx");
    const learner = readSrc("components/dashboard/LearnerHubLayout.tsx");
    expect(admin).toContain("LanguageToggle");
    expect(admin).toContain("ko-admin-mobile-nav-theme");
    expect(admin).toContain('t("nav.learners")');
    expect(learner).toContain("LanguageToggle");
    expect(learner).toContain("ko-mobile-nav-theme");
    expect(learner).toContain('t("nav.dashboard")');
  });

  it("auth n’affiche pas le switch langue", () => {
    const files = [
      "app/login/page.tsx",
      "app/first-access/page.tsx",
      "app/auth/reset-access/page.tsx",
      "components/auth/LoginForm.tsx",
      "components/auth/FirstAccessForm.tsx",
      "components/auth/ResetAccessForm.tsx",
      "components/auth/LoginPageView.tsx",
      "components/auth/FirstAccessPageView.tsx",
      "components/auth/ResetAccessPageView.tsx",
    ];
    for (const file of files) {
      expect(readSrc(file), file).not.toContain("LanguageToggle");
    }
  });

  it("ThemeToggle traduit Mode sombre via t()", () => {
    const src = readSrc("components/theme/ThemeToggle.tsx");
    expect(src).toContain('t("common.darkMode")');
    expect(src).toContain('role="switch"');
    expect(src).not.toContain("locale ===");
  });

  it("dark mode intact : tokens, ThemeProvider, pas de remap global", () => {
    const css = readSrc("app/globals.css");
    expect(css).toContain(".ko-lang-toggle");
    expect(css).toContain(".ko-lang-toggle-option[aria-checked=\"true\"]");
    expect(css).toContain("background: var(--brand)");
    expect(css).toContain("color: var(--text-secondary)");
    expect(css).toContain(".ko-theme-toggle");
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).not.toMatch(/html\[data-theme="dark"\]\s+\.bg-white\s*\{/);
    const provider = readSrc("components/theme/ThemeProvider.tsx");
    expect(provider).toContain("THEME_STORAGE_KEY");
    expect(provider).toContain("data-theme");
  });

  it("aucune mutation backend / auth / deterrent", () => {
    const files = [
      "lib/i18n/storage.ts",
      "lib/i18n/fr.ts",
      "lib/i18n/en.ts",
      "lib/i18n/translate.ts",
      "lib/i18n/format-date.ts",
      "components/i18n/LanguageProvider.tsx",
      "components/i18n/LanguageToggle.tsx",
    ];
    for (const file of files) {
      const src = readSrc(file);
      expect(src, file).not.toContain("supabase");
      expect(src, file).not.toContain("app/api");
      expect(src, file).not.toContain("learnworlds");
      expect(src, file).not.toContain("navigator.language");
    }
    const deterrent = readSrc(
      "components/security/ClientInspectionDeterrent.tsx",
    );
    expect(deterrent).toContain("isInspectionShortcut");
    expect(deterrent).not.toContain("useLanguage");
  });
});
