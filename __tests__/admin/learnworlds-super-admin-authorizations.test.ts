import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));

const mockRecordAudit = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth/access-audit", () => ({
  recordAccessAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import {
  createLearnWorldsSuperAdminAuthorization,
  getActiveAuthorizationByEmail,
  listLearnWorldsSuperAdminAuthorizations,
  revokeLearnWorldsSuperAdminAuthorization,
} from "@/lib/admin/learnworlds-super-admin-authorizations";
import type { LearnWorldsUser } from "@/types/learnworlds";

const ACTOR = "11111111-1111-1111-1111-111111111111";
const AUTH_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function lwUser(overrides: Partial<LearnWorldsUser> = {}): LearnWorldsUser {
  return {
    id: "lw_sa_1",
    email: "sa.lw@woloyem.com",
    username: "sa",
    firstName: "Sam",
    lastName: "Admin",
    tags: [],
    customFields: {},
    role: {
      level: "admin",
      name: "Admin",
      isInstructor: false,
      isAdmin: true,
    },
    createdAt: null,
    lastLoginAt: null,
    ...overrides,
  };
}

function actorSelect(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  };
}

describe("createLearnWorldsSuperAdminAuthorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAudit.mockResolvedValue(undefined);
  });

  it("crée une autorisation ACTIVE + audit ; pas de profiles.role", async () => {
    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (table === "profiles") {
        return actorSelect({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      // authorizations: getActive then insert
      const selectActive = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: AUTH_ID,
                email: "sa.lw@woloyem.com",
                learnworlds_user_id: "lw_sa_1",
                status: "ACTIVE",
                created_by: ACTOR,
                created_at: "2026-08-16T12:00:00.000Z",
                revoked_by: null,
                revoked_at: null,
                note: null,
              },
              error: null,
            }),
          }),
        }),
      };
      return selectActive;
    });

    const result = await createLearnWorldsSuperAdminAuthorization({
      email: "  SA.LW@WOLOYEM.COM ",
      actorId: ACTOR,
      getUserByEmail: async () => lwUser(),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.authorization.email).toBe("sa.lw@woloyem.com");
      expect(result.authorization.learnworldsUserId).toBe("lw_sa_1");
      expect(result.learnworldsRoleLevel).toBe("admin");
    }
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LEARNWORLDS_SUPER_ADMIN_AUTHORIZED",
        actorId: ACTOR,
        meta: expect.objectContaining({
          email: "sa.lw@woloyem.com",
          learnworlds_user_id: "lw_sa_1",
        }),
      }),
    );
    expect(calls.every((t) => t !== "students")).toBe(true);
    expect(calls.filter((t) => t === "profiles").length).toBe(1);
  });

  it("refuse non-SA", async () => {
    mockFrom.mockReturnValue(
      actorSelect({ id: ACTOR, role: "admin", account_status: "ACTIVE" }),
    );
    const result = await createLearnWorldsSuperAdminAuthorization({
      email: "sa.lw@woloyem.com",
      actorId: ACTOR,
      getUserByEmail: async () => lwUser(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("ACTOR_NOT_SUPER_ADMIN");
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("refuse LW introuvable", async () => {
    mockFrom.mockReturnValue(
      actorSelect({
        id: ACTOR,
        role: "super_admin",
        account_status: "ACTIVE",
      }),
    );
    const result = await createLearnWorldsSuperAdminAuthorization({
      email: "missing@woloyem.com",
      actorId: ACTOR,
      getUserByEmail: async () => null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("LW_NOT_FOUND");
  });

  it("refuse mismatch learnworlds_user_id", async () => {
    mockFrom.mockReturnValue(
      actorSelect({
        id: ACTOR,
        role: "super_admin",
        account_status: "ACTIVE",
      }),
    );
    const result = await createLearnWorldsSuperAdminAuthorization({
      email: "sa.lw@woloyem.com",
      actorId: ACTOR,
      expectedLearnWorldsUserId: "other_id",
      getUserByEmail: async () => lwUser(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("LW_ID_MISMATCH");
  });

  it("refuse doublon ACTIVE", async () => {
    let authCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return actorSelect({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      authCalls += 1;
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: AUTH_ID,
                  email: "sa.lw@woloyem.com",
                  learnworlds_user_id: "lw_sa_1",
                  status: "ACTIVE",
                  created_by: ACTOR,
                  created_at: "2026-08-16T12:00:00.000Z",
                  revoked_by: null,
                  revoked_at: null,
                  note: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      };
    });

    const result = await createLearnWorldsSuperAdminAuthorization({
      email: "sa.lw@woloyem.com",
      actorId: ACTOR,
      getUserByEmail: async () => lwUser(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("DUPLICATE_ACTIVE");
    expect(authCalls).toBeGreaterThan(0);
  });

  it("n’appelle pas Auth admin ni update profiles.role", async () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "lib/admin/learnworlds-super-admin-authorizations.ts",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/auth\.admin|createUser|updateUserById/);
    expect(src).not.toMatch(/\.update\(\{\s*role:/);
    expect(src).not.toMatch(/promoteToSuperAdmin/);
  });
});

describe("revokeLearnWorldsSuperAdminAuthorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAudit.mockResolvedValue(undefined);
  });

  it("révoque ACTIVE + audit ; recreate possible ensuite", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return actorSelect({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: AUTH_ID,
                email: "sa.lw@woloyem.com",
                learnworlds_user_id: "lw_sa_1",
                status: "ACTIVE",
                created_by: ACTOR,
                created_at: "2026-08-16T12:00:00.000Z",
                revoked_by: null,
                revoked_at: null,
                note: null,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: AUTH_ID,
                    email: "sa.lw@woloyem.com",
                    learnworlds_user_id: "lw_sa_1",
                    status: "REVOKED",
                    created_by: ACTOR,
                    created_at: "2026-08-16T12:00:00.000Z",
                    revoked_by: ACTOR,
                    revoked_at: "2026-08-16T13:00:00.000Z",
                    note: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    });

    const result = await revokeLearnWorldsSuperAdminAuthorization({
      authorizationId: AUTH_ID,
      actorId: ACTOR,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.authorization.status).toBe("REVOKED");
    }
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "LEARNWORLDS_SUPER_ADMIN_AUTHORIZATION_REVOKED",
      }),
    );
  });
});

describe("getActiveAuthorizationByEmail / list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalise email pour lecture ACTIVE", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: AUTH_ID,
                email: "sa.lw@woloyem.com",
                learnworlds_user_id: "lw_sa_1",
                status: "ACTIVE",
                created_by: ACTOR,
                created_at: "2026-08-16T12:00:00.000Z",
                revoked_by: null,
                revoked_at: null,
                note: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const row = await getActiveAuthorizationByEmail("  SA.LW@WOLOYEM.COM ");
    expect(row?.email).toBe("sa.lw@woloyem.com");
  });

  it("list retourne les lignes", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: AUTH_ID,
              email: "sa.lw@woloyem.com",
              learnworlds_user_id: "lw_sa_1",
              status: "ACTIVE",
              created_by: ACTOR,
              created_at: "2026-08-16T12:00:00.000Z",
              revoked_by: null,
              revoked_at: null,
              note: null,
            },
          ],
          error: null,
        }),
      }),
    });

    const rows = await listLearnWorldsSuperAdminAuthorizations();
    expect(rows).toHaveLength(1);
  });
});

describe("routes AAL2 / pas de promotion (source)", () => {
  it("create route : canManageTeam + requirePermissionApi + LW", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "app/api/admin/team/learnworlds/super-admin-auth/route.ts",
      ),
      "utf8",
    );
    expect(src).toMatch(/requirePermissionApi/);
    expect(src).toMatch(/canManageTeam/);
    expect(src).toMatch(/requireLearnWorldsApi/);
    expect(src).toMatch(/createLearnWorldsSuperAdminAuthorization/);
    expect(src).not.toMatch(/promoteToSuperAdmin|changeTeamRole/);
  });

  it("revoke route : AAL2 guard, pas de role mutation", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "app/api/admin/team/learnworlds/super-admin-auth/revoke/route.ts",
      ),
      "utf8",
    );
    expect(src).toMatch(/requirePermissionApi/);
    expect(src).toMatch(/canManageTeam/);
    expect(src).toMatch(/revokeLearnWorldsSuperAdminAuthorization/);
    expect(src).not.toMatch(/\.update\(\{\s*role:/);
  });

  it("requirePermissionApi applique assertSuperAdminAal2Api", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/admin/require-admin-api.ts"),
      "utf8",
    );
    expect(src).toMatch(/assertSuperAdminAal2Api/);
  });

  it("revoke n’écrit jamais profiles.role", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "lib/admin/learnworlds-super-admin-authorizations.ts",
      ),
      "utf8",
    );
    expect(src).toMatch(/LEARNWORLDS_SUPER_ADMIN_AUTHORIZATION_REVOKED/);
    expect(src).not.toMatch(/role:\s*[\"']super_admin[\"']/);
  });
});

describe("requireActiveLwSuperAdminAuthorizationForPromotion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ACTIVE ok ; REVOKED / absent / id mismatch", async () => {
    const {
      requireActiveLwSuperAdminAuthorizationForPromotion,
    } = await import("@/lib/admin/learnworlds-super-admin-authorizations");

    // ACTIVE
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: AUTH_ID,
                email: "sa.lw@woloyem.com",
                learnworlds_user_id: "lw_sa_1",
                status: "ACTIVE",
                created_by: ACTOR,
                created_at: "2026-08-16T12:00:00.000Z",
                revoked_by: null,
                revoked_at: null,
                note: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    });
    const ok = await requireActiveLwSuperAdminAuthorizationForPromotion({
      email: "sa.lw@woloyem.com",
      getUserByEmail: async () =>
        ({
          id: "lw_sa_1",
          email: "sa.lw@woloyem.com",
          username: null,
          firstName: null,
          lastName: null,
          tags: [],
          customFields: {},
          role: {
            level: "admin",
            name: "Admin",
            isAdmin: true,
            isInstructor: false,
          },
          createdAt: null,
          lastLoginAt: null,
        }) as never,
    });
    expect(ok.ok).toBe(true);

    // ID mismatch
    const mismatch = await requireActiveLwSuperAdminAuthorizationForPromotion({
      email: "sa.lw@woloyem.com",
      getUserByEmail: async () =>
        ({
          id: "other",
          email: "sa.lw@woloyem.com",
          username: null,
          firstName: null,
          lastName: null,
          tags: [],
          customFields: {},
          role: {
            level: "admin",
            name: "Admin",
            isAdmin: true,
            isInstructor: false,
          },
          createdAt: null,
          lastLoginAt: null,
        }) as never,
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) {
      expect(mismatch.reasonCode).toBe("LW_SUPER_ADMIN_ID_MISMATCH");
    }

    // none then revoked
    let phase = 0;
    mockFrom.mockImplementation(() => {
      phase += 1;
      if (phase === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id: AUTH_ID,
                      email: "sa.lw@woloyem.com",
                      learnworlds_user_id: "lw_sa_1",
                      status: "REVOKED",
                      created_by: ACTOR,
                      created_at: "2026-08-16T12:00:00.000Z",
                      revoked_by: ACTOR,
                      revoked_at: "2026-08-16T13:00:00.000Z",
                      note: null,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    });
    const revoked = await requireActiveLwSuperAdminAuthorizationForPromotion({
      email: "sa.lw@woloyem.com",
      getUserByEmail: async () => null,
    });
    expect(revoked.ok).toBe(false);
    if (!revoked.ok) {
      expect(revoked.reasonCode).toBe("LW_SUPER_ADMIN_AUTH_REVOKED");
    }
  });
});
