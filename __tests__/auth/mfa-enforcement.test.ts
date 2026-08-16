import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MFA_AAL2_REQUIRED,
  resolveSuperAdminMfaApiGate,
  resolveSuperAdminMfaGate,
} from "@/lib/auth/mfa-aal";

describe("enforcement layout (resolveSuperAdminMfaGate)", () => {
  it("super_admin AAL1 + 0 facteur → setup", () => {
    expect(
      resolveSuperAdminMfaGate({
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        nextLevel: "aal1",
        verifiedTotpFactorCount: 0,
        nextPath: "/admin",
      }),
    ).toEqual({
      action: "redirect",
      to: "/auth/mfa/setup",
      reason: "no_verified_factor",
    });
  });

  it("super_admin AAL1 + facteur → challenge", () => {
    expect(
      resolveSuperAdminMfaGate({
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
        nextLevel: "aal2",
        verifiedTotpFactorCount: 1,
        nextPath: "/admin",
      }),
    ).toEqual({
      action: "redirect",
      to: "/auth/mfa/challenge",
      reason: "aal1_needs_challenge",
      next: "/admin",
    });
  });

  it("super_admin AAL2 → allow", () => {
    expect(
      resolveSuperAdminMfaGate({
        activeSuperAdminCount: 2,
        currentLevel: "aal2",
        nextLevel: "aal2",
        verifiedTotpFactorCount: 1,
      }),
    ).toEqual({ action: "allow", reason: "aal2_ok" });
  });

  it("count SA < 2 → enforcement off", () => {
    expect(
      resolveSuperAdminMfaGate({
        activeSuperAdminCount: 1,
        currentLevel: "aal1",
        nextLevel: "aal1",
        verifiedTotpFactorCount: 0,
      }),
    ).toEqual({ action: "allow", reason: "enforcement_disabled" });
  });
});

describe("enforcement API (resolveSuperAdminMfaApiGate)", () => {
  it("super_admin AAL1 → 403 MFA_AAL2_REQUIRED", () => {
    expect(
      resolveSuperAdminMfaApiGate({
        role: "super_admin",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
      }),
    ).toEqual({ action: "forbid", reasonCode: MFA_AAL2_REQUIRED });
  });

  it("super_admin AAL2 → OK", () => {
    expect(
      resolveSuperAdminMfaApiGate({
        role: "super_admin",
        activeSuperAdminCount: 2,
        currentLevel: "aal2",
      }),
    ).toEqual({ action: "allow", reason: "aal2_ok" });
  });

  it("count SA < 2 → enforcement off", () => {
    expect(
      resolveSuperAdminMfaApiGate({
        role: "super_admin",
        activeSuperAdminCount: 1,
        currentLevel: "aal1",
      }),
    ).toEqual({ action: "allow", reason: "enforcement_disabled" });
  });

  it("admin normal → inchangé (allow)", () => {
    expect(
      resolveSuperAdminMfaApiGate({
        role: "admin",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
      }),
    ).toEqual({ action: "allow", reason: "not_super_admin" });
  });

  it("coach normal → inchangé (allow)", () => {
    expect(
      resolveSuperAdminMfaApiGate({
        role: "coach",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
      }),
    ).toEqual({ action: "allow", reason: "not_super_admin" });
  });

  it("student → not_super_admin (layout/API role gate séparé)", () => {
    expect(
      resolveSuperAdminMfaApiGate({
        role: "student",
        activeSuperAdminCount: 2,
        currentLevel: "aal1",
      }),
    ).toEqual({ action: "allow", reason: "not_super_admin" });
  });

  it("promote-super-admin AAL1 bloqué (même code API)", () => {
    const d = resolveSuperAdminMfaApiGate({
      role: "super_admin",
      activeSuperAdminCount: 2,
      currentLevel: "aal1",
    });
    expect(d).toEqual({ action: "forbid", reasonCode: "MFA_AAL2_REQUIRED" });
  });
});

describe("câblage Phase D", () => {
  it("layout admin appelle enforceSuperAdminMfaInAdminArea", () => {
    const src = readFileSync(
      join(process.cwd(), "app/admin/layout.tsx"),
      "utf8",
    );
    expect(src).toMatch(/enforceSuperAdminMfaInAdminArea/);
    expect(src).toMatch(/requireAdmin/);
  });

  it("requirePermissionApi appelle assertSuperAdminAal2Api", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/admin/require-admin-api.ts"),
      "utf8",
    );
    expect(src).toMatch(/assertSuperAdminAal2Api/);
  });

  it("pages MFA hors layout admin (pas d’AAL2 sur elles-mêmes)", () => {
    const setup = readFileSync(
      join(process.cwd(), "app/auth/mfa/setup/page.tsx"),
      "utf8",
    );
    const challenge = readFileSync(
      join(process.cwd(), "app/auth/mfa/challenge/page.tsx"),
      "utf8",
    );
    expect(setup).not.toMatch(/enforceSuperAdminMfaInAdminArea/);
    expect(challenge).not.toMatch(/enforceSuperAdminMfaInAdminArea/);
    expect(setup).not.toMatch(/assertSuperAdminAal2Api/);
    expect(challenge).not.toMatch(/assertSuperAdminAal2Api/);
  });
});
