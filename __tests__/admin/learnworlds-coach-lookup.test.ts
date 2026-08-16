import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));

import {
  evaluateLearnWorldsCoachEligibility,
  mapLearnWorldsCoachLookupIdentity,
} from "@/lib/admin/learnworlds-coach-eligibility";
import { lookupLearnWorldsCoachByEmail } from "@/lib/admin/learnworlds-coach-lookup";
import { mapLearnWorldsUserRole } from "@/lib/learnworlds/mappers";
import type { LearnWorldsUser } from "@/types/learnworlds";

afterEach(() => {
  vi.restoreAllMocks();
});

function userWithRole(
  role: LearnWorldsUser["role"],
  overrides: Partial<LearnWorldsUser> = {},
): LearnWorldsUser {
  return {
    id: "lw_1",
    email: "coach@example.com",
    username: "coach",
    firstName: "Ada",
    lastName: "Lovelace",
    tags: [],
    customFields: {},
    role,
    createdAt: null,
    lastLoginAt: null,
    ...overrides,
  };
}

describe("mapLearnWorldsUserRole", () => {
  it("mappe level / name / flags depuis le payload LW", () => {
    expect(
      mapLearnWorldsUserRole({
        id: "x",
        email: "a@b.c",
        is_admin: false,
        is_instructor: true,
        role: { level: "instructor", name: "Instructor" },
      }),
    ).toEqual({
      level: "instructor",
      name: "Instructor",
      isInstructor: true,
      isAdmin: false,
    });
  });

  it("conserve role.name custom sans l’utiliser comme éligibilité", () => {
    const mapped = mapLearnWorldsUserRole({
      is_admin: true,
      is_instructor: false,
      role: { level: "admin", name: "SALES" },
    });
    expect(mapped.level).toBe("admin");
    expect(mapped.name).toBe("SALES");
    expect(mapped.isAdmin).toBe(true);
  });

  it("flags absents → false", () => {
    expect(
      mapLearnWorldsUserRole({ role: { level: "user", name: "User" } }),
    ).toEqual({
      level: "user",
      name: "User",
      isInstructor: false,
      isAdmin: false,
    });
  });
});

describe("evaluateLearnWorldsCoachEligibility", () => {
  it("NOT_FOUND si user null", () => {
    const r = evaluateLearnWorldsCoachEligibility(null);
    expect(r.status).toBe("NOT_FOUND");
    expect(r.canCreateCoachV1).toBe(false);
  });

  it("instructor réel → ELIGIBLE_INSTRUCTOR + canCreateCoachV1", () => {
    const r = evaluateLearnWorldsCoachEligibility(
      userWithRole({
        level: "instructor",
        name: "Instructor",
        isInstructor: true,
        isAdmin: false,
      }),
    );
    expect(r.status).toBe("ELIGIBLE_INSTRUCTOR");
    expect(r.canCreateCoachV1).toBe(true);
    if (r.status === "ELIGIBLE_INSTRUCTOR") {
      expect(r.coherenceOk).toBe(true);
    }
  });

  it("role.name custom n’ouvre pas l’éligibilité — seul level compte", () => {
    const r = evaluateLearnWorldsCoachEligibility(
      userWithRole({
        level: "user",
        name: "Instructor",
        isInstructor: false,
        isAdmin: false,
      }),
    );
    expect(r.status).toBe("NOT_ELIGIBLE");
    expect(r.canCreateCoachV1).toBe(false);
  });

  it("user → NOT_ELIGIBLE", () => {
    expect(
      evaluateLearnWorldsCoachEligibility(
        userWithRole({
          level: "user",
          name: "User",
          isInstructor: false,
          isAdmin: false,
        }),
      ),
    ).toMatchObject({
      status: "NOT_ELIGIBLE",
      canCreateCoachV1: false,
    });
  });

  it("admin → ELIGIBLE_ADMIN_OVERRIDE sans création V1", () => {
    const r = evaluateLearnWorldsCoachEligibility(
      userWithRole({
        level: "admin",
        name: "SALES",
        isInstructor: false,
        isAdmin: true,
      }),
    );
    expect(r.status).toBe("ELIGIBLE_ADMIN_OVERRIDE");
    expect(r.canCreateCoachV1).toBe(false);
  });

  it("is_admin true sans level admin → ADMIN_OVERRIDE", () => {
    const r = evaluateLearnWorldsCoachEligibility(
      userWithRole({
        level: "user",
        name: "User",
        isInstructor: false,
        isAdmin: true,
      }),
    );
    expect(r.status).toBe("ELIGIBLE_ADMIN_OVERRIDE");
    expect(r.canCreateCoachV1).toBe(false);
  });

  it("level instructor même si flag incohérent → éligible + coherenceOk false", () => {
    const r = evaluateLearnWorldsCoachEligibility(
      userWithRole({
        level: "instructor",
        name: "Instructor",
        isInstructor: false,
        isAdmin: false,
      }),
    );
    expect(r.status).toBe("ELIGIBLE_INSTRUCTOR");
    if (r.status === "ELIGIBLE_INSTRUCTOR") {
      expect(r.coherenceOk).toBe(false);
      expect(r.canCreateCoachV1).toBe(true);
    }
  });

  it("identity lookup n’expose pas de raw / token", () => {
    const identity = mapLearnWorldsCoachLookupIdentity(
      userWithRole(
        {
          level: "instructor",
          name: "Instructor",
          isInstructor: true,
          isAdmin: false,
        },
        { raw: { access_token: "secret", role: { level: "instructor" } } },
      ),
    );
    expect(identity).toEqual({
      learnworldsUserId: "lw_1",
      email: "coach@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      roleLevel: "instructor",
      roleName: "Instructor",
      isInstructor: true,
      isAdmin: false,
    });
    expect(JSON.stringify(identity).toLowerCase()).not.toContain("token");
    expect(JSON.stringify(identity)).not.toContain("secret");
  });
});

describe("lookupLearnWorldsCoachByEmail", () => {
  it("email normalisé (trim + lowercase) avant appel LW", async () => {
    const getByEmail = vi.fn(async (email: string) =>
      userWithRole(
        {
          level: "instructor",
          name: "Instructor",
          isInstructor: true,
          isAdmin: false,
        },
        { email },
      ),
    );

    const result = await lookupLearnWorldsCoachByEmail("  Coach@Example.COM ", {
      getUserByEmail: getByEmail,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe("coach@example.com");
      expect(result.eligibility.status).toBe("ELIGIBLE_INSTRUCTOR");
      expect(result.identity?.roleLevel).toBe("instructor");
    }
    expect(getByEmail).toHaveBeenCalledWith("coach@example.com");
  });

  it("absent → NOT_FOUND", async () => {
    const result = await lookupLearnWorldsCoachByEmail("missing@example.com", {
      getUserByEmail: async () => null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eligibility.status).toBe("NOT_FOUND");
      expect(result.identity).toBeNull();
    }
  });

  it("client ne peut pas imposer un rôle — le mapping vient du user LW injecté", async () => {
    const result = await lookupLearnWorldsCoachByEmail("user@example.com", {
      getUserByEmail: async () =>
        userWithRole({
          level: "user",
          name: "User",
          isInstructor: false,
          isAdmin: false,
        }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eligibility.status).toBe("NOT_ELIGIBLE");
      expect(result.eligibility.canCreateCoachV1).toBe(false);
    }
  });
});

describe("sécurité route lookup (source)", () => {
  it("route : SA + AAL2 + LearnWorlds ; email seul en entrée", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/admin/team/learnworlds/lookup/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/requirePermissionApi/);
    expect(src).toMatch(/canManageTeam/);
    expect(src).toMatch(/requireLearnWorldsApi/);
    expect(src).toMatch(/lookupLearnWorldsCoachByEmail/);
    expect(src).not.toMatch(/createTeamMember/);
    expect(src).not.toMatch(/role:\s*[\"']coach[\"']/);
    expect(src).not.toMatch(/LEARNWORLDS_CLIENT_SECRET|access_token/);
  });

  it("lookup serveur n’écrit aucun audit lookup réussi / aucun token", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/admin/learnworlds-coach-lookup.ts"),
      "utf8",
    );
    expect(src).toMatch(/getLearnWorldsUserByEmail/);
    expect(src).not.toMatch(/recordAccessAudit/);
    expect(src).not.toMatch(/createUser|createTeamMember/);
    expect(src).not.toMatch(/console\.(?:log|info|debug)/);
  });
});
