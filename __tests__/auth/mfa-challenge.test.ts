import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveSuperAdminPostLoginMfaPath,
  sanitizeInternalNextPath,
} from "@/lib/auth/mfa-aal";
import {
  isAllowedChallengeFactorId,
  mapMfaChallengeError,
  mapVerifiedTotpFactorOptions,
  MFA_CHALLENGE_ERROR_COOLDOWN_MS,
  pickDefaultChallengeFactorId,
  resolveMfaChallengeAccess,
  resolveTotpVerifyOutcome,
} from "@/lib/auth/mfa-challenge";

const factorA = { id: "fa", label: "Téléphone" };
const factorB = { id: "fb", label: "Tablette" };

describe("resolveMfaChallengeAccess", () => {
  it("non authentifié → login", () => {
    expect(
      resolveMfaChallengeAccess({
        authenticated: false,
        role: null,
        accountStatus: null,
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedFactors: [factorA],
      }),
    ).toMatchObject({ action: "redirect", reason: "unauthenticated" });
  });

  it("non-SA → home du rôle", () => {
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

  it("DISABLED", () => {
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

  it("plusieurs facteurs → allow avec tous", () => {
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

  it("pickDefault + allowed", () => {
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

describe("erreurs challenge", () => {
  it("code incorrect / challenge expiré", () => {
    expect(mapMfaChallengeError({ message: "Invalid code" })).toMatch(
      /incorrect/i,
    );
    expect(mapMfaChallengeError({ message: "Challenge expired" })).toMatch(
      /expiré/i,
    );
    expect(mapMfaChallengeError({ message: "Invalid code" }).toLowerCase()).not.toContain(
      "otp",
    );
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
    // resolveSuperAdminPostLoginMfaPath n’est appelé que pour SA dans signInAction
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

describe("sécurité source challenge", () => {
  it("formulaire : pas d’enroll / unenroll / localStorage / logs", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaChallengeForm.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/\.enroll\(/);
    expect(src).not.toMatch(/\.unenroll\(/);
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toMatch(/console\.(log|debug|info|warn|error)/);
  });
});
