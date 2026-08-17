import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isInspectionShortcut,
  type InspectionKeyLike,
} from "@/components/security/ClientInspectionDeterrent";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

function key(
  partial: Partial<InspectionKeyLike> & Pick<InspectionKeyLike, "key">,
): InspectionKeyLike {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...partial,
  };
}

const AUTH_PAGES = [
  "app/page.tsx",
  "app/demo/page.tsx",
  "app/login/page.tsx",
  "app/first-access/page.tsx",
  "app/auth/reset-access/page.tsx",
  "app/auth/reset-password/page.tsx",
  "app/auth/mfa/setup/page.tsx",
  "app/auth/mfa/challenge/page.tsx",
  "app/access-disabled/page.tsx",
  "app/auth/finalize/page.tsx",
  "app/layout.tsx",
];

function listAuthComponentFiles(): string[] {
  const dir = join(process.cwd(), "components/auth");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
    .map((name) => `components/auth/${name}`);
}

describe("dissuasion inspection — raccourcis", () => {
  it("bloque F12 et les raccourcis DevTools interceptables", () => {
    expect(isInspectionShortcut(key({ key: "F12" }))).toBe(true);
    expect(
      isInspectionShortcut(key({ key: "i", ctrlKey: true, shiftKey: true })),
    ).toBe(true);
    expect(
      isInspectionShortcut(key({ key: "I", metaKey: true, shiftKey: true })),
    ).toBe(true);
    expect(
      isInspectionShortcut(key({ key: "j", ctrlKey: true, shiftKey: true })),
    ).toBe(true);
    expect(
      isInspectionShortcut(key({ key: "J", metaKey: true, shiftKey: true })),
    ).toBe(true);
    expect(
      isInspectionShortcut(key({ key: "c", ctrlKey: true, shiftKey: true })),
    ).toBe(true);
    expect(
      isInspectionShortcut(key({ key: "C", metaKey: true, shiftKey: true })),
    ).toBe(true);
    expect(isInspectionShortcut(key({ key: "u", ctrlKey: true }))).toBe(true);
    expect(isInspectionShortcut(key({ key: "U", metaKey: true }))).toBe(true);
  });

  it("ne bloque pas copier / coller / couper / tout sélectionner", () => {
    for (const letter of ["c", "v", "x", "a"] as const) {
      expect(
        isInspectionShortcut(key({ key: letter, ctrlKey: true })),
        `Ctrl+${letter}`,
      ).toBe(false);
      expect(
        isInspectionShortcut(key({ key: letter.toUpperCase(), metaKey: true })),
        `Cmd+${letter}`,
      ).toBe(false);
    }
  });

  it("ne bloque pas Tab ni la saisie courante", () => {
    expect(isInspectionShortcut(key({ key: "Tab" }))).toBe(false);
    expect(isInspectionShortcut(key({ key: "Tab", shiftKey: true }))).toBe(
      false,
    );
    expect(isInspectionShortcut(key({ key: "a" }))).toBe(false);
    expect(isInspectionShortcut(key({ key: "Enter" }))).toBe(false);
    expect(isInspectionShortcut(key({ key: "Backspace" }))).toBe(false);
    expect(isInspectionShortcut(key({ key: "i", shiftKey: true }))).toBe(false);
  });
});

describe("dissuasion inspection — listeners et cleanup", () => {
  it("installe contextmenu + keydown dans useEffect", () => {
    const src = readSrc("components/security/ClientInspectionDeterrent.tsx");
    expect(src).toContain("useEffect");
    expect(src).toContain('document.addEventListener("contextmenu"');
    expect(src).toContain('document.addEventListener("keydown"');
    expect(src).toContain("preventDefault");
  });

  it("retire les mêmes listeners au cleanup", () => {
    const src = readSrc("components/security/ClientInspectionDeterrent.tsx");
    expect(src).toMatch(
      /return\s*\(\)\s*=>\s*\{[\s\S]*removeEventListener\("contextmenu"[\s\S]*removeEventListener\("keydown"/,
    );
  });

  it("n’affiche pas de popup / toast et ne force pas user-select: none", () => {
    const src = readSrc("components/security/ClientInspectionDeterrent.tsx");
    expect(src).not.toMatch(/\balert\s*\(/);
    expect(src).not.toMatch(/\bconfirm\s*\(/);
    expect(src).not.toContain("toast");
    expect(src).not.toContain("window.alert");
    expect(src).not.toContain("user-select");
    expect(src).toContain("return null");
  });
});

describe("dissuasion inspection — câblage hubs / auth", () => {
  it("est monté dans AdminHubLayout et LearnerHubLayout", () => {
    const admin = readSrc("components/admin/AdminHubLayout.tsx");
    const learner = readSrc("components/dashboard/LearnerHubLayout.tsx");
    expect(admin).toContain("ClientInspectionDeterrent");
    expect(admin).toContain("<ClientInspectionDeterrent");
    expect(learner).toContain("ClientInspectionDeterrent");
    expect(learner).toContain("<ClientInspectionDeterrent");
  });

  it("est absent des parcours auth / landing / layout racine", () => {
    for (const file of AUTH_PAGES) {
      const src = readSrc(file);
      expect(src, file).not.toContain("ClientInspectionDeterrent");
    }
    for (const file of listAuthComponentFiles()) {
      const src = readSrc(file);
      expect(src, file).not.toContain("ClientInspectionDeterrent");
    }
  });

  it("aucune règle user-select: none dans les hubs ni le CSS global", () => {
    const files = [
      "components/security/ClientInspectionDeterrent.tsx",
      "components/admin/AdminHubLayout.tsx",
      "components/dashboard/LearnerHubLayout.tsx",
      "app/globals.css",
    ];
    for (const file of files) {
      expect(readSrc(file), file).not.toMatch(/user-select\s*:\s*none/);
    }
  });
});
