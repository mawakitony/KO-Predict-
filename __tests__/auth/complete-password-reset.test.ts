import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockUpdateUserById = vi.fn();
const mockClaim = vi.fn();
const mockRevert = vi.fn();
const mockFinalize = vi.fn();
const mockVerifyToken = vi.fn();

vi.mock("@/lib/auth/password-reset-codes", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/auth/password-reset-codes")
  >("@/lib/auth/password-reset-codes");
  return {
    ...actual,
    claimPasswordResetCode: (...args: unknown[]) => mockClaim(...args),
    revertPasswordResetCodeClaim: (...args: unknown[]) => mockRevert(...args),
    finalizePasswordResetCodeUsed: (...args: unknown[]) =>
      mockFinalize(...args),
  };
});

vi.mock("@/lib/auth/password-reset-token", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/auth/password-reset-token")
  >("@/lib/auth/password-reset-token");
  return {
    ...actual,
    verifyPasswordResetToken: (...args: unknown[]) => mockVerifyToken(...args),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      admin: {
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
  }),
}));

import { completePasswordResetAccess } from "@/lib/auth/complete-password-reset";
import {
  PASSWORD_RESET_AUTH_FAILED,
  PASSWORD_RESET_CODE_ALREADY_USED,
  PASSWORD_RESET_SESSION_EXPIRED,
} from "@/lib/auth/password-reset-constants";

const CODE_ID = "prc-1";
const STUDENT_ID = "stu-1";
const AUTH_ID = "auth-1";
const EMAIL = "learner@example.com";

const validPayload = {
  passwordResetCodeId: CODE_ID,
  studentId: STUDENT_ID,
  authUserId: AUTH_ID,
  email: EMAIL,
  exp: Date.now() + 900_000,
};

function mockHappyDb(overrides?: {
  codeStatus?: string;
  role?: string;
  accountStatus?: string;
  codeEmail?: string;
  authUserId?: string | null;
  studentProfileId?: string;
  expiresAt?: string;
  claimedAt?: string | null;
}) {
  const codeStatus = overrides?.codeStatus ?? "PENDING";
  mockFrom.mockImplementation((table: string) => {
    if (table === "password_reset_codes") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: CODE_ID,
                student_id: STUDENT_ID,
                auth_user_id:
                  overrides?.authUserId === undefined
                    ? AUTH_ID
                    : overrides.authUserId,
                email: overrides?.codeEmail ?? EMAIL,
                status: codeStatus,
                claimed_at: overrides?.claimedAt ?? null,
                expires_at:
                  overrides?.expiresAt ??
                  new Date(Date.now() + 3_600_000).toISOString(),
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    }
    if (table === "students") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: STUDENT_ID,
                profile_id: overrides?.studentProfileId ?? AUTH_ID,
              },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: AUTH_ID,
                email: EMAIL,
                role: overrides?.role ?? "student",
                account_status: overrides?.accountStatus ?? "ACTIVE",
              },
              error: null,
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected ${table}`);
  });
}

describe("completePasswordResetAccess (PROCESSING)", () => {
  const prevSecret = process.env.PASSWORD_RESET_TOKEN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PASSWORD_RESET_TOKEN_SECRET =
      "test-password-reset-secret-32ch!";
    mockVerifyToken.mockReturnValue(validPayload);
    mockClaim.mockResolvedValue(true);
    mockRevert.mockResolvedValue(undefined);
    mockFinalize.mockResolvedValue(true);
    mockUpdateUserById.mockResolvedValue({ data: { user: {} }, error: null });
    mockHappyDb();
  });

  afterEach(() => {
    process.env.PASSWORD_RESET_TOKEN_SECRET = prevSecret;
  });

  it("SUCCESS : claim PROCESSING → Auth → finalize USED", async () => {
    const result = await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: "tok",
    });

    expect(result).toEqual({ ok: true });
    expect(mockClaim).toHaveBeenCalledWith({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
    });
    expect(mockUpdateUserById).toHaveBeenCalledWith(AUTH_ID, {
      password: "NewPass123!",
    });
    expect(mockFinalize).toHaveBeenCalledWith({
      passwordResetCodeId: CODE_ID,
      studentId: STUDENT_ID,
      authUserId: AUTH_ID,
    });
    expect(mockRevert).not.toHaveBeenCalled();
  });

  it("Auth KO → revert PROCESSING→PENDING ; pas de finalize", async () => {
    mockUpdateUserById.mockResolvedValue({
      data: { user: null },
      error: { message: "weak" },
    });
    const result = await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: "tok",
    });
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: PASSWORD_RESET_AUTH_FAILED,
    });
    expect(mockRevert).toHaveBeenCalled();
    expect(mockFinalize).not.toHaveBeenCalled();
  });

  it("USED jamais avant Auth : claim puis updateUser puis finalize", async () => {
    const order: string[] = [];
    mockClaim.mockImplementation(async () => {
      order.push("claim");
      return true;
    });
    mockUpdateUserById.mockImplementation(async () => {
      order.push("auth");
      return { data: { user: {} }, error: null };
    });
    mockFinalize.mockImplementation(async () => {
      order.push("finalize");
      return true;
    });

    await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: "tok",
    });
    expect(order).toEqual(["claim", "auth", "finalize"]);
  });

  it("PASSWORD confirmation différente", async () => {
    const result = await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "Other!",
      token: "tok",
    });
    expect(result.ok).toBe(false);
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it("TOKEN invalide", async () => {
    mockVerifyToken.mockReturnValue(null);
    const result = await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: null,
    });
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    });
  });

  it("CODE used/revoked → refus", async () => {
    mockHappyDb({ codeStatus: "USED" });
    const result = await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: "tok",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: PASSWORD_RESET_CODE_ALREADY_USED,
    });
  });

  it("RACE : claim refuse → pas d’Auth", async () => {
    mockClaim.mockResolvedValue(false);
    const result = await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: "tok",
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: PASSWORD_RESET_CODE_ALREADY_USED,
    });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it("accepte statut PROCESSING en entrée (reclaim géré par claim)", async () => {
    mockHappyDb({
      codeStatus: "PROCESSING",
      claimedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    });
    const result = await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: "tok",
    });
    expect(result.ok).toBe(true);
    expect(mockClaim).toHaveBeenCalled();
  });

  it("invariants : pas d’update students/profiles métier", async () => {
    await completePasswordResetAccess({
      password: "NewPass123!",
      confirmPassword: "NewPass123!",
      token: "tok",
    });
    const domain = await import("node:fs").then((fs) =>
      fs.readFileSync("lib/auth/complete-password-reset.ts", "utf8"),
    );
    expect(domain).not.toMatch(/\.from\("students"\)\.update/);
    expect(domain).not.toMatch(/account_status:\s*["']/);
    expect(domain).toMatch(/finalizePasswordResetCodeUsed/);
  });
});
