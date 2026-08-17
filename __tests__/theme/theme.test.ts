import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THEME_BOOTSTRAP_SCRIPT,
  THEME_STORAGE_KEY,
  isThemeChoice,
  resolveTheme,
} from "@/lib/theme/storage";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("thème — résolution et persistance", () => {
  it("clé localStorage officielle", () => {
    expect(THEME_STORAGE_KEY).toBe("ko-predict-theme");
  });

  it("isThemeChoice n’accepte que light | dark", () => {
    expect(isThemeChoice("light")).toBe(true);
    expect(isThemeChoice("dark")).toBe(true);
    expect(isThemeChoice("system")).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
    expect(isThemeChoice("")).toBe(false);
  });

  it("sans choix utilisateur : suit le système", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(undefined, false)).toBe("light");
    expect(resolveTheme("invalid", true)).toBe("dark");
  });

  it("choix stocké : light ou dark, ignore le système", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("thème — anti-FOUC et câblage", () => {
  it("script bootstrap lit la clé et pose data-theme", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("data-theme");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("localStorage.getItem");
  });

  it("layout racine : script + ThemeProvider + suppressHydrationWarning", () => {
    const src = readSrc("app/layout.tsx");
    expect(src).toContain("THEME_BOOTSTRAP_SCRIPT");
    expect(src).toContain("ThemeProvider");
    expect(src).toContain("suppressHydrationWarning");
    expect(src).not.toMatch(/app\/api/);
  });

  it("tokens light/dark via html[data-theme]", () => {
    const css = readSrc("app/globals.css");
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain("--background: #0b1524");
    expect(css).toContain("--sidebar: #0e1a2c");
    expect(css).toContain("--surface: #111c2e");
    expect(css).toContain("--text-primary");
    expect(css).toContain("--brand");
    expect(css).toContain(".ko-theme-toggle");
    expect(css).toContain(":focus-visible");
  });

  it("pas de remap Tailwind global hors shells", () => {
    const css = readSrc("app/globals.css");
    expect(css).not.toMatch(/html\[data-theme="dark"\]\s+\.bg-white\s*\{/);
    expect(css).toContain(
      'html[data-theme="dark"] .ko-admin-shell .bg-white',
    );
    expect(css).toContain(
      'html[data-theme="dark"] .ko-dash-shell .bg-white',
    );
    expect(css).toContain(
      'html[data-theme="dark"] .ko-btn-blue',
    );
  });

  it("auth / landing conservent leurs fonds dédiés", () => {
    const css = readSrc("app/globals.css");
    expect(css).toContain(".ko-auth-bg");
    expect(css).toContain(".ko-hero-bg");
    expect(css).toMatch(/--hero-from:\s*#0b1f2a/);
    expect(css).not.toMatch(
      /html\[data-theme="dark"\][^{]*\{[^}]*--hero-from:/,
    );
  });
});

describe("thème — switch Admin + Apprenant", () => {
  it("ThemeToggle : Mode sombre via t() + switch accessible", () => {
    const src = readSrc("components/theme/ThemeToggle.tsx");
    expect(src).toContain('t("common.darkMode")');
    expect(src).toContain('role="switch"');
    expect(src).toContain("aria-checked");
    expect(src).toContain("aria-label={label}");
  });

  it("ThemeProvider mémorise light|dark et suit le système tant qu’aucun choix", () => {
    const src = readSrc("components/theme/ThemeProvider.tsx");
    expect(src).toContain("THEME_STORAGE_KEY");
    expect(src).toContain("localStorage.setItem");
    expect(src).toContain("prefers-color-scheme: dark");
    expect(src).toContain("hasChoice");
    expect(src).not.toContain("location.reload");
  });

  it("sidebar + menu mobile admin", () => {
    const src = readSrc("components/admin/AdminHubLayout.tsx");
    expect(src).toContain("ThemeToggle");
    expect(src).toContain("ko-admin-mobile-nav-theme");
    expect(src).toContain("ko-admin-sidebar");
  });

  it("sidebar + menu mobile apprenant", () => {
    const src = readSrc("components/dashboard/LearnerHubLayout.tsx");
    expect(src).toContain("ThemeToggle");
    expect(src).toContain("ko-mobile-nav-theme");
    expect(src).toContain("ko-dash-sidebar");
  });

  it("auth n’embarque pas le switch", () => {
    const login = readSrc("components/auth/LoginForm.tsx");
    expect(login).not.toContain("ThemeToggle");
    const layout = readSrc("app/layout.tsx");
    expect(layout).not.toMatch(/ThemeToggle/);
  });
});

describe("thème — graphiques branchés sur tokens", () => {
  it("jauges et courbes utilisent var(--…)", () => {
    const files = [
      "components/dashboard/DashboardRingsCard.tsx",
      "components/dashboard/LearnerStatRings.tsx",
      "components/admin/RingProgress.tsx",
      "components/admin/ReadinessHistoryChart.tsx",
      "components/admin/PaceActivityBars.tsx",
      "components/plan/PlanCycleCurve.tsx",
      "components/dashboard/SchoolHeroCurve.tsx",
      "components/dashboard/SchoolCharts.tsx",
    ];
    for (const file of files) {
      const src = readSrc(file);
      expect(src, file).toMatch(
        /var\(--(brand|accent|border|surface|success|info|text-secondary|admin-blue)|ko-pace-bar/,
      );
    }
  });
});
