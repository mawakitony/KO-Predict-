import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRecordAudit = vi.fn();
const mockCount = vi.fn();
const mockFrom = vi.fn();
const mockRequireAuth = vi.fn();

vi.mock("@/lib/auth/access-audit", () => ({
  recordAccessAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));

vi.mock("@/lib/admin/super-admin-guards", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/admin/super-admin-guards")
  >("@/lib/admin/super-admin-guards");
  return {
    ...actual,
    countActiveSuperAdmins: (...args: unknown[]) => mockCount(...args),
  };
});

vi.mock("@/lib/admin/learnworlds-super-admin-authorizations", () => ({
  requireActiveLwSuperAdminAuthorizationForPromotion: (...args: unknown[]) =>
    mockRequireAuth(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { promoteToSuperAdmin } from "@/lib/admin/promote-super-admin";

const ACTOR = "11111111-1111-1111-1111-111111111111";
const TARGET = "22222222-2222-2222-2222-222222222222";
const AUTH_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function profileChain(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  };
}

function allowLwAuth() {
  mockRequireAuth.mockResolvedValue({
    ok: true,
    authorization: {
      id: AUTH_ID,
      email: "admin@example.com",
      learnworldsUserId: "lw_1",
      status: "ACTIVE",
      createdBy: ACTOR,
      createdAt: "2026-08-16T12:00:00.000Z",
      revokedBy: null,
      revokedAt: null,
      note: null,
      learnworldsRoleLevel: null,
    },
  });
}

describe("promoteToSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAudit.mockResolvedValue(undefined);
    mockCount.mockResolvedValue(2);
    allowLwAuth();
  });

  it("refuse sans confirmation cochée", async () => {
    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "admin@example.com",
      confirmAcknowledged: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("CONFIRMATION_REQUIRED");
    expect(mockRequireAuth).not.toHaveBeenCalled();
  });

  it("refuse si actor n’est pas super_admin ACTIVE", async () => {
    mockFrom.mockImplementation(() =>
      profileChain({
        id: ACTOR,
        role: "admin",
        account_status: "ACTIVE",
      }),
    );
    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "admin@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("ACTOR_NOT_SUPER_ADMIN");
  });

  it("refuse coach / student / PENDING", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return profileChain({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      return profileChain({
        id: TARGET,
        email: "coach@example.com",
        role: "coach",
        account_status: "ACTIVE",
      });
    });

    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "coach@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("TARGET_NOT_ADMIN");
    expect(mockRequireAuth).not.toHaveBeenCalled();
  });

  it("refuse email de confirmation incorrect", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return profileChain({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      return profileChain({
        id: TARGET,
        email: "admin@example.com",
        role: "admin",
        account_status: "ACTIVE",
      });
    });

    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "wrong@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("CONFIRM_EMAIL_MISMATCH");
  });

  it("no-op idempotent si déjà super_admin (sans auth LW)", async () => {
    mockRequireAuth.mockClear();
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return profileChain({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      return profileChain({
        id: TARGET,
        email: "sa2@example.com",
        role: "super_admin",
        account_status: "ACTIVE",
      });
    });
    mockCount.mockResolvedValue(2);

    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "sa2@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadySuperAdmin).toBe(true);
      expect(result.activeSuperAdminCount).toBe(2);
    }
    expect(mockRequireAuth).not.toHaveBeenCalled();
    expect(mockRecordAudit).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SUPER_ADMIN_PROMOTED" }),
    );
  });

  it("admin ACTIVE + auth ACTIVE → promotion OK", async () => {
    const rows = [
      {
        id: ACTOR,
        role: "super_admin",
        account_status: "ACTIVE",
      },
      {
        id: TARGET,
        email: "admin@example.com",
        role: "admin",
        account_status: "ACTIVE",
      },
      { role: "super_admin" },
    ];
    let selectCall = 0;
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => {
        const data = rows[selectCall] ?? null;
        selectCall += 1;
        return {
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
          }),
        };
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    }));
    mockCount.mockResolvedValue(2);

    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "Admin@example.com",
      confirmAcknowledged: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.from).toBe("admin");
      expect(result.to).toBe("super_admin");
    }
    expect(mockRequireAuth).toHaveBeenCalledWith(
      expect.objectContaining({ email: "admin@example.com" }),
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SUPER_ADMIN_PROMOTED",
        meta: expect.objectContaining({
          authorization_id: AUTH_ID,
          learnworlds_user_id: "lw_1",
        }),
      }),
    );
  });

  it("admin ACTIVE sans auth → LW_SUPER_ADMIN_AUTH_REQUIRED", async () => {
    mockRequireAuth.mockResolvedValue({
      ok: false,
      reasonCode: "LW_SUPER_ADMIN_AUTH_REQUIRED",
      error: "Autorisation LearnWorlds Super Admin requise avant la promotion.",
    });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return profileChain({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      return profileChain({
        id: TARGET,
        email: "admin@example.com",
        role: "admin",
        account_status: "ACTIVE",
      });
    });

    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "admin@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("LW_SUPER_ADMIN_AUTH_REQUIRED");
    }
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SUPER_ADMIN_PROMOTION_BLOCKED",
        meta: expect.objectContaining({
          reason_code: "LW_SUPER_ADMIN_AUTH_REQUIRED",
        }),
      }),
    );
  });

  it("auth REVOKED → bloqué", async () => {
    mockRequireAuth.mockResolvedValue({
      ok: false,
      reasonCode: "LW_SUPER_ADMIN_AUTH_REVOKED",
      error: "Autorisation LearnWorlds révoquée.",
      authorizationId: AUTH_ID,
    });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return profileChain({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      return profileChain({
        id: TARGET,
        email: "admin@example.com",
        role: "admin",
        account_status: "ACTIVE",
      });
    });

    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "admin@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("LW_SUPER_ADMIN_AUTH_REVOKED");
  });

  it("LW id mismatch → bloqué", async () => {
    mockRequireAuth.mockResolvedValue({
      ok: false,
      reasonCode: "LW_SUPER_ADMIN_ID_MISMATCH",
      error: "mismatch",
      authorizationId: AUTH_ID,
    });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return profileChain({
          id: ACTOR,
          role: "super_admin",
          account_status: "ACTIVE",
        });
      }
      return profileChain({
        id: TARGET,
        email: "admin@example.com",
        role: "admin",
        account_status: "ACTIVE",
      });
    });

    const result = await promoteToSuperAdmin({
      targetProfileId: TARGET,
      actorId: ACTOR,
      confirmEmail: "admin@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasonCode).toBe("LW_SUPER_ADMIN_ID_MISMATCH");
    }
  });

  it("refuse self-target", async () => {
    mockFrom.mockImplementation(() =>
      profileChain({
        id: ACTOR,
        role: "super_admin",
        account_status: "ACTIVE",
      }),
    );
    const result = await promoteToSuperAdmin({
      targetProfileId: ACTOR,
      actorId: ACTOR,
      confirmEmail: "me@example.com",
      confirmAcknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasonCode).toBe("SELF_TARGET");
  });
});
