import { describe, expect, it } from "vitest";
import {
  buildMfaChallengeHref,
  isSuperAdminMfaEnforcementEnabled,
  normalizeAalLevel,
  resolveSuperAdminMfaApiGate,
  resolveSuperAdminMfaGate,
  resolveSuperAdminPostLoginMfaPath,
  sanitizeInternalNextPath,
} from "@/lib/auth/mfa-aal";

describe("mfa-aal helpers", () => {
  it("normalizeAalLevel", () => {
    expect(normalizeAalLevel("aal1")).toBe("aal1");
    expect(normalizeAalLevel("aal2")).toBe("aal2");
    expect(normalizeAalLevel(null)).toBeNull();
    expect(normalizeAalLevel("nope")).toBeNull();
  });

  it("enforcement seulement si count >= 2", () => {
    expect(isSuperAdminMfaEnforcementEnabled(0)).toBe(false);
    expect(isSuperAdminMfaEnforcementEnabled(1)).toBe(false);
    expect(isSuperAdminMfaEnforcementEnabled(2)).toBe(true);
    expect(isSuperAdminMfaEnforcementEnabled(3)).toBe(true);
  });

  it("count < 2 → allow (enforcement_disabled)", () => {
    const d = resolveSuperAdminMfaGate({
      activeSuperAdminCount: 1,
      currentLevel: "aal1",
      nextLevel: "aal1",
      verifiedTotpFactorCount: 0,
    });
    expect(d).toEqual({ action: "allow", reason: "enforcement_disabled" });
  });

  it("0 facteur verified → setup", () => {
    const d = resolveSuperAdminMfaGate({
      activeSuperAdminCount: 2,
      currentLevel: "aal1",
      nextLevel: "aal1",
      verifiedTotpFactorCount: 0,
    });
    expect(d).toEqual({
      action: "redirect",
      to: "/auth/mfa/setup",
      reason: "no_verified_factor",
    });
  });

  it("facteur + AAL1 → challenge", () => {
    const d = resolveSuperAdminMfaGate({
      activeSuperAdminCount: 2,
      currentLevel: "aal1",
      nextLevel: "aal2",
      verifiedTotpFactorCount: 1,
      nextPath: "/admin/team",
    });
    expect(d).toEqual({
      action: "redirect",
      to: "/auth/mfa/challenge",
      reason: "aal1_needs_challenge",
      next: "/admin/team",
    });
  });

  it("AAL2 → allow", () => {
    const d = resolveSuperAdminMfaGate({
      activeSuperAdminCount: 2,
      currentLevel: "aal2",
      nextLevel: "aal2",
      verifiedTotpFactorCount: 1,
    });
    expect(d).toEqual({ action: "allow", reason: "aal2_ok" });
  });

  it("buildMfaChallengeHref ignore next dangereux", () => {
    expect(buildMfaChallengeHref("/admin/team")).toBe(
      "/auth/mfa/challenge?next=%2Fadmin%2Fteam",
    );
    expect(buildMfaChallengeHref("//evil.com")).toBe("/auth/mfa/challenge");
    expect(buildMfaChallengeHref("/auth/mfa/setup")).toBe(
      "/auth/mfa/challenge",
    );
    expect(buildMfaChallengeHref("https://evil.com")).toBe(
      "/auth/mfa/challenge",
    );
  });

  it("sanitizeInternalNextPath", () => {
    expect(sanitizeInternalNextPath("/admin")).toBe("/admin");
    expect(sanitizeInternalNextPath("//evil.com")).toBeNull();
    expect(sanitizeInternalNextPath("https://x.com")).toBeNull();
    expect(sanitizeInternalNextPath("/auth/mfa/setup")).toBeNull();
  });

  it("API gate : SA AAL1 forbiden, admin allow", () => {
    expect(
      resolveSuperAdminMfaApiGate({
        role: "super_admin",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
      }).action,
    ).toBe("forbid");
    expect(
      resolveSuperAdminMfaApiGate({
        role: "admin",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
      }).action,
    ).toBe("allow");
  });

  it("post-login path : setup / challenge / null", () => {
    expect(
      resolveSuperAdminPostLoginMfaPath({
        activeSuperAdminCount: 1,
        currentLevel: "aal1",
        verifiedTotpFactorCount: 0,
        intendedDestination: "/admin",
      }),
    ).toBeNull();

    expect(
      resolveSuperAdminPostLoginMfaPath({
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedTotpFactorCount: 0,
        intendedDestination: "/admin",
      }),
    ).toBe("/auth/mfa/setup");

    expect(
      resolveSuperAdminPostLoginMfaPath({
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        verifiedTotpFactorCount: 2,
        intendedDestination: "/admin/team",
      }),
    ).toBe("/auth/mfa/challenge?next=%2Fadmin%2Fteam");

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
