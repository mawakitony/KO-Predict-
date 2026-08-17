import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { formatDate, formatDateShort, formatDateTime } from "@/lib/i18n/format-date";
import { fr } from "@/lib/i18n/fr";
import {
  learnerGuideBodyKey,
  learnerGuideCtaKey,
  learnerGuideTitleKey,
  paceKey,
  planTaskTitleKey,
  predictionIssueKey,
  riskKey,
} from "@/lib/i18n/labels";
import { collectMessageKeys, translate } from "@/lib/i18n/translate";
import { formatSyncRelative } from "@/lib/learning/format";
import { PASSWORD_RESET_CODE_GENERIC_ERROR } from "@/lib/auth/password-reset-constants";
import { LEARNER_GUIDE_KEYS } from "@/lib/learner/guides";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("i18n learner — dictionnaires FR/EN", () => {
  it("FR et EN restent alignés", () => {
    expect(collectMessageKeys(en)).toEqual(collectMessageKeys(fr));
  });

  it("dashboard, formation, plan, messages, profil", () => {
    expect(translate("fr", "learner.dashboardTitle")).toBe("Rapport de parcours");
    expect(translate("en", "learner.dashboardTitle")).toBe("Learning report");
    expect(translate("fr", "learner.learningTitle")).toContain("progression");
    expect(translate("en", "learner.learningTitle")).toMatch(/progress/i);
    expect(translate("fr", "learner.planTitle")).toContain("plan");
    expect(translate("en", "learner.planTitle")).toMatch(/plan/i);
    expect(translate("fr", "learner.messagesTitle")).toContain("Messages");
    expect(translate("en", "learner.messages.emptyTitle")).toMatch(/reminder|No /i);
    expect(translate("fr", "learner.profileTitle")).toBe("Mon profil");
    expect(translate("fr", "learner.dayMinus", { n: 12 })).toBe("J-12");
    expect(translate("en", "learner.dayMinus", { n: 12 })).toBe("D-12");
    expect(translate("fr", "learner.unitPerWeek")).toBe("/sem.");
    expect(translate("en", "learner.unitPerWeek")).toBe("/wk");
    expect(translate("fr", "chrome.profilePrefsStaff")).toMatch(/LearnWorlds/);
    expect(translate("en", "chrome.profilePrefsStaff")).toMatch(/LearnWorlds/);
  });

  it("guides contextuels FR/EN", () => {
    for (const key of LEARNER_GUIDE_KEYS) {
      const titleFr = translate("fr", learnerGuideTitleKey(key));
      const titleEn = translate("en", learnerGuideTitleKey(key));
      expect(titleFr.length).toBeGreaterThan(4);
      expect(titleEn.length).toBeGreaterThan(4);
      expect(titleFr).not.toMatch(/LearnWorlds/i);
      expect(titleEn).not.toMatch(/LearnWorlds/i);
      expect(translate("fr", learnerGuideBodyKey(key))).not.toMatch(
        /LearnWorlds/i,
      );
      expect(translate("en", learnerGuideCtaKey(key)).length).toBeGreaterThan(2);
    }
  });

  it("auth chrome FR/EN", () => {
    expect(translate("fr", "auth.loginTitle")).toBe("Connexion");
    expect(translate("en", "auth.loginTitle")).toBe("Sign in");
    expect(translate("fr", "auth.firstAccessTitle")).toBe("Première connexion");
    expect(translate("en", "auth.firstAccessTitle")).toBe("First sign-in");
    expect(translate("fr", "auth.resetTitle")).toBe("Réinitialiser l’accès");
    expect(translate("en", "auth.resetTitle")).toBe("Reset access");
  });

  it("aucune mention LearnWorlds dans learner.*", () => {
    expect(JSON.stringify(fr.learner)).not.toMatch(/LearnWorlds/i);
    expect(JSON.stringify(en.learner)).not.toMatch(/LearnWorlds/i);
    expect(JSON.stringify(fr.auth)).not.toMatch(/LearnWorlds/i);
    expect(JSON.stringify(en.auth)).not.toMatch(/LearnWorlds/i);
  });
});

describe("i18n learner — dates et labels métier", () => {
  it("dates visibles FR/EN", () => {
    expect(formatDate("2026-09-26", "fr")).toBe("26 septembre 2026");
    expect(formatDate("2026-09-26", "en")).toBe("September 26, 2026");
    expect(formatDateShort("2026-09-26", "fr")).toContain("sept");
    expect(formatDateTime("2026-09-26T10:00:00", "en")).toContain(" at ");
  });

  it("sync relative traduit sans LearnWorlds", () => {
    const recent = new Date(Date.now() - 12 * 60_000).toISOString();
    expect(formatSyncRelative(recent, "fr")).toContain("plateforme WOLOYEM");
    expect(formatSyncRelative(recent, "en")).toContain("WOLOYEM platform");
    expect(formatSyncRelative(recent, "fr")).not.toMatch(/LearnWorlds/i);
    expect(formatSyncRelative(recent, "en")).not.toMatch(/LearnWorlds/i);
  });

  it("risque / rythme / issues via clés, codes internes inchangés", () => {
    expect(riskKey("GREEN")).toBe("risk.green");
    expect(paceKey("ON_TRACK")).toBe("pace.onTrack");
    expect(predictionIssueKey("MISSING_TARGET_DATE")).toBe(
      "learner.issue.missingDate",
    );
    expect(planTaskTitleKey("ACTIVITIES")).toBe("plan.taskTitle.activities");
    expect(translate("en", "risk.green")).not.toBe(translate("fr", "risk.green"));
    expect(translate("en", "pace.onTrack")).not.toBe(
      translate("fr", "pace.onTrack"),
    );
  });
});

describe("i18n learner — câblage surfaces", () => {
  it("hub apprenant traduit titres et dates", () => {
    const src = readSrc("components/dashboard/LearnerHubLayout.tsx");
    expect(src).toContain('t("learner.dashboardTitle")');
    expect(src).toContain("formatDate(examDate, locale)");
    expect(src).toContain("formatSyncRelative(recordedAt, locale)");
    expect(src).toContain("LanguageToggle");
    expect(src).not.toContain("locale === \"fr\" ?");
  });

  it("dashboard / formation / plan / messages / profil", () => {
    expect(readSrc("app/dashboard/page.tsx")).toContain('page="dashboard"');
    expect(readSrc("app/dashboard/page.tsx")).toContain(
      'messageKey="learner.disclaimer"',
    );
    expect(readSrc("components/plan/WorkPlanDetail.tsx")).toContain(
      "t(paceView.valueKey)",
    );
    expect(readSrc("app/learning/page.tsx")).toContain('page="learning"');
    expect(readSrc("app/plan/page.tsx")).toContain('page="plan"');
    expect(readSrc("components/plan/WorkPlanDetail.tsx")).toContain(
      "t(planTaskTitleKey",
    );
    expect(readSrc("app/messages/page.tsx")).toContain('page="messages"');
    expect(readSrc("components/messages/LearnerMessagesBoard.tsx")).toContain(
      't("learner.messages.emptyTitle")',
    );
    expect(readSrc("app/profile/page.tsx")).toContain('page="profile"');
    expect(readSrc("app/profile/page.tsx")).toContain("chrome.profilePrefsStaff");
    expect(readSrc("components/learner/LearnerGuideModal.tsx")).toContain(
      "learnerGuideTitleKey",
    );
    expect(readSrc("components/dashboard/LearnerEstimationPopup.tsx")).toContain(
      't("learner.estimationTitle")',
    );
  });

  it("auth chrome via t(), erreurs serveur inchangées", () => {
    expect(readSrc("components/auth/LoginPageView.tsx")).toContain(
      't("auth.loginTitle")',
    );
    expect(readSrc("components/auth/FirstAccessPageView.tsx")).toContain(
      't("auth.firstAccessTitle")',
    );
    expect(readSrc("components/auth/ResetAccessPageView.tsx")).toContain(
      't("auth.resetTitle")',
    );
    expect(readSrc("components/auth/LoginForm.tsx")).toContain("{state.error}");
    expect(readSrc("components/auth/FirstAccessForm.tsx")).toContain(
      "json?.error ?? t(\"auth.verifyFail\")",
    );
    expect(readSrc("components/auth/ResetAccessForm.tsx")).toContain(
      "json?.error ?? PASSWORD_RESET_CODE_GENERIC_ERROR",
    );
    expect(PASSWORD_RESET_CODE_GENERIC_ERROR).toBe("Code incorrect ou expiré.");
    expect(readSrc("lib/auth/password-reset-constants.ts")).toContain(
      "Code incorrect ou expiré.",
    );
  });

  it("plan persisté non muté — titres affichés via t(task.type)", () => {
    const detail = readSrc("components/plan/WorkPlanDetail.tsx");
    expect(detail).toContain("t(planTaskTitleKey(task.type))");
    expect(detail).not.toMatch(/plan\.title\s*=/);
    expect(detail).not.toMatch(/task\.title\s*=/);
    const build = readSrc("lib/planning/work-plan/build-tasks.ts");
    expect(build).toContain('title: "Continuer votre progression"');
    expect(build).toContain("LEARNER_COPY.taskActivitiesStartup");
  });

  it("dark mode intact sur les surfaces learner/auth", () => {
    expect(readSrc("components/theme/ThemeToggle.tsx")).toContain(
      't("common.darkMode")',
    );
    expect(readSrc("components/dashboard/LearnerHubLayout.tsx")).toContain(
      "ThemeToggle",
    );
    expect(readSrc("components/auth/LoginPageView.tsx")).not.toContain(
      "ThemeToggle",
    );
    expect(readSrc("app/globals.css")).toContain('html[data-theme="dark"]');
  });
});
