import { describe, expect, it } from "vitest";
import {
  buildLearnWorldsProfileIdentityUpdate,
  evaluateAutomaticRoleChange,
  isStaffProtectedFromLearnerActivation,
  koRoleFromLearnWorldsAdminFlags,
} from "@/lib/auth/role-guards";
import { parseLearnWorldsWebhookPayload } from "@/lib/learnworlds/webhooks/parse";
import { isSyncableActiveStudent } from "@/lib/cron/sync-learnworlds-helpers";

describe("role-guards — anti-rétrogradation automatique", () => {
  it("super_admin → student bloqué (activate_learner)", () => {
    const result = evaluateAutomaticRoleChange({
      currentRole: "super_admin",
      proposedRole: "student",
      source: "activate_learner",
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.auditEvent).toBe("SUPER_ADMIN_ROLE_CHANGE_BLOCKED");
      expect(result.currentRole).toBe("super_admin");
      expect(result.proposedRole).toBe("student");
    }
  });

  it("super_admin → admin/coach bloqué (sync / webhook / cron)", () => {
    for (const source of [
      "learnworlds_sync",
      "webhook",
      "cron",
      "first_access",
    ] as const) {
      for (const proposed of ["admin", "coach", "student"] as const) {
        const result = evaluateAutomaticRoleChange({
          currentRole: "super_admin",
          proposedRole: proposed,
          source,
        });
        expect(result.allowed).toBe(false);
        if (!result.allowed) {
          expect(result.auditEvent).toBe("SUPER_ADMIN_ROLE_CHANGE_BLOCKED");
        }
      }
    }
  });

  it("admin/coach → student bloqué (activate_learner)", () => {
    for (const current of ["admin", "coach"] as const) {
      const result = evaluateAutomaticRoleChange({
        currentRole: current,
        proposedRole: "student",
        source: "activate_learner",
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.auditEvent).toBe("STAFF_ROLE_CHANGE_BLOCKED");
      }
    }
  });

  it("student → student autorisé", () => {
    expect(
      evaluateAutomaticRoleChange({
        currentRole: "student",
        proposedRole: "student",
        source: "activate_learner",
      }).allowed,
    ).toBe(true);
  });

  it("isStaffProtectedFromLearnerActivation", () => {
    expect(isStaffProtectedFromLearnerActivation("super_admin")).toBe(true);
    expect(isStaffProtectedFromLearnerActivation("admin")).toBe(true);
    expect(isStaffProtectedFromLearnerActivation("coach")).toBe(true);
    expect(isStaffProtectedFromLearnerActivation("student")).toBe(false);
  });
});

describe("LearnWorlds is_admin → jamais super_admin KO", () => {
  it("is_admin:true ne mappe pas vers super_admin", () => {
    expect(
      koRoleFromLearnWorldsAdminFlags({
        is_admin: true,
        roleLevel: "admin",
        roleName: "Admin",
      }),
    ).toBeNull();
  });

  it("instructor / user → null (pas d’élévation)", () => {
    expect(
      koRoleFromLearnWorldsAdminFlags({
        is_admin: false,
        is_instructor: true,
        roleLevel: "instructor",
      }),
    ).toBeNull();
    expect(
      koRoleFromLearnWorldsAdminFlags({
        is_admin: false,
        roleLevel: "user",
        roleName: "User",
      }),
    ).toBeNull();
  });
});

describe("sync / webhook — profil sans champ role", () => {
  it("buildLearnWorldsProfileIdentityUpdate n’inclut jamais role", () => {
    const update = buildLearnWorldsProfileIdentityUpdate({
      email: "a@b.com",
      firstName: "A",
      lastName: "B",
      existingFirstName: null,
      existingLastName: "B",
    });
    expect(update).toEqual({
      first_name: "A",
      last_name: "B",
      email: "a@b.com",
      updated_at: expect.any(String),
    });
    expect(update).not.toHaveProperty("role");
    expect(update).not.toHaveProperty("account_status");
  });

  it("super_admin n’est pas syncable par le cron (reste hors batch)", () => {
    expect(
      isSyncableActiveStudent({
        accountStatus: "ACTIVE",
        role: "super_admin",
        learnworldsUserId: "lw_sa",
      }),
    ).toBe(false);
  });

  it("webhook Automation ne fournit pas de rôle à appliquer", () => {
    const parsed = parseLearnWorldsWebhookPayload({
      user: {
        id: "lw_staff",
        email: "staff@example.com",
        username: "staff",
      },
      automation_name: "KO Predict sync",
      school: "woloyem",
    });
    expect(parsed.shouldSync).toBe(true);
    expect(parsed.learnworldsUserId).toBe("lw_staff");
    const user = parsed.payload.user as Record<string, unknown>;
    expect(user).not.toHaveProperty("role");
    expect(user).not.toHaveProperty("is_admin");
  });
});
