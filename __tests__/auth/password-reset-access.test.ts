import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockVerifyPasswordResetCode = vi.fn();

vi.mock("@/lib/auth/password-reset-codes", () => ({
  verifyPasswordResetCode: (...args: unknown[]) =>
    mockVerifyPasswordResetCode(...args),
}));

import {
  PASSWORD_RESET_CODE_GENERIC_ERROR,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
} from "@/lib/auth/password-reset-constants";
import {
  FIRST_ACCESS_COOKIE_NAME,
  createFirstAccessToken,
  verifyFirstAccessToken,
} from "@/lib/auth/first-access-token";
import {
  PASSWORD_RESET_COOKIE_NAME,
  createPasswordResetToken,
  verifyPasswordResetToken,
} from "@/lib/auth/password-reset-token";
import { POST as verifyResetAccess } from "@/app/api/auth/reset-access/verify/route";

describe("password-reset token / cookie", () => {
  const prevFirst = process.env.FIRST_ACCESS_TOKEN_SECRET;
  const prevReset = process.env.PASSWORD_RESET_TOKEN_SECRET;

  beforeEach(() => {
    process.env.FIRST_ACCESS_TOKEN_SECRET =
      "test-first-access-secret-32chars!";
    process.env.PASSWORD_RESET_TOKEN_SECRET =
      "test-password-reset-secret-32ch!";
  });

  afterEach(() => {
    process.env.FIRST_ACCESS_TOKEN_SECRET = prevFirst;
    process.env.PASSWORD_RESET_TOKEN_SECRET = prevReset;
  });

  it("TTL cookie 15 min", () => {
    expect(PASSWORD_RESET_TOKEN_TTL_MINUTES).toBe(15);
  });

  it("cookie signé distinct du first-access", () => {
    expect(PASSWORD_RESET_COOKIE_NAME).toBe("ko_password_reset");
    expect(FIRST_ACCESS_COOKIE_NAME).toBe("ko_first_access");
    expect(PASSWORD_RESET_COOKIE_NAME).not.toBe(FIRST_ACCESS_COOKIE_NAME);

    const resetToken = createPasswordResetToken({
      passwordResetCodeId: "prc-1",
      studentId: "stu-1",
      authUserId: "auth-1",
      email: "Learner@Example.com",
      ttlMinutes: 15,
    });
    const payload = verifyPasswordResetToken(resetToken);
    expect(payload).toMatchObject({
      passwordResetCodeId: "prc-1",
      studentId: "stu-1",
      authUserId: "auth-1",
      email: "learner@example.com",
    });
    expect(payload?.email).toBe("learner@example.com");
    expect(JSON.stringify(payload)).not.toMatch(/KP-[2-9A-HJ-NP-Z]/i);
    expect(JSON.stringify(payload)).not.toMatch(/code_hash|codePlaintext/i);

    const firstToken = createFirstAccessToken({
      activationCodeId: "act-1",
      authUserId: "auth-1",
      email: "learner@example.com",
      kind: "student",
    });
    expect(verifyFirstAccessToken(resetToken)).toBeNull();
    expect(verifyPasswordResetToken(firstToken)).toBeNull();
    expect(verifyPasswordResetToken(`${resetToken}x`)).toBeNull();
  });

  it("aucun code/password dans le cookie", () => {
    const token = createPasswordResetToken({
      passwordResetCodeId: "prc-9",
      studentId: "stu-9",
      authUserId: "auth-9",
      email: "a@example.com",
    });
    expect(token).not.toMatch(/KP-[2-9A-HJ-NP-Z]/i);
    const decoded = Buffer.from(token.split(".")[0]!, "base64url").toString(
      "utf8",
    );
    expect(decoded).not.toMatch(/KP-[2-9A-HJ-NP-Z]|codePlaintext|"password":/i);
  });
});

describe("POST /api/auth/reset-access/verify", () => {
  const prevReset = process.env.PASSWORD_RESET_TOKEN_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PASSWORD_RESET_TOKEN_SECRET =
      "test-password-reset-secret-32ch!";
  });

  afterEach(() => {
    process.env.PASSWORD_RESET_TOKEN_SECRET = prevReset;
  });

  function request(body: unknown) {
    return new Request("http://localhost/api/auth/reset-access/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("email+code valide → contexte reset créé (cookie), code reste PENDING", async () => {
    mockVerifyPasswordResetCode.mockResolvedValue({
      ok: true,
      passwordResetCodeId: "prc-1",
      studentId: "stu-1",
      authUserId: "auth-1",
      email: "learner@example.com",
    });

    const res = await verifyResetAccess(
      request({ email: "learner@example.com", code: "KP-ABCD-EFGH" }),
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(json).not.toHaveProperty("passwordResetCodeId");
    expect(json).not.toHaveProperty("studentId");
    expect(json).not.toHaveProperty("authUserId");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${PASSWORD_RESET_COOKIE_NAME}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie).not.toMatch(/KP-ABCD-EFGH/);

    const match = setCookie.match(
      new RegExp(`${PASSWORD_RESET_COOKIE_NAME}=([^;]+)`),
    );
    expect(match?.[1]).toBeTruthy();
    const payload = verifyPasswordResetToken(match![1]);
    expect(payload?.passwordResetCodeId).toBe("prc-1");
    expect(payload?.studentId).toBe("stu-1");

    // Domain verify does not mark USED — route never calls mark
    expect(mockVerifyPasswordResetCode).toHaveBeenCalledWith({
      email: "learner@example.com",
      code: "KP-ABCD-EFGH",
    });
  });

  it("mauvais code → message générique", async () => {
    mockVerifyPasswordResetCode.mockResolvedValue({
      ok: false,
      reason: "generic",
    });
    const res = await verifyResetAccess(
      request({ email: "learner@example.com", code: "KP-WRONG-CODE" }),
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json).toEqual({
      ok: false,
      error: PASSWORD_RESET_CODE_GENERIC_ERROR,
    });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("expiré / revoked / used / lock → générique (pas de détail)", async () => {
    for (const reason of ["expired", "generic"] as const) {
      mockVerifyPasswordResetCode.mockResolvedValue({ ok: false, reason });
      const res = await verifyResetAccess(
        request({ email: "a@example.com", code: "KP-AAAA-BBBB" }),
      );
      const json = await res.json();
      expect(json.error).toBe(PASSWORD_RESET_CODE_GENERIC_ERROR);
      expect(json.error).not.toMatch(/PENDING|DISABLED|student|lock/i);
    }
  });

  it("body invalide → générique", async () => {
    const res = await verifyResetAccess(request({ email: "x", code: "1" }));
    const json = await res.json();
    expect(json.error).toBe(PASSWORD_RESET_CODE_GENERIC_ERROR);
    expect(mockVerifyPasswordResetCode).not.toHaveBeenCalled();
  });
});

describe("séparation activation ↔ reset-access", () => {
  it("page et routes reset-access présentes ; first-access intact", async () => {
    const fs = await import("node:fs");
    expect(fs.existsSync("app/auth/reset-access/page.tsx")).toBe(true);
    expect(fs.existsSync("app/api/auth/reset-access/verify/route.ts")).toBe(
      true,
    );
    expect(fs.existsSync("app/first-access/page.tsx")).toBe(true);
    expect(fs.existsSync("app/api/auth/first-access/verify/route.ts")).toBe(
      true,
    );
    expect(fs.existsSync("app/api/auth/reset-access/complete")).toBe(true);
  });

  it("verify reset n’utilise pas activation_codes ; first-access n’utilise pas password_reset_codes", async () => {
    const fs = await import("node:fs");
    const resetVerify = fs.readFileSync(
      "app/api/auth/reset-access/verify/route.ts",
      "utf8",
    );
    const firstVerify = fs.readFileSync(
      "app/api/auth/first-access/verify/route.ts",
      "utf8",
    );
    expect(resetVerify).toMatch(/verifyPasswordResetCode/);
    expect(resetVerify).not.toMatch(/verifyActivationEmailAndCode/);
    expect(resetVerify).not.toMatch(/updateUser|password:/i);
    expect(firstVerify).toMatch(/verifyActivationEmailAndCode/);
    expect(firstVerify).not.toMatch(/verifyPasswordResetCode/);
    expect(firstVerify).not.toMatch(/password_reset/);
  });

  it("secrets / cookies distincts dans le source", async () => {
    const fs = await import("node:fs");
    const resetTok = fs.readFileSync("lib/auth/password-reset-token.ts", "utf8");
    const firstTok = fs.readFileSync("lib/auth/first-access-token.ts", "utf8");
    expect(resetTok).toMatch(/PASSWORD_RESET_TOKEN_SECRET/);
    expect(resetTok).not.toMatch(/FIRST_ACCESS_TOKEN_SECRET/);
    expect(firstTok).toMatch(/FIRST_ACCESS_TOKEN_SECRET/);
    expect(firstTok).not.toMatch(/PASSWORD_RESET_TOKEN_SECRET/);
  });
});
