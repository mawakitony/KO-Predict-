import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { fr } from "@/lib/i18n/fr";
import { formatDate, formatDateShort, formatDateTime } from "@/lib/i18n/format-date";
import {
  accountStatusKey,
  planTaskTitleKey,
  roleKey,
} from "@/lib/i18n/labels";
import { collectMessageKeys, translate } from "@/lib/i18n/translate";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("i18n admin — labels métier", () => {
  it("statuts FR/EN sans changer les codes internes", () => {
    expect(accountStatusKey("ACTIVE")).toBe("status.active");
    expect(accountStatusKey("PENDING_ACTIVATION")).toBe("status.pending");
    expect(accountStatusKey("DISABLED")).toBe("status.disabled");
    expect(accountStatusKey("NOT_ACTIVATED")).toBe("status.notActivated");
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

  it("rôles FR/EN — codes student/coach/admin/super_admin inchangés", () => {
    expect(roleKey("student")).toBe("role.student");
    expect(roleKey("coach")).toBe("role.coach");
    expect(roleKey("admin")).toBe("role.admin");
    expect(roleKey("super_admin")).toBe("role.superAdmin");
    expect(translate("fr", "role.student")).toBe("Apprenant");
    expect(translate("en", "role.student")).toBe("Learner");
    expect(translate("fr", "role.coach")).toBe("Coach");
    expect(translate("en", "role.admin")).toBe("Administrator");
    expect(translate("fr", "role.superAdmin")).toBe("Super administrateur");
    expect(translate("en", "role.superAdmin")).toBe("Super administrator");
  });

  it("colonnes tableau et actions ligne", () => {
    expect(translate("fr", "admin.learners.colLearner")).toBe("Apprenant");
    expect(translate("en", "admin.learners.colLearner")).toBe("Learner");
    expect(translate("fr", "admin.learners.colAccess")).toBe("Accès");
    expect(translate("en", "admin.learners.colAccess")).toBe("Access");
    expect(translate("fr", "admin.learners.colAction")).toBe("Action");
    expect(translate("fr", "admin.learners.colEnrolled")).toBe("Inscription");
    expect(translate("en", "admin.learners.colEnrolled")).toBe("Enrolled");
    expect(translate("en", "common.disable")).toBe("Disable");
    expect(translate("fr", "common.disable")).toBe("Désactiver");
    expect(translate("fr", "common.reactivate")).toBe("Réactiver");
  });

  it("modals principales", () => {
    expect(translate("fr", "admin.modal.activationTitle")).toContain(
      "KO Predict™",
    );
    expect(translate("en", "admin.modal.copyCode")).toBe("Copy code");
    expect(translate("fr", "admin.modal.changeRoleTitle")).toBe(
      "Modifier le rôle",
    );
    expect(translate("en", "admin.team.confirmChange")).toBe("Confirm change");
    expect(translate("fr", "admin.team.promoteTitle")).toContain(
      "super administrateur",
    );
    expect(translate("en", "admin.team.addLwCoach")).toContain("LearnWorlds");
    expect(translate("fr", "admin.team.lwAuthTitle")).toContain("LearnWorlds");
    expect(translate("en", "admin.team.lwAuthTitle")).toContain("LearnWorlds");
  });

  it("équipe WOLOYEM et dashboard école", () => {
    expect(translate("fr", "admin.team.title")).toBe("Équipe WOLOYEM");
    expect(translate("en", "admin.team.title")).toBe("WOLOYEM team");
    expect(translate("fr", "admin.school.headline")).toContain("promotion");
    expect(translate("en", "admin.school.priorityTitle")).toBe(
      "Priority interventions",
    );
  });

  it("dates Admin FR/EN via Intl", () => {
    expect(formatDate("2026-08-17", "fr")).toBe("17 août 2026");
    expect(formatDate("2026-08-17", "en")).toBe("August 17, 2026");
    expect(formatDateShort("2026-08-17", "fr")).toBe("17 août");
    expect(formatDateTime("2026-08-17T15:30:00", "en")).toContain("August");
  });

  it("tâches plan : clé par type, pas le JSON persisté", () => {
    expect(planTaskTitleKey("ACTIVITIES")).toBe("plan.taskTitle.activities");
    expect(translate("en", "plan.taskTitle.targetDate")).toBe(
      "Set your exam date",
    );
  });
});

describe("i18n admin — câblage et non-régression", () => {
  it("FR et EN restent alignés", () => {
    expect(collectMessageKeys(en)).toEqual(collectMessageKeys(fr));
  });

  it("surfaces Admin passent par t() / formatDate", () => {
    const files = [
      "components/admin/StudentsTable.tsx",
      "components/admin/LearnWorldsRoster.tsx",
      "components/admin/TeamBoard.tsx",
      "components/admin/ActivationCodeModal.tsx",
      "components/admin/StudentProfileBoard.tsx",
      "components/admin/InterventionCenter.tsx",
      "components/dashboard/SchoolOverviewBoard.tsx",
      "components/account/AccountSecurityPanel.tsx",
      "components/admin/ChangeTeamRoleModal.tsx",
      "components/admin/AddLearnWorldsCoachModal.tsx",
    ];
    for (const file of files) {
      const src = readSrc(file);
      expect(src, file).toContain("useLanguage");
      expect(src, file).not.toContain("formatDateFr");
      expect(src, file).not.toContain("roleLabelFr");
    }
  });

  it("valeurs métier internes non réécrites", () => {
    const roster = readSrc("components/admin/LearnWorldsRoster.tsx");
    expect(roster).toContain('"ACTIVE"');
    expect(roster).toContain("PENDING_ACTIVATION");
    expect(roster).toContain("NOT_ACTIVATED");
    const roles = readSrc("lib/auth/roles.ts");
    expect(roles).toContain('"student"');
    expect(roles).toContain('"super_admin"');
    expect(roles).toContain("export function roleLabelFr");
  });

  it("dark mode intact", () => {
    const css = readSrc("app/globals.css");
    expect(css).toContain(".ko-theme-toggle");
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain(".ko-lang-toggle");
    const provider = readSrc("components/theme/ThemeProvider.tsx");
    expect(provider).toContain("THEME_STORAGE_KEY");
  });

  it("aucune mutation backend dans les helpers i18n", () => {
    for (const file of [
      "lib/i18n/labels.ts",
      "lib/i18n/fr.ts",
      "lib/i18n/en.ts",
    ]) {
      const src = readSrc(file);
      expect(src, file).not.toContain("from \"@/lib/supabase");
      expect(src, file).not.toContain("app/api");
    }
  });
});
