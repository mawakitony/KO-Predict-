import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetLwUser = vi.fn();
const mockFindAuth = vi.fn();
const mockRecordAudit = vi.fn();
const mockFrom = vi.fn();
const mockSync = vi.fn();

vi.mock("@/lib/learnworlds/users", () => ({
  getLearnWorldsUserById: (...args: unknown[]) => mockGetLwUser(...args),
}));

vi.mock("@/lib/admin/auth-lookup", () => ({
  findAuthUserByEmail: (...args: unknown[]) => mockFindAuth(...args),
}));

vi.mock("@/lib/auth/access-audit", () => ({
  recordAccessAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));

vi.mock("@/lib/learnworlds/sync", () => ({
  syncLearnWorldsLearner: (...args: unknown[]) => mockSync(...args),
}));

vi.mock("@/lib/auth/activation-codes", () => ({
  issueActivationCode: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { admin: { createUser: vi.fn() } },
  }),
}));

import { activateLearnWorldsLearner } from "@/lib/admin/activate-learner";

function profileQuery(role: string, accountStatus = "ACTIVE") {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role, account_status: accountStatus },
          error: null,
        }),
      }),
    }),
  };
}

describe("activateLearnWorldsLearner — protection staff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLwUser.mockResolvedValue({
      id: "lw_1",
      email: "staff@example.com",
      username: "staff",
      firstName: "Staff",
      lastName: "User",
      tags: [],
      customFields: {},
      createdAt: null,
      lastLoginAt: null,
    });
    mockFindAuth.mockResolvedValue({
      id: "auth-staff-1",
      email: "staff@example.com",
    });
    mockRecordAudit.mockResolvedValue(undefined);
  });

  it("super_admin + activate learner → refus, pas de sync, audit", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery("super_admin");
      return { select: vi.fn() };
    });

    const result = await activateLearnWorldsLearner("lw_1", {
      actorId: "actor-1",
    });

    expect(result.ok).toBe(false);
    expect(result.studentId).toBeNull();
    expect(result.error).toMatch(/staff/i);
    expect(mockSync).not.toHaveBeenCalled();
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "SUPER_ADMIN_ROLE_CHANGE_BLOCKED",
        authUserId: "auth-staff-1",
        meta: expect.objectContaining({
          source: "activate_learner",
          current_role: "super_admin",
          proposed_role: "student",
        }),
      }),
    );
  });

  it("admin + activate learner → refus + STAFF_ROLE_CHANGE_BLOCKED", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery("admin");
      return { select: vi.fn() };
    });

    const result = await activateLearnWorldsLearner("lw_1");
    expect(result.ok).toBe(false);
    expect(result.studentId).toBeNull();
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "STAFF_ROLE_CHANGE_BLOCKED",
        meta: expect.objectContaining({ current_role: "admin" }),
      }),
    );
  });

  it("coach + activate learner → refus", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return profileQuery("coach");
      return { select: vi.fn() };
    });

    const result = await activateLearnWorldsLearner("lw_1");
    expect(result.ok).toBe(false);
    expect(result.studentId).toBeNull();
    expect(mockSync).not.toHaveBeenCalled();
  });
});
