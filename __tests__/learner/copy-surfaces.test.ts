import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNER_COPY,
  LEARNER_DATA_UNAVAILABLE_MESSAGE,
  LEARNER_LAST_SYNC_LABEL,
} from "@/lib/learner/copy";
import { LEARNER_GUIDE_COPY, LEARNER_GUIDE_KEYS } from "@/lib/learner/guides";
import { formatSyncRelativeFr } from "@/lib/learning/format";
import { LEARNER_HISTORY_TEMPORARY_MESSAGE } from "@/lib/learning/lw-id";
import {
  ISSUE_LEARNER_MESSAGES,
  resolveLearnerRecommendedAction,
} from "@/lib/dashboard/learner-presentation";

const LEARNER_SURFACE_DIRS = [
  "app/dashboard",
  "app/learning",
  "app/plan",
  "app/messages",
  "components/dashboard",
  "components/learning",
  "components/plan",
  "components/profile",
  "components/messages",
  "components/learner",
  "lib/dashboard",
  "lib/learning",
  "lib/planning",
  "lib/learner",
];

const EXCLUDED = new Set([
  path.normalize("components/dashboard/SchoolHeroCurve.tsx"),
]);

function walk(dir: string, acc: string[] = []): string[] {
  const abs = path.join(process.cwd(), dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(rel, acc);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (EXCLUDED.has(path.normalize(rel))) continue;
    acc.push(rel);
  }
  return acc;
}

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

function quotedStrings(src: string): string[] {
  const out: string[] = [];
  const re = /(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    out.push(match[0]);
  }
  return out;
}

describe("copy apprenant — pas de LearnWorlds visible", () => {
  it("constantes centralisées", () => {
    expect(LEARNER_LAST_SYNC_LABEL).toContain("plateforme WOLOYEM");
    expect(LEARNER_LAST_SYNC_LABEL).not.toMatch(/LearnWorlds/i);
    expect(LEARNER_DATA_UNAVAILABLE_MESSAGE).toContain(
      "espace de formation WOLOYEM",
    );
    expect(LEARNER_DATA_UNAVAILABLE_MESSAGE).not.toMatch(/LearnWorlds/i);
    expect(LEARNER_HISTORY_TEMPORARY_MESSAGE).toBe(
      LEARNER_DATA_UNAVAILABLE_MESSAGE,
    );
    expect(JSON.stringify(LEARNER_COPY)).not.toMatch(/LearnWorlds/i);
    for (const key of LEARNER_GUIDE_KEYS) {
      expect(JSON.stringify(LEARNER_GUIDE_COPY[key])).not.toMatch(
        /LearnWorlds/i,
      );
    }
  });

  it("sync relative et messages pédagogiques", () => {
    const recent = new Date(Date.now() - 12 * 60_000).toISOString();
    expect(formatSyncRelativeFr(recent)).toContain("plateforme WOLOYEM");
    expect(formatSyncRelativeFr(recent)).not.toMatch(/LearnWorlds/i);
    expect(ISSUE_LEARNER_MESSAGES.TARGET_DATE_PASSED).not.toMatch(
      /LearnWorlds/i,
    );
    expect(ISSUE_LEARNER_MESSAGES.NO_REMAINING_WORK).not.toMatch(
      /LearnWorlds/i,
    );
    expect(
      resolveLearnerRecommendedAction({
        issues: ["MISSING_TARGET_DATE"],
        recommendedAction: null,
        readinessScore: null,
      }),
    ).not.toMatch(/LearnWorlds/i);
  });

  it("aucun littéral UI learner LearnWorlds dans les surfaces concernées", () => {
    const files = LEARNER_SURFACE_DIRS.flatMap((dir) => walk(dir));
    const offenders: string[] = [];
    for (const rel of files) {
      const src = stripComments(fs.readFileSync(path.join(process.cwd(), rel), "utf8"));
      for (const literal of quotedStrings(src)) {
        if (/LearnWorlds/.test(literal) && !/@\/lib\/learnworlds/.test(literal)) {
          offenders.push(`${rel}: ${literal.slice(0, 120)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("profil apprenant masque LearnWorlds, profil staff le conserve", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "app/profile/page.tsx"),
      "utf8",
    );
    expect(src).toContain('page="profile"');
    expect(src).toContain("chrome.profilePrefsStaff");
    expect(LEARNER_COPY.profileSubtitle).not.toMatch(/LearnWorlds/i);
    expect(src).toMatch(/chrome\.profilePrefsStaff/);
  });
});
