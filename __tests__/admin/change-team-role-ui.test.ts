import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MFA_AAL2_REQUIRED } from "@/lib/auth/mfa-aal";
import {
  canShowChangeTeamRoleAction,
  formatTeamRoleTransitionSummary,
  mapChangeTeamRoleApiError,
} from "@/lib/admin/team-role-ui";

describe("canShowChangeTeamRoleAction", () => {
  it("coach/admin ACTIVE non-self → oui", () => {
    expect(
      canShowChangeTeamRoleAction({
        role: "coach",
        accountStatus: "ACTIVE",
        isSelf: false,
      }),
    ).toBe(true);
    expect(
      canShowChangeTeamRoleAction({
        role: "admin",
        accountStatus: "ACTIVE",
        isSelf: false,
      }),
    ).toBe(true);
  });

  it("PENDING / DISABLED / SA / self / student → non", () => {
    expect(
      canShowChangeTeamRoleAction({
        role: "coach",
        accountStatus: "PENDING_ACTIVATION",
        isSelf: false,
      }),
    ).toBe(false);
    expect(
      canShowChangeTeamRoleAction({
        role: "admin",
        accountStatus: "DISABLED",
        isSelf: false,
      }),
    ).toBe(false);
    expect(
      canShowChangeTeamRoleAction({
        role: "super_admin",
        accountStatus: "ACTIVE",
        isSelf: false,
      }),
    ).toBe(false);
    expect(
      canShowChangeTeamRoleAction({
        role: "coach",
        accountStatus: "ACTIVE",
        isSelf: true,
      }),
    ).toBe(false);
    expect(
      canShowChangeTeamRoleAction({
        role: "student",
        accountStatus: "ACTIVE",
        isSelf: false,
      }),
    ).toBe(false);
  });
});

describe("formatTeamRoleTransitionSummary", () => {
  it("résume coach ↔ admin", () => {
    expect(formatTeamRoleTransitionSummary("coach", "admin")).toBe(
      "Coach → Administrateur",
    );
    expect(formatTeamRoleTransitionSummary("admin", "coach")).toBe(
      "Administrateur → Coach",
    );
  });
});

describe("mapChangeTeamRoleApiError", () => {
  it("détecte MFA_AAL2_REQUIRED", () => {
    const mapped = mapChangeTeamRoleApiError({
      status: 403,
      body: { reasonCode: MFA_AAL2_REQUIRED, error: "…" },
    });
    expect(mapped.needsMfaChallenge).toBe(true);
  });
});

describe("TeamBoard change-role UX", () => {
  it("remplace les boutons Admin/Coach directs par Modifier le rôle", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/TeamBoard.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Modifier le rôle/);
    expect(src).toMatch(/ChangeTeamRoleModal/);
    expect(src).toMatch(/canShowChangeTeamRoleAction/);
    expect(src).not.toMatch(/newRole: \"admin\"/);
    expect(src).not.toMatch(/newRole: \"coach\"/);
  });

  it("modal n’offre pas super_admin", () => {
    const src = readFileSync(
      join(process.cwd(), "components/admin/ChangeTeamRoleModal.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Confirmer le changement/);
    expect(src).not.toMatch(/super_admin/);
    expect(src).toMatch(/mapChangeTeamRoleApiError/);
    expect(src).toMatch(/\/auth\/mfa\/challenge/);
  });
});
