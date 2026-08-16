import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRecordAudit = vi.fn();
const mockCount = vi.fn();
const mockFrom = vi.fn();

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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { promoteToSuperAdmin } from "@/lib/admin/promote-super-admin";

const ACTOR = "11111111-1111-1111-1111-111111111111";
const TARGET = "22222222-2222-2222-2222-222222222222";

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

describe("promoteToSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAudit.mockResolvedValue(undefined);
    mockCount.mockResolvedValue(2);
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
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SUPER_ADMIN_PROMOTION_BLOCKED",
      }),
    );
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

  it("no-op idempotent si déjà super_admin", async () => {
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
    expect(mockRecordAudit).not.toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "SUPER_ADMIN_PROMOTED" }),
    );
  });

  it("promouvoit admin ACTIVE → super_admin + audit", async () => {
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
      expect(result.activeSuperAdminCount).toBe(2);
    }
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SUPER_ADMIN_PROMOTED",
        authUserId: TARGET,
        actorId: ACTOR,
        meta: expect.objectContaining({
          from_role: "admin",
          to_role: "super_admin",
        }),
      }),
    );
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
