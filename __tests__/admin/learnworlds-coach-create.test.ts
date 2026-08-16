import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));

import { resolveKoCoachCreationConflict } from "@/lib/admin/learnworlds-coach-conflicts";
import { createLearnWorldsCoach } from "@/lib/admin/learnworlds-coach-create";
import { evaluateAutomaticRoleChange } from "@/lib/auth/role-guards";
import type { LearnWorldsUser } from "@/types/learnworlds";

afterEach(() => {
  vi.restoreAllMocks();
});

function lwInstructor(
  overrides: Partial<LearnWorldsUser> = {},
): LearnWorldsUser {
  return {
    id: "lw_inst_1",
    email: "coach@example.com",
    username: "coach",
    firstName: "Ada",
    lastName: "Lovelace",
    tags: [],
    customFields: {},
    role: {
      level: "instructor",
      name: "Instructor",
      isInstructor: true,
      isAdmin: false,
    },
    createdAt: null,
    lastLoginAt: null,
    ...overrides,
  };
}

describe("resolveKoCoachCreationConflict", () => {
  it("aucun compte → allow_create", () => {
    expect(
      resolveKoCoachCreationConflict({
        profile: null,
        authExists: false,
        hasStudentRow: false,
      }),
    ).toEqual({ action: "allow_create" });
  });

  it("déjà coach ACTIVE → already_coach", () => {
    const r = resolveKoCoachCreationConflict({
      profile: {
        id: "p1",
        role: "coach",
        accountStatus: "ACTIVE",
      },
      authExists: true,
      hasStudentRow: false,
    });
    expect(r.action).toBe("already_coach");
  });

  it("student → bloqué", () => {
    const r = resolveKoCoachCreationConflict({
      profile: { id: "p1", role: "student", accountStatus: "ACTIVE" },
      authExists: true,
      hasStudentRow: true,
    });
    expect(r).toMatchObject({
      action: "block",
      code: "existing_student",
      auditEvent: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
    });
  });

  it("admin → bloqué sans rétrogradation", () => {
    expect(
      resolveKoCoachCreationConflict({
        profile: { id: "p1", role: "admin", accountStatus: "ACTIVE" },
        authExists: true,
        hasStudentRow: false,
      }),
    ).toMatchObject({
      action: "block",
      code: "existing_admin",
      auditEvent: "LEARNWORLDS_COACH_ROLE_CONFLICT",
    });
  });

  it("super_admin → bloqué", () => {
    expect(
      resolveKoCoachCreationConflict({
        profile: { id: "p1", role: "super_admin", accountStatus: "ACTIVE" },
        authExists: true,
        hasStudentRow: false,
      }),
    ).toMatchObject({
      action: "block",
      code: "existing_super_admin",
    });
  });

  it("DISABLED → bloqué", () => {
    expect(
      resolveKoCoachCreationConflict({
        profile: { id: "p1", role: "coach", accountStatus: "DISABLED" },
        authExists: true,
        hasStudentRow: false,
      }),
    ).toMatchObject({ action: "block", code: "existing_disabled" });
  });

  it("PENDING_ACTIVATION → bloqué (ne pas recréer)", () => {
    expect(
      resolveKoCoachCreationConflict({
        profile: {
          id: "p1",
          role: "coach",
          accountStatus: "PENDING_ACTIVATION",
        },
        authExists: true,
        hasStudentRow: false,
      }),
    ).toMatchObject({ action: "block", code: "existing_pending" });
  });
});

describe("createLearnWorldsCoach", () => {
  const actorId = "sa-1";

  it("instructor + aucun compte KO → création coach via createTeamMember", async () => {
    const createTeamMemberFn = vi.fn(async () => ({
      ok: true as const,
      profileId: "new-coach",
      email: "coach@example.com",
      role: "coach" as const,
      activationCode: "CODE123",
      expiresAt: "2099-01-01T00:00:00.000Z",
    }));
    const audit = vi.fn(async () => undefined);

    const result = await createLearnWorldsCoach({
      email: "  Coach@Example.COM ",
      actorId,
      getUserByEmail: async () => lwInstructor(),
      loadKoPresenceFn: async () => ({
        profile: null,
        authExists: false,
        hasStudentRow: false,
      }),
      profileHasStudentRowFn: async () => false,
      createTeamMemberFn,
      recordAuditFn: audit,
    });

    expect(result.ok).toBe(true);
    if (result.ok && result.created) {
      expect(result.role).toBe("coach");
      expect(result.profileId).toBe("new-coach");
      expect(result.activationCode).toBe("CODE123");
    }
    expect(createTeamMemberFn).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "coach@example.com",
        role: "coach",
        firstName: "Ada",
        lastName: "Lovelace",
        actorId,
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LEARNWORLDS_COACH_CREATED",
        authUserId: "new-coach",
      }),
    );
    const auditPayload = JSON.stringify(audit.mock.calls);
    expect(auditPayload.toLowerCase()).not.toContain("token");
    expect(auditPayload).not.toContain("CODE123");
  });

  it("coach existant → no-op", async () => {
    const createTeamMemberFn = vi.fn();
    const result = await createLearnWorldsCoach({
      email: "coach@example.com",
      actorId,
      getUserByEmail: async () => lwInstructor(),
      loadKoPresenceFn: async () => ({
        profile: {
          id: "existing",
          role: "coach",
          accountStatus: "ACTIVE",
        },
        authExists: true,
        hasStudentRow: false,
      }),
      createTeamMemberFn,
      recordAuditFn: vi.fn(),
    });
    expect(result).toMatchObject({
      ok: true,
      created: false,
      alreadyCoach: true,
      profileId: "existing",
    });
    expect(createTeamMemberFn).not.toHaveBeenCalled();
  });

  it("student existant → bloqué + audit", async () => {
    const audit = vi.fn(async () => undefined);
    const result = await createLearnWorldsCoach({
      email: "learner@example.com",
      actorId,
      getUserByEmail: async () =>
        lwInstructor({ email: "learner@example.com" }),
      loadKoPresenceFn: async () => ({
        profile: {
          id: "stu",
          role: "student",
          accountStatus: "ACTIVE",
        },
        authExists: true,
        hasStudentRow: true,
      }),
      createTeamMemberFn: vi.fn(),
      recordAuditFn: audit,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("existing_student");
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
      }),
    );
  });

  it("admin existant → bloqué", async () => {
    const result = await createLearnWorldsCoach({
      email: "admin@example.com",
      actorId,
      getUserByEmail: async () => lwInstructor({ email: "admin@example.com" }),
      loadKoPresenceFn: async () => ({
        profile: { id: "a1", role: "admin", accountStatus: "ACTIVE" },
        authExists: true,
        hasStudentRow: false,
      }),
      createTeamMemberFn: vi.fn(),
      recordAuditFn: vi.fn(),
    });
    expect(result).toMatchObject({ ok: false, code: "existing_admin" });
  });

  it("super_admin existant → bloqué", async () => {
    const result = await createLearnWorldsCoach({
      email: "sa@example.com",
      actorId,
      getUserByEmail: async () => lwInstructor({ email: "sa@example.com" }),
      loadKoPresenceFn: async () => ({
        profile: { id: "s1", role: "super_admin", accountStatus: "ACTIVE" },
        authExists: true,
        hasStudentRow: false,
      }),
      createTeamMemberFn: vi.fn(),
      recordAuditFn: vi.fn(),
    });
    expect(result).toMatchObject({ ok: false, code: "existing_super_admin" });
  });

  it("DISABLED → bloqué", async () => {
    const result = await createLearnWorldsCoach({
      email: "x@example.com",
      actorId,
      getUserByEmail: async () => lwInstructor({ email: "x@example.com" }),
      loadKoPresenceFn: async () => ({
        profile: { id: "d1", role: "student", accountStatus: "DISABLED" },
        authExists: true,
        hasStudentRow: false,
      }),
      createTeamMemberFn: vi.fn(),
      recordAuditFn: vi.fn(),
    });
    expect(result).toMatchObject({ ok: false, code: "existing_disabled" });
  });

  it("PENDING → bloqué", async () => {
    const result = await createLearnWorldsCoach({
      email: "p@example.com",
      actorId,
      getUserByEmail: async () => lwInstructor({ email: "p@example.com" }),
      loadKoPresenceFn: async () => ({
        profile: {
          id: "p1",
          role: "coach",
          accountStatus: "PENDING_ACTIVATION",
        },
        authExists: true,
        hasStudentRow: false,
      }),
      createTeamMemberFn: vi.fn(),
      recordAuditFn: vi.fn(),
    });
    expect(result).toMatchObject({ ok: false, code: "existing_pending" });
  });

  it("LW user → bloqué", async () => {
    const result = await createLearnWorldsCoach({
      email: "user@example.com",
      actorId,
      getUserByEmail: async () =>
        lwInstructor({
          email: "user@example.com",
          role: {
            level: "user",
            name: "User",
            isInstructor: false,
            isAdmin: false,
          },
        }),
      createTeamMemberFn: vi.fn(),
      recordAuditFn: vi.fn(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_eligible");
  });

  it("LW admin → bloqué (pas de création V1)", async () => {
    const result = await createLearnWorldsCoach({
      email: "lwadmin@example.com",
      actorId,
      getUserByEmail: async () =>
        lwInstructor({
          email: "lwadmin@example.com",
          role: {
            level: "admin",
            name: "Admin",
            isInstructor: false,
            isAdmin: true,
          },
        }),
      createTeamMemberFn: vi.fn(),
      recordAuditFn: vi.fn(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("eligible_admin_override");
  });

  it("client falsifie instructor → serveur re-fetch et refuse", async () => {
    const createTeamMemberFn = vi.fn();
    const result = await createLearnWorldsCoach({
      email: "user@example.com",
      actorId,
      // Serveur voit un user, pas un instructor — même si le client prétend le contraire.
      getUserByEmail: async () =>
        lwInstructor({
          role: {
            level: "user",
            name: "User",
            isInstructor: false,
            isAdmin: false,
          },
        }),
      createTeamMemberFn,
      recordAuditFn: vi.fn(),
    });
    expect(result.ok).toBe(false);
    expect(createTeamMemberFn).not.toHaveBeenCalled();
  });

  it("aucune ligne students créée (garde post-création)", async () => {
    const result = await createLearnWorldsCoach({
      email: "coach@example.com",
      actorId,
      getUserByEmail: async () => lwInstructor(),
      loadKoPresenceFn: async () => ({
        profile: null,
        authExists: false,
        hasStudentRow: false,
      }),
      profileHasStudentRowFn: async () => false,
      createTeamMemberFn: async () => ({
        ok: true,
        profileId: "c1",
        email: "coach@example.com",
        role: "coach",
        activationCode: "X",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
      recordAuditFn: vi.fn(),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.created) {
      expect(result.profileId).toBe("c1");
    }
  });
});

describe("sécurité route create-coach + protection sync/webhook", () => {
  it("route : SA + AAL2 + email seul ; pas de rôle client", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "app/api/admin/team/learnworlds/create-coach/route.ts",
      ),
      "utf8",
    );
    expect(src).toMatch(/requirePermissionApi/);
    expect(src).toMatch(/canManageTeam/);
    expect(src).toMatch(/requireLearnWorldsApi/);
    expect(src).toMatch(/createLearnWorldsCoach/);
    expect(src).toMatch(/email/);
    expect(src).not.toMatch(/roleLevel|is_instructor|role:\s*[\"']coach[\"']/);
    expect(src).not.toMatch(/LEARNWORLDS_CLIENT_SECRET|access_token/);
  });

  it("non-SA / AAL1 : même guard que team (canManageTeam + assertSuperAdminAal2Api)", () => {
    const requireSrc = readFileSync(
      join(process.cwd(), "lib/admin/require-admin-api.ts"),
      "utf8",
    );
    expect(requireSrc).toMatch(/assertSuperAdminAal2Api/);
    const permSrc = readFileSync(
      join(process.cwd(), "lib/auth/permissions.ts"),
      "utf8",
    );
    expect(permSrc).toMatch(
      /export function canManageTeam[\s\S]*isSuperAdmin/,
    );
  });

  it("sync/webhook ne modifient toujours aucun rôle (guards + mapping LW null)", () => {
    for (const source of ["learnworlds_sync", "webhook", "cron"] as const) {
      expect(
        evaluateAutomaticRoleChange({
          currentRole: "coach",
          proposedRole: "student",
          source,
        }).allowed,
      ).toBe(false);
      expect(
        evaluateAutomaticRoleChange({
          currentRole: "admin",
          proposedRole: "coach",
          source,
        }).allowed,
      ).toBe(false);
    }
    const syncSrc = readFileSync(
      join(process.cwd(), "lib/learnworlds/sync.ts"),
      "utf8",
    );
    expect(syncSrc).toMatch(/Ne jamais toucher role/);
    expect(syncSrc).not.toMatch(/role:\s*[\"']coach[\"']/);
  });
});
