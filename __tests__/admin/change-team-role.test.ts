import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("server-only", () => ({}));

const mockRecordAudit = vi.fn();
const mockFrom = vi.fn();
const mockAuthAdmin = {
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserById: vi.fn(),
  getUserById: vi.fn(),
};

vi.mock("@/lib/auth/access-audit", () => ({
  recordAccessAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: mockAuthAdmin },
  }),
}));

import { changeTeamRole } from "@/lib/admin/team";

const ACTOR = "11111111-1111-1111-1111-111111111111";
const TARGET = "22222222-2222-2222-2222-222222222222";

function selectMaybeSingle(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
      }),
    }),
  };
}

function updateOnly(options: {
  updated: { id: string; role: string } | null;
  error?: { message: string } | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.updated,
    error: options.error ?? null,
  });
  const selectAfterUpdate = vi.fn().mockReturnValue({ maybeSingle });
  const eqStatus = vi.fn().mockReturnValue({ select: selectAfterUpdate });
  const eqRole = vi.fn().mockReturnValue({ eq: eqStatus });
  const eqId = vi.fn().mockReturnValue({ eq: eqRole });
  const update = vi.fn().mockReturnValue({ eq: eqId });
  return { update };
}

function profilesMock(options: {
  profile: {
    id: string;
    role: string;
    account_status: string;
  };
  updated?: { id: string; role: string } | null;
}) {
  return {
    ...selectMaybeSingle(options.profile),
    ...(options.updated !== undefined
      ? updateOnly({ updated: options.updated })
      : { update: vi.fn() }),
  };
}

describe("changeTeamRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAudit.mockResolvedValue(undefined);
  });

  it("coach ACTIVE → admin OK + audit", async () => {
    mockFrom.mockReturnValue(
      profilesMock({
        profile: {
          id: TARGET,
          role: "coach",
          account_status: "ACTIVE",
        },
        updated: { id: TARGET, role: "admin" },
      }),
    );

    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "admin",
      actorId: ACTOR,
    });

    expect(result).toEqual({
      ok: true,
      profileId: TARGET,
      from: "coach",
      to: "admin",
    });
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "TEAM_ROLE_CHANGED",
        authUserId: TARGET,
        actorId: ACTOR,
        meta: expect.objectContaining({
          from_role: "coach",
          to_role: "admin",
          target_profile_id: TARGET,
        }),
      }),
    );
    expect(mockAuthAdmin.createUser).not.toHaveBeenCalled();
    expect(mockAuthAdmin.updateUserById).not.toHaveBeenCalled();
    expect(mockAuthAdmin.deleteUser).not.toHaveBeenCalled();
  });

  it("admin ACTIVE → coach OK", async () => {
    mockFrom.mockReturnValue(
      profilesMock({
        profile: {
          id: TARGET,
          role: "admin",
          account_status: "ACTIVE",
        },
        updated: { id: TARGET, role: "coach" },
      }),
    );

    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "coach",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.from).toBe("admin");
      expect(result.to).toBe("coach");
    }
  });

  it("coach → coach no-op sans audit ni update", async () => {
    const chain = selectMaybeSingle({
      id: TARGET,
      role: "coach",
      account_status: "ACTIVE",
    });
    const update = vi.fn();
    mockFrom.mockReturnValue({ ...chain, update });

    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "coach",
      actorId: ACTOR,
    });
    expect(result).toEqual({
      ok: true,
      profileId: TARGET,
      from: "coach",
      to: "coach",
    });
    expect(update).not.toHaveBeenCalled();
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("admin → admin no-op sans audit", async () => {
    mockFrom.mockReturnValue(
      selectMaybeSingle({
        id: TARGET,
        role: "admin",
        account_status: "PENDING_ACTIVATION",
      }),
    );
    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "admin",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(true);
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("PENDING_ACTIVATION → refus serveur", async () => {
    mockFrom.mockReturnValue(
      selectMaybeSingle({
        id: TARGET,
        role: "coach",
        account_status: "PENDING_ACTIVATION",
      }),
    );
    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "admin",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/première connexion/i);
    }
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("DISABLED → refus serveur", async () => {
    mockFrom.mockReturnValue(
      selectMaybeSingle({
        id: TARGET,
        role: "admin",
        account_status: "DISABLED",
      }),
    );
    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "coach",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Réactivez/i);
    }
  });

  it("super_admin cible → refus", async () => {
    mockFrom.mockReturnValue(
      selectMaybeSingle({
        id: TARGET,
        role: "super_admin",
        account_status: "ACTIVE",
      }),
    );
    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "coach",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/super_admin/i);
    }
  });

  it("student cible → refus", async () => {
    mockFrom.mockReturnValue(
      selectMaybeSingle({
        id: TARGET,
        role: "student",
        account_status: "ACTIVE",
      }),
    );
    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "admin",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/pas coach\/admin/i);
    }
  });

  it("self → refus", async () => {
    mockFrom.mockReturnValue(
      selectMaybeSingle({
        id: ACTOR,
        role: "coach",
        account_status: "ACTIVE",
      }),
    );
    const result = await changeTeamRole({
      profileId: ACTOR,
      newRole: "admin",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/propre rôle/i);
    }
  });

  it("newRole non autorisé → refus", async () => {
    const result = await changeTeamRole({
      profileId: TARGET,
      // @ts-expect-error — payload client malveillant
      newRole: "super_admin",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("race : update conditionnel sans ligne → erreur métier", async () => {
    mockFrom.mockReturnValue(
      profilesMock({
        profile: {
          id: TARGET,
          role: "coach",
          account_status: "ACTIVE",
        },
        updated: null,
      }),
    );

    const result = await changeTeamRole({
      profileId: TARGET,
      newRole: "admin",
      actorId: ACTOR,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Actualisez/i);
    }
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("n’appelle jamais from('students')", async () => {
    mockFrom.mockReturnValue(
      profilesMock({
        profile: {
          id: TARGET,
          role: "coach",
          account_status: "ACTIVE",
        },
        updated: { id: TARGET, role: "admin" },
      }),
    );

    await changeTeamRole({
      profileId: TARGET,
      newRole: "admin",
      actorId: ACTOR,
    });

    for (const call of mockFrom.mock.calls) {
      expect(call[0]).toBe("profiles");
    }
  });
});

describe("change-role route allow-list", () => {
  it("zod route n’accepte que coach|admin", () => {
    const src = readFileSync(
      join(process.cwd(), "app/api/admin/team/change-role/route.ts"),
      "utf8",
    );
    expect(src).toMatch(/z\.enum\(\[\"coach\", \"admin\"\]\)/);
    expect(src).toMatch(/canChangeTeamRoles/);
    expect(src).toMatch(/requirePermissionApi/);
  });
});
