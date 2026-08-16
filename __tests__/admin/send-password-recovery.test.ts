import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRecordAudit = vi.fn();
const mockFrom = vi.fn();
const mockResetPasswordForEmail = vi.fn();

vi.mock("@/lib/auth/access-audit", () => ({
  recordAccessAudit: (...args: unknown[]) => mockRecordAudit(...args),
}));

vi.mock("@/lib/admin/auth-lookup", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/admin/auth-lookup")
  >("@/lib/admin/auth-lookup");
  return {
    ...actual,
    getPasswordRecoveryRedirectUrl: () =>
      "http://localhost:3000/auth/reset-password",
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      resetPasswordForEmail: (...args: unknown[]) =>
        mockResetPasswordForEmail(...args),
    },
  }),
}));

import { sendStudentPasswordRecovery } from "@/lib/admin/send-password-recovery";
import { canSendStudentPasswordRecovery } from "@/lib/auth/permissions";

function studentQuery(profile: {
  id: string;
  email: string | null;
  role: string | null;
  account_status: string | null;
} | null) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: profile
            ? {
                id: "stu-1",
                profile_id: profile.id,
                profiles: profile,
              }
            : null,
          error: null,
        }),
      }),
    }),
  };
}

describe("canSendStudentPasswordRecovery", () => {
  it("autorise admin et super_admin", () => {
    expect(canSendStudentPasswordRecovery("admin")).toBe(true);
    expect(canSendStudentPasswordRecovery("super_admin")).toBe(true);
  });

  it("refuse coach et student", () => {
    expect(canSendStudentPasswordRecovery("coach")).toBe(false);
    expect(canSendStudentPasswordRecovery("student")).toBe(false);
  });
});

describe("sendStudentPasswordRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecordAudit.mockResolvedValue(undefined);
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("ACTIVE student → recovery OK, audit sans secret", async () => {
    mockFrom.mockReturnValue(
      studentQuery({
        id: "prof-1",
        email: "learner@example.com",
        role: "student",
        account_status: "ACTIVE",
      }),
    );

    const result = await sendStudentPasswordRecovery("stu-1", {
      actorId: "admin-1",
    });

    expect(result).toEqual({ ok: true, email: "learner@example.com" });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "learner@example.com",
      { redirectTo: "http://localhost:3000/auth/reset-password" },
    );
    expect(mockRecordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PASSWORD_RECOVERY_SENT",
        studentId: "stu-1",
        authUserId: "prof-1",
        actorId: "admin-1",
        meta: {
          student_id: "stu-1",
          target_profile_id: "prof-1",
        },
      }),
    );
    const auditArg = mockRecordAudit.mock.calls[0]?.[0] as {
      meta?: Record<string, unknown>;
    };
    expect(auditArg.meta).toEqual({
      student_id: "stu-1",
      target_profile_id: "prof-1",
    });
    expect(JSON.stringify(auditArg.meta)).not.toMatch(
      /token|access_token|refresh_token|lien|http/i,
    );
    expect(auditArg.meta).not.toHaveProperty("redirectTo");
    expect(auditArg).not.toHaveProperty("password");
  });

  it("PENDING → refus, pas d’email", async () => {
    mockFrom.mockReturnValue(
      studentQuery({
        id: "prof-1",
        email: "learner@example.com",
        role: "student",
        account_status: "PENDING_ACTIVATION",
      }),
    );

    const result = await sendStudentPasswordRecovery("stu-1", {
      actorId: "admin-1",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Régénérer/i);
    }
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("DISABLED → refus", async () => {
    mockFrom.mockReturnValue(
      studentQuery({
        id: "prof-1",
        email: "learner@example.com",
        role: "student",
        account_status: "DISABLED",
      }),
    );

    const result = await sendStudentPasswordRecovery("stu-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Réactivez/i);
    }
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("cible coach → refus", async () => {
    mockFrom.mockReturnValue(
      studentQuery({
        id: "prof-coach",
        email: "coach@example.com",
        role: "coach",
        account_status: "ACTIVE",
      }),
    );

    const result = await sendStudentPasswordRecovery("stu-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/apprenant/i);
    }
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("cible admin → refus", async () => {
    mockFrom.mockReturnValue(
      studentQuery({
        id: "prof-admin",
        email: "admin@example.com",
        role: "admin",
        account_status: "ACTIVE",
      }),
    );

    const result = await sendStudentPasswordRecovery("stu-1");
    expect(result.ok).toBe(false);
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("cible super_admin → refus", async () => {
    mockFrom.mockReturnValue(
      studentQuery({
        id: "prof-sa",
        email: "sa@example.com",
        role: "super_admin",
        account_status: "ACTIVE",
      }),
    );

    const result = await sendStudentPasswordRecovery("stu-1");
    expect(result.ok).toBe(false);
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("n’appelle pas update profile / students (pas de second from update)", async () => {
    mockFrom.mockReturnValue(
      studentQuery({
        id: "prof-1",
        email: "learner@example.com",
        role: "student",
        account_status: "ACTIVE",
      }),
    );

    await sendStudentPasswordRecovery("stu-1", { actorId: "admin-1" });

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("students");
  });
});
