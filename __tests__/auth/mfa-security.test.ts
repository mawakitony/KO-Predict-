import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canRemoveVerifiedTotpFactor,
  isRemovableSecondaryFactor,
  mfaStatusLabel,
  resolveAccountSecurityAccess,
  resolveAdditionalTotpEnrollPrep,
} from "@/lib/auth/mfa-security";

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
  it("cleanup unverified avant enroll additionnel", () => {
    expect(
      resolveAdditionalTotpEnrollPrep([
        { id: "v", status: "verified" },
        { id: "u", status: "unverified" },
      ]),
    ).toEqual({ unverifiedIdsToRemove: ["u"] });
  });

  it("mfaStatusLabel", () => {
    expect(mfaStatusLabel(0)).toBe("Non activé");
    expect(mfaStatusLabel(2)).toBe("Activé");
  });
});

describe("sécurité source Phase E", () => {
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
    expect(add).not.toMatch(/console\.(log|debug|info)/);
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
