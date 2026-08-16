import { describe, expect, it } from "vitest";
import {
  countVerifiedTotpFactors,
  extractAuthErrorCode,
  isValidTotpCode,
  listUnverifiedTotpFactorIds,
  listUnverifiedTotpFactorIdsExcluding,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  resolveMfaSetupAccess,
  resolveTotpEnrollPrep,
  resolveTotpMountPrep,
  resolveTotpRestartCleanupIds,
  resolveTotpVerifyOutcome,
  shouldPreserveEnrollmentUiOnSubmitError,
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
});

describe("remount / cleanup", () => {
  it("remount ne supprime pas le facteur courant (mount prep sans cleanup)", () => {
    const prep = resolveTotpMountPrep([
      { id: "current-ui-factor", status: "unverified" },
    ]);
    expect(prep).toEqual({ action: "enroll" });
    expect(resolveTotpEnrollPrep([{ id: "current-ui-factor", status: "unverified" }])).toEqual({
      action: "enroll",
      unverifiedIdsToRemove: [],
    });
  });

  it("cleanup programmatique exclut le factorId courant", () => {
    expect(
      listUnverifiedTotpFactorIdsExcluding(
        [
          { id: "keep", status: "unverified" },
          { id: "old", status: "unverified" },
          { id: "v", status: "verified" },
        ],
        "keep",
      ),
    ).toEqual(["old"]);
  });

  it("Recommencer nettoie tous les unverified puis ré-enroll", () => {
    expect(
      resolveTotpRestartCleanupIds([
        { id: "a", status: "unverified" },
        { id: "b", status: "unverified" },
        { id: "v", status: "verified" },
      ]),
    ).toEqual(["a", "b"]);
  });

  it("formulaire : pas de cleanup auto au mount", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).toMatch(/resolveTotpMountPrep/);
    expect(src).toMatch(/Recommencer la configuration/);
    expect(src).not.toMatch(/unverifiedIdsToRemove/);
    // unenroll seulement dans onRestart
    const mountBlock = src.slice(
      src.indexOf("useEffect"),
      src.indexOf("function onSubmit"),
    );
    expect(mountBlock).not.toMatch(/\.unenroll\(/);
  });
});

describe("erreur challenge conserve QR/factorId", () => {
  it("shouldPreserveEnrollmentUiOnSubmitError", () => {
    expect(shouldPreserveEnrollmentUiOnSubmitError()).toBe(true);
  });

  it("catch submit ne clear pas QR dans le source", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    const catchIdx = src.indexOf("} catch (err) {\n        // Conserve QR");
    expect(catchIdx).toBeGreaterThan(-1);
    const catchBlock = src.slice(catchIdx, catchIdx + 200);
    expect(catchBlock).not.toMatch(/setQrDataUrl\(null\)/);
    expect(catchBlock).not.toMatch(/setFactorId\(null\)/);
    expect(catchBlock).not.toMatch(/enrollFresh/);
  });
});

describe("mapMfaSetupError via error.code", () => {
  it("mfa_verification_failed", () => {
    expect(
      mapMfaSetupError({ code: "mfa_verification_failed", message: "x" }),
    ).toMatch(/incorrect/i);
  });

  it("mfa_factor_not_found → message FR dédié", () => {
    expect(
      mapMfaSetupError({ code: "mfa_factor_not_found", message: "gone" }),
    ).toMatch(/Recommencer/i);
  });

  it("mfa_challenge_expired → message FR dédié", () => {
    expect(
      mapMfaSetupError({ code: "mfa_challenge_expired", message: "expired" }),
    ).toMatch(/expiré/i);
  });

  it("mfa_ip_address_mismatch → message FR dédié", () => {
    expect(
      mapMfaSetupError({
        code: "mfa_ip_address_mismatch",
        message: "mismatch",
      }),
    ).toMatch(/réseau|connexion/i);
  });

  it("extractAuthErrorCode", () => {
    expect(extractAuthErrorCode({ code: "mfa_factor_not_found" })).toBe(
      "mfa_factor_not_found",
    );
    expect(extractAuthErrorCode(null)).toBeNull();
  });
});

describe("verify OK + refresh → AAL2", () => {
  it("resolveTotpVerifyOutcome après refresh", () => {
    expect(resolveTotpVerifyOutcome("aal2")).toBe("ok_aal2");
    expect(resolveTotpVerifyOutcome("aal1")).toBe("aal_incomplete");
  });

  it("formulaire appelle refreshSession avant getAuthenticatorAssuranceLevel", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    const refreshIdx = src.indexOf("refreshSession");
    const aalIdx = src.indexOf("getAuthenticatorAssuranceLevel");
    expect(refreshIdx).toBeGreaterThan(-1);
    expect(aalIdx).toBeGreaterThan(refreshIdx);
  });
});

describe("helpers inchangés", () => {
  it("liste unverified / count", () => {
    expect(
      listUnverifiedTotpFactorIds([
        { id: "a", status: "verified" },
        { id: "b", status: "unverified" },
      ]),
    ).toEqual(["b"]);
    expect(
      countVerifiedTotpFactors([{ id: "a", status: "verified" }]),
    ).toBe(1);
  });

  it("isValidTotpCode + display map", () => {
    expect(isValidTotpCode("123456")).toBe(true);
    const display = mapTotpEnrollForDisplay({
      id: "f1",
      totp: { qr_code: "data:image/svg+xml;base64,x", secret: "ABC" },
    });
    expect(display.factorId).toBe("f1");
  });

  it("pas de localStorage", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/localStorage/);
    expect(src).not.toMatch(/sessionStorage/);
  });
});
