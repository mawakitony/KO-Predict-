import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockIssuePasswordResetCode = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/auth/password-reset-codes", () => ({
  issuePasswordResetCode: (...args: unknown[]) =>
    mockIssuePasswordResetCode(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { issueStudentPasswordResetCode } from "@/lib/admin/issue-password-reset-code";
import { canIssueStudentPasswordResetCode } from "@/lib/auth/permissions";

describe("canIssueStudentPasswordResetCode", () => {
  it("ACTIVE actor — admin OK", () => {
    expect(canIssueStudentPasswordResetCode("admin")).toBe(true);
  });

  it("ACTIVE actor — super_admin OK", () => {
    expect(canIssueStudentPasswordResetCode("super_admin")).toBe(true);
  });

  it("coach / student actor → refus", () => {
    expect(canIssueStudentPasswordResetCode("coach")).toBe(false);
    expect(canIssueStudentPasswordResetCode("student")).toBe(false);
  });
});

describe("issueStudentPasswordResetCode (admin service)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ACTIVE + admin → OK, plaintext uniquement au résultat", async () => {
    mockIssuePasswordResetCode.mockResolvedValue({
      ok: true,
      email: "learner@example.com",
      issued: {
        codePlaintext: "KP-ABCD-EFGH",
        expiresAt: "2026-08-16T12:00:00.000Z",
        passwordResetCodeId: "prc-1",
      },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              profiles: {
                first_name: "Léa",
                last_name: "Martin",
                email: "learner@example.com",
              },
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await issueStudentPasswordResetCode("stu-1", {
      actorId: "admin-1",
    });

    expect(mockIssuePasswordResetCode).toHaveBeenCalledWith({
      studentId: "stu-1",
      createdBy: "admin-1",
    });
    expect(result).toEqual({
      ok: true,
      resetCode: "KP-ABCD-EFGH",
      resetExpiresAt: "2026-08-16T12:00:00.000Z",
      passwordResetCodeId: "prc-1",
      fullName: "Léa Martin",
      email: "learner@example.com",
    });
    if (result.ok) {
      expect(result.resetCode).toMatch(/^KP-/);
    }
  });

  it("PENDING cible → refus (délègue domaine)", async () => {
    mockIssuePasswordResetCode.mockResolvedValue({
      ok: false,
      error: "Compte en attente : utilisez Régénérer le code d’accès.",
    });

    const result = await issueStudentPasswordResetCode("stu-1", {
      actorId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/attente/i);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("DISABLED → refus", async () => {
    mockIssuePasswordResetCode.mockResolvedValue({
      ok: false,
      error: "Réactivez d’abord le compte.",
    });

    const result = await issueStudentPasswordResetCode("stu-1");
    expect(result).toEqual({
      ok: false,
      error: "Réactivez d’abord le compte.",
    });
  });

  it("coach / admin / SA cible → refus", async () => {
    mockIssuePasswordResetCode.mockResolvedValue({
      ok: false,
      error: "Réservé aux comptes apprenant.",
    });

    const result = await issueStudentPasswordResetCode("stu-staff");
    expect(result).toEqual({
      ok: false,
      error: "Réservé aux comptes apprenant.",
    });
  });

  it("ne touche pas role / account_status / students / LearnWorlds", async () => {
    mockIssuePasswordResetCode.mockResolvedValue({
      ok: true,
      email: "learner@example.com",
      issued: {
        codePlaintext: "KP-TEST-CODE",
        expiresAt: "2026-08-16T12:00:00.000Z",
        passwordResetCodeId: "prc-2",
      },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { profiles: { first_name: "A", last_name: "B", email: "x" } },
            error: null,
          }),
        }),
      }),
    });

    await issueStudentPasswordResetCode("stu-1", { actorId: "sa-1" });

    // Service admin : lecture profiles pour le nom + délégation domaine uniquement
    expect(mockFrom).toHaveBeenCalledWith("students");
    expect(mockFrom).toHaveBeenCalledTimes(1);
    const tables = mockFrom.mock.calls.map((c) => c[0]);
    expect(tables).not.toContain("learnworlds");
  });
});
