import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveSuperAdminPostLoginMfaPath,
  sanitizeInternalNextPath,
} from "@/lib/auth/mfa-aal";
import {
  isAllowedChallengeFactorId,
  logMfaChallengeDiagnostic,
  mapMfaChallengeAccessDenial,
  mapMfaChallengeError,
  mapVerifiedTotpFactorOptions,
  MFA_CHALLENGE_ERROR_COOLDOWN_MS,
  MFA_CHALLENGE_FACTOR_ABSENT_MESSAGE,
  pickDefaultChallengeFactorId,
  resolveChallengeVerifiedFactorId,
  resolveMfaChallengeAccess,
  resolveTotpVerifyOutcome,
  runMfaChallengeVerification,
} from "@/lib/auth/mfa-challenge";

afterEach(() => {
  vi.restoreAllMocks();
});

const factorA = { id: "fa", label: "Téléphone" };
const factorB = { id: "fb", label: "Tablette" };

describe("resolveMfaChallengeAccess", () => {
  it("session absente → refus", () => {
    const access = resolveMfaChallengeAccess({
      authenticated: false,
      role: null,
      accountStatus: null,
      activeSuperAdminCount: 2,
      currentLevel: "aal1",
      verifiedFactors: [factorA],
    });
    expect(access).toMatchObject({
      action: "redirect",
      reason: "unauthenticated",
    });
    if (access.action === "redirect") {
      expect(mapMfaChallengeAccessDenial(access.reason)).toMatch(/session/i);
    }
  });

  it("non-SA → refus", () => {
    expect(
      resolveMfaChallengeAccess({
        authenticated: true,
        role: "admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedFactors: [factorA],
      }),
    ).toEqual({
      action: "redirect",
      to: "/admin",
      reason: "not_super_admin",
    });
  });

  it("DISABLED → refus", () => {
    expect(
      resolveMfaChallengeAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "DISABLED",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedFactors: [factorA],
      }),
    ).toMatchObject({ action: "redirect", reason: "disabled" });
  });

  it("count < 2 → enforcement_disabled vers next", () => {
    expect(
      resolveMfaChallengeAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 1,
        currentLevel: "aal1",
        verifiedFactors: [factorA],
        requestedNext: "/admin/team",
      }),
    ).toEqual({
      action: "redirect",
      to: "/admin/team",
      reason: "enforcement_disabled",
    });
  });

  it("aucun facteur verified → setup", () => {
    expect(
      resolveMfaChallengeAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedFactors: [],
      }),
    ).toEqual({
      action: "redirect",
      to: "/auth/mfa/setup",
      reason: "no_verified_factor",
    });
  });

  it("1 facteur verified + AAL1 → allow_challenge", () => {
    expect(
      resolveMfaChallengeAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedFactors: [factorA],
        requestedNext: "/admin/ecole",
      }),
    ).toEqual({
      action: "allow_challenge",
      factors: [factorA],
      next: "/admin/ecole",
    });
  });

  it("plusieurs facteurs → allow avec tous (choix conservé)", () => {
    const access = resolveMfaChallengeAccess({
      authenticated: true,
      role: "super_admin",
      accountStatus: "ACTIVE",
      activeSuperAdminCount: 2,
      currentLevel: "aal1",
      verifiedFactors: [factorA, factorB],
    });
    expect(access).toMatchObject({
      action: "allow_challenge",
      factors: [factorA, factorB],
      next: "/admin",
    });
    expect(isAllowedChallengeFactorId("fb", [factorA, factorB])).toBe(true);
  });

  it("AAL2 → redirect direct next", () => {
    expect(
      resolveMfaChallengeAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        currentLevel: "aal2",
        verifiedFactors: [factorA],
        requestedNext: "/admin/team",
      }),
    ).toEqual({
      action: "redirect",
      to: "/admin/team",
      reason: "already_aal2",
    });
  });
});

describe("resolveChallengeVerifiedFactorId", () => {
  it("facteur absent → refus", () => {
    expect(resolveChallengeVerifiedFactorId("", [factorA])).toEqual({
      ok: false,
      code: "factor_missing",
    });
    expect(resolveChallengeVerifiedFactorId("unknown", [factorA])).toEqual({
      ok: false,
      code: "factor_not_verified",
    });
    expect(mapMfaChallengeError({ code: "factor_not_verified" })).toBe(
      MFA_CHALLENGE_FACTOR_ABSENT_MESSAGE,
    );
  });

  it("facteur non verified (hors liste verified) → refus", () => {
    expect(resolveChallengeVerifiedFactorId("unverified-id", [factorA])).toEqual(
      {
        ok: false,
        code: "factor_not_verified",
      },
    );
  });

  it("facteur verified → ok pour challenge", () => {
    expect(resolveChallengeVerifiedFactorId("fb", [factorA, factorB])).toEqual({
      ok: true,
      factorId: "fb",
    });
  });
});

describe("multi-facteur + next", () => {
  it("mapVerifiedTotpFactorOptions ignore unverified", () => {
    expect(
      mapVerifiedTotpFactorOptions([
        { id: "1", status: "verified", friendly_name: "Phone" },
        { id: "2", status: "unverified", friendly_name: "Ghost" },
        { id: "3", status: "verified", friendly_name: null },
      ]),
    ).toEqual([
      { id: "1", label: "Phone" },
      { id: "3", label: "Application d’authentification 2" },
    ]);
  });

  it("pickDefault + allowed (multi-facteur conserve le choix)", () => {
    expect(pickDefaultChallengeFactorId([factorA, factorB])).toBe("fa");
    expect(isAllowedChallengeFactorId("fb", [factorA, factorB])).toBe(true);
    expect(isAllowedChallengeFactorId("x", [factorA])).toBe(false);
  });

  it("next externe refusé ; next interne conservé", () => {
    expect(sanitizeInternalNextPath("https://evil.com")).toBeNull();
    expect(sanitizeInternalNextPath("//evil.com")).toBeNull();
    expect(sanitizeInternalNextPath("/admin/team")).toBe("/admin/team");
    expect(
      resolveMfaChallengeAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedFactors: [factorA],
        requestedNext: "https://evil.com",
      }),
    ).toMatchObject({ action: "allow_challenge", next: "/admin" });
  });
});

describe("runMfaChallengeVerification", () => {
  it("facteur verified → challenge puis verify OK → refreshSession → AAL2", async () => {
    const challenge = vi.fn(async ({ factorId }: { factorId: string }) => {
      expect(factorId).toBe("fa");
      return { data: { id: "chal-1" }, error: null };
    });
    const verify = vi.fn(async () => ({ error: null }));
    const refreshSession = vi.fn(async () => ({}));
    const getCurrentAal = vi.fn(async () => "aal2");

    await expect(
      runMfaChallengeVerification({
        factorId: "fa",
        code: "123456",
        challenge,
        verify,
        refreshSession,
        getCurrentAal,
      }),
    ).resolves.toBe("ok_aal2");

    expect(challenge).toHaveBeenCalledWith({ factorId: "fa" });
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({
        factorId: "fa",
        challengeId: "chal-1",
        code: "123456",
      }),
    );
    expect(refreshSession).toHaveBeenCalled();
    expect(getCurrentAal).toHaveBeenCalled();
  });

  it("mauvais code → erreur FR", async () => {
    await expect(
      runMfaChallengeVerification({
        factorId: "fa",
        code: "000000",
        challenge: async () => ({ data: { id: "c1" }, error: null }),
        verify: async () => ({
          error: {
            code: "mfa_verification_failed",
            message: "Invalid TOTP code entered",
          },
        }),
        refreshSession: async () => ({}),
        getCurrentAal: async () => "aal1",
      }),
    ).rejects.toMatchObject({ code: "mfa_verification_failed" });

    expect(
      mapMfaChallengeError({
        code: "mfa_verification_failed",
        message: "Invalid TOTP code entered",
      }),
    ).toMatch(/incorrect/i);
  });

  it("aucun facteur n’est modifié (pas d’enroll/unenroll dans le runner)", async () => {
    const challenge = vi.fn(
      async (args: { factorId: string }) => ({
        data: { id: "c1" },
        error: null as unknown,
      }),
    );
    const verify = vi.fn(
      async (args: {
        factorId: string;
        challengeId: string;
        code: string;
      }) => ({ error: null as unknown }),
    );
    await runMfaChallengeVerification({
      factorId: "fa",
      code: "123456",
      challenge,
      verify,
      refreshSession: async () => ({}),
      getCurrentAal: async () => "aal2",
    });
    expect(challenge.mock.calls[0]?.[0]).toEqual({ factorId: "fa" });
    const verifyArgs = verify.mock.calls[0]?.[0];
    expect(verifyArgs).toBeDefined();
    expect(Object.keys(verifyArgs ?? {})).toEqual([
      "factorId",
      "challengeId",
      "code",
    ]);
  });
});

describe("erreurs challenge", () => {
  it("code incorrect / challenge expiré / facteur absent", () => {
    expect(mapMfaChallengeError({ message: "Invalid code" })).toMatch(
      /incorrect/i,
    );
    expect(mapMfaChallengeError({ message: "Challenge expired" })).toMatch(
      /expiré/i,
    );
    expect(mapMfaChallengeError({ code: "mfa_challenge_expired" })).toMatch(
      /expiré/i,
    );
    expect(mapMfaChallengeError({ code: "mfa_factor_not_found" })).toBe(
      MFA_CHALLENGE_FACTOR_ABSENT_MESSAGE,
    );
    expect(
      mapMfaChallengeError({ message: "Invalid code" }).toLowerCase(),
    ).not.toContain("otp");
  });

  it("verify OK si AAL2", () => {
    expect(resolveTotpVerifyOutcome("aal2")).toBe("ok_aal2");
    expect(resolveTotpVerifyOutcome("aal1")).toBe("aal_incomplete");
  });

  it("cooldown défini", () => {
    expect(MFA_CHALLENGE_ERROR_COOLDOWN_MS).toBeGreaterThanOrEqual(1000);
  });
});

describe("post-login SA (signInAction)", () => {
  it("student/admin/coach inchangés (pas de path MFA pour non-SA helpers)", () => {
    expect(
      resolveSuperAdminPostLoginMfaPath({
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedTotpFactorCount: 0,
        intendedDestination: "/dashboard",
      }),
    ).toBe("/auth/mfa/setup");
  });

  it("super_admin sans facteur → setup", () => {
    expect(
      resolveSuperAdminPostLoginMfaPath({
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedTotpFactorCount: 0,
        intendedDestination: "/admin",
      }),
    ).toBe("/auth/mfa/setup");
  });

  it("super_admin avec facteur → challenge", () => {
    expect(
      resolveSuperAdminPostLoginMfaPath({
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedTotpFactorCount: 1,
        intendedDestination: "/admin/team",
      }),
    ).toBe("/auth/mfa/challenge?next=%2Fadmin%2Fteam");
  });

  it("super_admin AAL2 → destination normale (null)", () => {
    expect(
      resolveSuperAdminPostLoginMfaPath({
        activeSuperAdminCount: 2,
        currentLevel: "aal2",
        verifiedTotpFactorCount: 1,
        intendedDestination: "/admin",
      }),
    ).toBeNull();
  });
});

describe("architecture Server Action challenge (pas de MFA browser)", () => {
  it("formulaire : verifyMfaChallenge SSR, pas createClient / mfa.challenge browser", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaChallengeForm.tsx"),
      "utf8",
    );
    expect(src).toMatch(/verifyMfaChallenge/);
    expect(src).toMatch(/mfa-challenge-actions/);
    expect(src).not.toMatch(/lib\/supabase\/client/);
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/auth\.mfa\.challenge/);
    expect(src).not.toMatch(/auth\.mfa\.verify/);
    expect(src).not.toMatch(/\.enroll\(/);
    expect(src).not.toMatch(/\.unenroll\(/);
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toMatch(/console\.(log|debug|info|warn|error)/);
  });

  it("actions serveur exposent verifyMfaChallenge SSR", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/auth/mfa-challenge-actions.ts"),
      "utf8",
    );
    expect(src).toMatch(/"use server"/);
    expect(src).toMatch(/export async function verifyMfaChallenge/);
    expect(src).toMatch(/from \"@\/lib\/supabase\/server\"/);
    expect(src).toMatch(/runMfaChallengeVerification/);
    expect(src).toMatch(/resolveChallengeVerifiedFactorId/);
    expect(src).not.toMatch(/\.enroll\(/);
    expect(src).not.toMatch(/\.unenroll\(/);
    expect(src).not.toMatch(/console\.(?:info|log|error|warn)\([^)]*(?:secret|otpauth|otp)/i);
  });

  it("aucun secret / OTP dans logs diagnostiques", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logMfaChallengeDiagnostic("verify", {
      code: "mfa_verification_failed",
      message: "Invalid TOTP code entered",
    });
    const payload = JSON.stringify(spy.mock.calls);
    expect(payload.toLowerCase()).not.toContain("otp");
    expect(payload.toLowerCase()).not.toContain("secret");
    expect(payload).not.toContain("123456");
  });
});
