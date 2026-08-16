import { describe, expect, it } from "vitest";
import {
  countVerifiedTotpFactors,
  isValidTotpCode,
  listUnverifiedTotpFactorIds,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  resolveMfaSetupAccess,
  resolveTotpEnrollPrep,
  resolveTotpVerifyOutcome,
} from "@/lib/auth/mfa-setup";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("resolveMfaSetupAccess", () => {
  it("non authentifié → login", () => {
    expect(
      resolveMfaSetupAccess({
        authenticated: false,
        role: null,
        accountStatus: null,
        activeSuperAdminCount: 2,
        verifiedTotpFactorCount: 0,
      }),
    ).toMatchObject({ action: "redirect", reason: "unauthenticated" });
  });

  it("non-super_admin → home du rôle", () => {
    expect(
      resolveMfaSetupAccess({
        authenticated: true,
        role: "admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        verifiedTotpFactorCount: 0,
      }),
    ).toEqual({
      action: "redirect",
      to: "/admin",
      reason: "not_super_admin",
    });
    expect(
      resolveMfaSetupAccess({
        authenticated: true,
        role: "student",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        verifiedTotpFactorCount: 0,
      }),
    ).toEqual({
      action: "redirect",
      to: "/dashboard",
      reason: "not_super_admin",
    });
  });

  it("DISABLED / PENDING", () => {
    expect(
      resolveMfaSetupAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "DISABLED",
        activeSuperAdminCount: 2,
        verifiedTotpFactorCount: 0,
      }),
    ).toMatchObject({ action: "redirect", reason: "disabled" });
    expect(
      resolveMfaSetupAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "PENDING_ACTIVATION",
        activeSuperAdminCount: 2,
        verifiedTotpFactorCount: 0,
      }),
    ).toMatchObject({ action: "redirect", reason: "pending" });
  });

  it("count SA < 2 → enforcement_disabled", () => {
    expect(
      resolveMfaSetupAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 1,
        verifiedTotpFactorCount: 0,
      }),
    ).toEqual({
      action: "redirect",
      to: "/admin",
      reason: "enforcement_disabled",
    });
  });

  it("0 facteur → allow_setup", () => {
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

  it("facteur verified existant → pas de nouvel enroll", () => {
    expect(
      resolveMfaSetupAccess({
        authenticated: true,
        role: "super_admin",
        accountStatus: "ACTIVE",
        activeSuperAdminCount: 2,
        verifiedTotpFactorCount: 1,
      }),
    ).toEqual({
      action: "redirect",
      to: "/admin",
      reason: "already_verified",
    });
  });
});

describe("unverified factor cleanup helpers", () => {
  it("liste uniquement les unverified", () => {
    expect(
      listUnverifiedTotpFactorIds([
        { id: "a", status: "verified" },
        { id: "b", status: "unverified" },
        { id: "c", status: "unverified" },
      ]),
    ).toEqual(["b", "c"]);
  });

  it("count verified", () => {
    expect(
      countVerifiedTotpFactors([
        { id: "a", status: "verified" },
        { id: "b", status: "unverified" },
      ]),
    ).toBe(1);
  });
});

describe("TOTP code + erreurs", () => {
  it("isValidTotpCode", () => {
    expect(isValidTotpCode("123456")).toBe(true);
    expect(isValidTotpCode("12 3456")).toBe(false);
    expect(isValidTotpCode("12345")).toBe(false);
  });

  it("code incorrect → message FR sans secret", () => {
    const msg = mapMfaSetupError({ message: "Invalid TOTP code" });
    expect(msg.toLowerCase()).not.toContain("secret");
    expect(msg.toLowerCase()).not.toContain("qr");
    expect(msg).toMatch(/incorrect/i);
  });
});

describe("enroll / verify (logique pure)", () => {
  it("0 facteur → enroll sans cleanup", () => {
    expect(resolveTotpEnrollPrep([])).toEqual({
      action: "enroll",
      unverifiedIdsToRemove: [],
    });
  });

  it("unverified existants → cleanup puis enroll (pas d’accumulation)", () => {
    expect(
      resolveTotpEnrollPrep([
        { id: "u1", status: "unverified" },
        { id: "u2", status: "unverified" },
      ]),
    ).toEqual({
      action: "enroll",
      unverifiedIdsToRemove: ["u1", "u2"],
    });
  });

  it("verified existant → pas de nouvel enroll", () => {
    expect(
      resolveTotpEnrollPrep([{ id: "v1", status: "verified" }]),
    ).toEqual({ action: "already_verified" });
  });

  it("enroll OK → QR/secret mappés pour affichage mémoire", () => {
    const display = mapTotpEnrollForDisplay({
      id: "factor-1",
      totp: {
        qr_code: "data:image/svg+xml;base64,abc",
        secret: "JBSWY3DPEHPK3PXP",
      },
    });
    expect(display.factorId).toBe("factor-1");
    expect(display.qrDataUrl).toContain("data:image");
    expect(display.manualSecret).toBe("JBSWY3DPEHPK3PXP");
  });

  it("verify OK si AAL2", () => {
    expect(resolveTotpVerifyOutcome("aal2")).toBe("ok_aal2");
    expect(resolveTotpVerifyOutcome("aal1")).toBe("aal_incomplete");
  });
});

describe("pas de secret persisté", () => {
  it("formulaire setup n’utilise ni localStorage ni sessionStorage", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toMatch(/sessionStorage/);
    expect(src).not.toMatch(/console\.(log|debug|info|warn|error)/);
  });

  it("page setup n’écrit pas en DB métier", () => {
    const src = readFileSync(
      join(process.cwd(), "app/auth/mfa/setup/page.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/from\(/);
    expect(src).not.toMatch(/\.insert\(/);
    expect(src).not.toMatch(/\.upsert\(/);
  });
});
