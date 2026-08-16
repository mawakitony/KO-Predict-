import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertCleanupNeverIncludesVerified,
  canRemoveVerifiedTotpFactor,
  isRemovableSecondaryFactor,
  listUnverifiedFactorIdsForCleanup,
  mapAdditionalMfaFactorDenial,
  mfaStatusLabel,
  resolveAccountSecurityAccess,
  resolveAdditionalMfaFactorGate,
  resolveAdditionalTotpEnrollPrep,
} from "@/lib/auth/mfa-security";
import { mapMfaSetupError } from "@/lib/auth/mfa-setup";

describe("resolveAccountSecurityAccess", () => {
  it("AAL1 → redirection challenge", () => {
    expect(
      resolveAccountSecurityAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal1",
        verifiedTotpFactorCount: 1,
      }),
    ).toEqual({
      action: "redirect",
      to: "/auth/mfa/challenge?next=%2Faccount%2Fsecurity",
      reason: "needs_challenge",
    });
  });

  it("AAL2 → page accessible", () => {
    expect(
      resolveAccountSecurityAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal2",
        verifiedTotpFactorCount: 1,
      }),
    ).toEqual({ action: "allow" });
  });

  it("non-SA → interdit", () => {
    expect(
      resolveAccountSecurityAccess({
        authenticated: true,
        role: "admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal2",
        verifiedTotpFactorCount: 1,
      }),
    ).toMatchObject({ action: "redirect", reason: "not_super_admin" });
  });

  it("DISABLED → interdit", () => {
    expect(
      resolveAccountSecurityAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "DISABLED",
        currentLevel: "aal2",
        verifiedTotpFactorCount: 1,
      }),
    ).toMatchObject({ action: "redirect", reason: "disabled" });
  });

  it("0 facteur → setup", () => {
    expect(
      resolveAccountSecurityAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal1",
        verifiedTotpFactorCount: 0,
      }),
    ).toMatchObject({ action: "redirect", reason: "needs_setup" });
  });
});

describe("resolveAdditionalMfaFactorGate (Phase H)", () => {
  it("AAL1 refusé", () => {
    expect(
      resolveAdditionalMfaFactorGate({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal1",
        verifiedTotpFactorCount: 1,
        activeSuperAdminCount: 2,
      }),
    ).toEqual({ action: "deny", code: "aal2_required" });
    expect(mapAdditionalMfaFactorDenial("aal2_required")).toMatch(/AAL2/i);
  });

  it("non-SA refusé", () => {
    expect(
      resolveAdditionalMfaFactorGate({
        authenticated: true,
        role: "admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal2",
        verifiedTotpFactorCount: 1,
        activeSuperAdminCount: 2,
      }),
    ).toEqual({ action: "deny", code: "not_super_admin" });
  });

  it("AAL2 + SA + enforcement → allow", () => {
    expect(
      resolveAdditionalMfaFactorGate({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal2",
        verifiedTotpFactorCount: 1,
        activeSuperAdminCount: 2,
      }),
    ).toEqual({ action: "allow" });
  });

  it("count < 2 → enforcement off", () => {
    expect(
      resolveAdditionalMfaFactorGate({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        currentLevel: "aal2",
        verifiedTotpFactorCount: 1,
        activeSuperAdminCount: 1,
      }),
    ).toEqual({ action: "deny", code: "enforcement_disabled" });
  });
});

describe("suppression facteurs", () => {
  it("1 facteur → suppression interdite", () => {
    expect(canRemoveVerifiedTotpFactor(1)).toBe(false);
    expect(
      isRemovableSecondaryFactor({
        factorId: "a",
        verifiedFactors: [{ id: "a", label: "Phone" }],
      }),
    ).toBe(false);
  });

  it("2 facteurs → suppression d’un secondaire OK", () => {
    const factors = [
      { id: "a", label: "Phone" },
      { id: "b", label: "Tablet" },
    ];
    expect(canRemoveVerifiedTotpFactor(2)).toBe(true);
    expect(
      isRemovableSecondaryFactor({ factorId: "b", verifiedFactors: factors }),
    ).toBe(true);
  });
});

describe("ajout 2e facteur + labels", () => {
  it("cleanup unverified uniquement — premier verified conservé", () => {
    const factors = [
      { id: "v1", status: "verified" },
      { id: "u1", status: "unverified" },
    ];
    const cleanup = listUnverifiedFactorIdsForCleanup(factors);
    expect(cleanup).toEqual(["u1"]);
    expect(assertCleanupNeverIncludesVerified(cleanup, factors)).toBe(true);
    expect(resolveAdditionalTotpEnrollPrep(factors)).toEqual({
      unverifiedIdsToRemove: ["u1"],
    });
  });

  it("mauvais code → message FR", () => {
    expect(
      mapMfaSetupError({
        code: "mfa_verification_failed",
        message: "Invalid TOTP code entered",
      }),
    ).toMatch(/incorrect/i);
  });

  it("mfaStatusLabel", () => {
    expect(mfaStatusLabel(0)).toBe("Non activé");
    expect(mfaStatusLabel(2)).toBe("Activé");
  });
});

describe("sécurité source Phase E / H", () => {
  it("signOut global présent", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/auth/mfa-security-actions.ts"),
      "utf8",
    );
    expect(src).toMatch(/signOut\(\{\s*scope:\s*["']global["']\s*\}\)/);
    expect(src).toMatch(/MFA_FACTOR_REMOVED/);
    expect(src).not.toMatch(/qr_code/);
    expect(src).not.toMatch(/totp\.secret/);
    expect(src).not.toMatch(/\botp\b/i);
  });

  it("ajout 2e facteur via Server Actions SSR", () => {
    const actions = readFileSync(
      join(process.cwd(), "lib/auth/mfa-additional-actions.ts"),
      "utf8",
    );
    const add = readFileSync(
      join(process.cwd(), "components/account/MfaAddFactorForm.tsx"),
      "utf8",
    );
    expect(actions).toMatch(/"use server"/);
    expect(actions).toMatch(/startAdditionalMfaFactor/);
    expect(actions).toMatch(/activateAdditionalMfaFactor/);
    expect(actions).toMatch(/restartAdditionalMfaFactor/);
    expect(actions).toMatch(/MFA_FACTOR_ADDED/);
    expect(actions).toMatch(/from \"@\/lib\/supabase\/server\"/);
    expect(actions).toMatch(/assertCleanupNeverIncludesVerified/);
    expect(add).toMatch(/startAdditionalMfaFactor/);
    expect(add).not.toMatch(/lib\/supabase\/client/);
    expect(add).not.toMatch(/auth\.mfa\.enroll/);
    expect(add).not.toMatch(/localStorage/);
  });

  it("aucun secret persisté dans composants account", () => {
    const panel = readFileSync(
      join(process.cwd(), "components/account/AccountSecurityPanel.tsx"),
      "utf8",
    );
    const add = readFileSync(
      join(process.cwd(), "components/account/MfaAddFactorForm.tsx"),
      "utf8",
    );
    expect(panel).not.toMatch(/localStorage/);
    expect(add).not.toMatch(/localStorage/);
    expect(add).not.toMatch(/sessionStorage/);
  });

  it("audit events déclarés", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/auth/access-audit.ts"),
      "utf8",
    );
    expect(src).toMatch(/MFA_ENROLLED/);
    expect(src).toMatch(/MFA_FACTOR_ADDED/);
    expect(src).toMatch(/MFA_FACTOR_REMOVED/);
  });
});
