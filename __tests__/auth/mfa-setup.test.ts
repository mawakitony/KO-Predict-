import { describe, expect, it, vi, afterEach } from "vitest";
import {
  assertFactorReadyForChallenge,
  extractAuthErrorCode,
  logMfaSetupDiagnostic,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  MFA_FACTOR_STALE_MESSAGE,
  normalizeTotpQrDataUrl,
  throwMfaStepError,
} from "@/lib/auth/mfa-setup";
import { readFileSync } from "node:fs";
import { join } from "node:path";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeTotpQrDataUrl / mapTotpEnrollForDisplay", () => {
  it("QR data URL correctement encodée (SVG brut préfixé par supabase-js)", () => {
    const rawSvg = "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>";
    const fromClient = `data:image/svg+xml;utf-8,${rawSvg}`;
    const normalized = normalizeTotpQrDataUrl(fromClient);
    expect(normalized.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(
      true,
    );
    expect(normalized).not.toContain("<svg");
    expect(normalized).toContain(encodeURIComponent("<svg"));
  });

  it("QR déjà percent-encodé reste valide", () => {
    const encoded = encodeURIComponent("<svg></svg>");
    const input = `data:image/svg+xml;charset=utf-8,${encoded}`;
    expect(normalizeTotpQrDataUrl(input)).toBe(input);
  });

  it("mapTotpEnrollForDisplay utilise la normalisation", () => {
    const display = mapTotpEnrollForDisplay({
      id: "factor-1",
      totp: {
        qr_code: "data:image/svg+xml;utf-8,<svg><path d='M0'/></svg>",
        secret: "SECRETVALUE",
      },
    });
    expect(display.factorId).toBe("factor-1");
    expect(display.qrDataUrl).toContain("charset=utf-8");
    expect(display.qrDataUrl).not.toMatch(/,<svg/);
    expect(display.manualSecret).toBe("SECRETVALUE");
  });
});

describe("assertFactorReadyForChallenge", () => {
  it("factorId absent avant challenge → erreur propre", () => {
    expect(
      assertFactorReadyForChallenge(
        [{ id: "other", status: "unverified" }],
        "missing-id",
      ),
    ).toEqual({ ok: false, reason: "missing" });
    expect(mapMfaSetupError({ code: "factor_missing" })).toBe(
      MFA_FACTOR_STALE_MESSAGE,
    );
  });

  it("facteur verified → not_unverified", () => {
    expect(
      assertFactorReadyForChallenge(
        [{ id: "f1", status: "verified" }],
        "f1",
      ),
    ).toEqual({ ok: false, reason: "not_unverified" });
  });

  it("unverified OK", () => {
    expect(
      assertFactorReadyForChallenge(
        [{ id: "f1", status: "unverified" }],
        "f1",
      ),
    ).toEqual({ ok: true });
  });
});

describe("AuthError propagation", () => {
  it("AuthError challenge propagée", () => {
    const err = {
      name: "AuthApiError",
      message: "MFA factor no longer exists",
      code: "mfa_factor_not_found",
      status: 422,
    };
    expect(() => throwMfaStepError("challenge", err)).toThrow();
    try {
      throwMfaStepError("challenge", err);
    } catch (e) {
      expect(e).toBe(err);
      expect(extractAuthErrorCode(e)).toBe("mfa_factor_not_found");
    }
  });

  it("AuthError verify propagée", () => {
    const err = {
      name: "AuthApiError",
      message: "Invalid TOTP code entered",
      code: "mfa_verification_failed",
      status: 422,
    };
    try {
      throwMfaStepError("verify", err);
    } catch (e) {
      expect(e).toBe(err);
      expect(mapMfaSetupError(e)).toMatch(/incorrect/i);
    }
  });

  it("mapping FR conservé", () => {
    expect(
      mapMfaSetupError({ code: "mfa_challenge_expired" }),
    ).toMatch(/expiré/i);
    expect(
      mapMfaSetupError({ code: "mfa_ip_address_mismatch" }),
    ).toMatch(/réseau|connexion/i);
  });
});

describe("diagnostic logs sans secret", () => {
  it("aucun secret loggé", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logMfaSetupDiagnostic("verify", {
      code: "mfa_verification_failed",
      status: 422,
      message: "Invalid TOTP code entered",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.stringify(spy.mock.calls[0]);
    expect(payload).toContain("mfa_verification_failed");
    expect(payload).toContain('"step":"verify"');
    expect(payload.toLowerCase()).not.toContain("secret");
    expect(payload.toLowerCase()).not.toContain("otp");
    expect(payload.toLowerCase()).not.toContain("qr");
    expect(payload.toLowerCase()).not.toContain("token");
  });

  it("formulaire n’utilise plus new Error('challenge')", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).toMatch(/throwMfaStepError\("challenge"/);
    expect(src).toMatch(/assertFactorReadyForChallenge/);
    expect(src).not.toMatch(/new Error\(["']challenge["']\)/);
  });
});
