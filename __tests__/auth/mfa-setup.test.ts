import { describe, expect, it, vi, afterEach } from "vitest";
import {
  logMfaSetupDiagnostic,
  mapMfaSetupAccessDenial,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  MFA_FACTOR_STALE_MESSAGE,
  normalizeTotpQrDataUrl,
  resolveMfaSetupAccess,
  resolveSetupChallengeFactorId,
  runMfaSetupActivation,
} from "@/lib/auth/mfa-setup";
import { readFileSync } from "node:fs";
import { join } from "node:path";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeTotpQrDataUrl / mapTotpEnrollForDisplay", () => {
  it("QR data URL correctement encodée", () => {
    const rawSvg = "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>";
    const fromClient = `data:image/svg+xml;utf-8,${rawSvg}`;
    const normalized = normalizeTotpQrDataUrl(fromClient);
    expect(normalized.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(
      true,
    );
    expect(normalized).not.toContain("<svg");
  });

  it("factorId + QR retournés pour affichage (jamais loggés)", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const display = mapTotpEnrollForDisplay({
      id: "enrolled-unverified-id",
      totp: {
        qr_code: "data:image/svg+xml;utf-8,<svg><path d='M0'/></svg>",
        secret: "SECRETVALUE",
      },
    });
    expect(display.factorId).toBe("enrolled-unverified-id");
    expect(display.qrDataUrl).toContain("charset=utf-8");
    expect(display.manualSecret).toBe("SECRETVALUE");
    logMfaSetupDiagnostic("enroll", { code: "ok" });
    const payload = JSON.stringify(spy.mock.calls);
    expect(payload.toLowerCase()).not.toContain("secret");
    expect(payload.toLowerCase()).not.toContain("qr");
    expect(payload).not.toContain("SECRETVALUE");
  });
});

describe("gates setup (session / rôle / enforcement)", () => {
  it("session absente → refus", () => {
    const access = resolveMfaSetupAccess({
      authenticated: false,
      role: "super_admin",
      accountStatus: "ACTIVE",
      activeSuperAdminCount: 2,
      verifiedTotpFactorCount: 0,
    });
    expect(access).toMatchObject({
      action: "redirect",
      reason: "unauthenticated",
    });
    if (access.action === "redirect") {
      expect(mapMfaSetupAccessDenial(access.reason)).toMatch(/session/i);
    }
  });

  it("non-SA → refus", () => {
    const access = resolveMfaSetupAccess({
      authenticated: true,
      role: "admin",
      accountStatus: "ACTIVE",
      activeSuperAdminCount: 2,
      verifiedTotpFactorCount: 0,
    });
    expect(access).toMatchObject({
      action: "redirect",
      reason: "not_super_admin",
    });
  });

  it("count < 2 → enforcement off", () => {
    const access = resolveMfaSetupAccess({
      authenticated: true,
      role: "super_admin",
      accountStatus: "ACTIVE",
      activeSuperAdminCount: 1,
      verifiedTotpFactorCount: 0,
    });
    expect(access).toMatchObject({
      action: "redirect",
      reason: "enforcement_disabled",
    });
  });

  it("session SSR SA + count>=2 → allow_setup", () => {
    expect(
      resolveMfaSetupAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        verifiedTotpFactorCount: 0,
      }),
    ).toEqual({ action: "allow_setup" });
  });
});

describe("setup challenge factorId (sans listFactors.totp)", () => {
  it("facteur unverified issu de enroll() accepté pour challenge", () => {
    const enrolledId = "factor-unverified-from-enroll";
    const verifiedOnlyTotp: { id: string; status: string }[] = [];
    expect(verifiedOnlyTotp.find((f) => f.id === enrolledId)).toBeUndefined();
    expect(resolveSetupChallengeFactorId(enrolledId)).toEqual({
      ok: true,
      factorId: enrolledId,
    });
  });

  it("factorId absent → erreur propre", () => {
    expect(resolveSetupChallengeFactorId(null)).toEqual({
      ok: false,
      code: "factor_missing",
    });
    expect(mapMfaSetupError({ code: "factor_missing" })).toBe(
      MFA_FACTOR_STALE_MESSAGE,
    );
  });
});

describe("runMfaSetupActivation (serveur)", () => {
  it("challenge utilise le factorId enroll ; verify OK → AAL2", async () => {
    const enrolledFactorId = "fid-from-enroll";
    const challenge = vi.fn(async ({ factorId }: { factorId: string }) => {
      expect(factorId).toBe(enrolledFactorId);
      return { data: { id: "chal-1" }, error: null };
    });
    const verify = vi.fn(async () => ({ error: null }));
    const refreshSession = vi.fn(async () => ({}));
    const getCurrentAal = vi.fn(async () => "aal2");

    await expect(
      runMfaSetupActivation({
        factorId: enrolledFactorId,
        code: "123456",
        challenge,
        verify,
        refreshSession,
        getCurrentAal,
      }),
    ).resolves.toBe("ok_aal2");

    expect(challenge).toHaveBeenCalledWith({ factorId: enrolledFactorId });
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({
        factorId: enrolledFactorId,
        challengeId: "chal-1",
        code: "123456",
      }),
    );
    expect(refreshSession).toHaveBeenCalled();
  });

  it("mauvais code → erreur FR propre", () => {
    expect(
      mapMfaSetupError({
        code: "mfa_verification_failed",
        message: "Invalid TOTP code entered",
      }),
    ).toMatch(/incorrect/i);
  });
});

describe("architecture Server Actions (pas de MFA browser)", () => {
  it("formulaire n’utilise plus createClient browser / mfa.enroll client", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).toMatch(/startMfaEnrollment/);
    expect(src).toMatch(/activateMfaEnrollment/);
    expect(src).toMatch(/restartMfaEnrollment/);
    expect(src).not.toMatch(/lib\/supabase\/client/);
    expect(src).not.toMatch(/auth\.mfa\.enroll/);
    expect(src).not.toMatch(/auth\.mfa\.challenge/);
    expect(src).not.toMatch(/probeBrowserSupabaseAuthCookies/);
    expect(src).not.toMatch(/cookies_probe/);
  });

  it("actions serveur exposent enroll/activate/restart", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/auth/mfa-setup-actions.ts"),
      "utf8",
    );
    expect(src).toMatch(/"use server"/);
    expect(src).toMatch(/export async function startMfaEnrollment/);
    expect(src).toMatch(/export async function activateMfaEnrollment/);
    expect(src).toMatch(/export async function restartMfaEnrollment/);
    expect(src).toMatch(/createClient.*server|from \"@\/lib\/supabase\/server\"/);
    expect(src).toMatch(/recordAccessAudit/);
    // Pas de log direct des secrets (accès totp.qr_code pour mapping UI OK).
    expect(src).not.toMatch(/console\.(?:info|log|error|warn)\([^)]*(?:secret|otpauth)/i);
    expect(src).toMatch(/jamais loggés ici/);
  });

  it("aucun secret dans logs diagnostiques", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logMfaSetupDiagnostic("verify", {
      code: "mfa_verification_failed",
      status: 422,
    });
    const payload = JSON.stringify(spy.mock.calls);
    expect(payload).toContain('"step":"verify"');
    expect(payload.toLowerCase()).not.toContain("secret");
    expect(payload.toLowerCase()).not.toContain("otp");
    expect(payload.toLowerCase()).not.toContain("token");
  });
});
