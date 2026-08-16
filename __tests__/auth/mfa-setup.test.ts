import { describe, expect, it, vi, afterEach } from "vitest";
import {
  logMfaSetupDiagnostic,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  MFA_FACTOR_STALE_MESSAGE,
  normalizeTotpQrDataUrl,
  resolveSetupChallengeFactorId,
  runMfaSetupActivation,
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

  it("mapTotpEnrollForDisplay conserve le factorId d’enroll", () => {
    const display = mapTotpEnrollForDisplay({
      id: "enrolled-unverified-id",
      totp: {
        qr_code: "data:image/svg+xml;utf-8,<svg><path d='M0'/></svg>",
        secret: "SECRETVALUE",
      },
    });
    expect(display.factorId).toBe("enrolled-unverified-id");
  });
});

describe("setup challenge factorId (sans listFactors.totp)", () => {
  it("facteur unverified issu de enroll() accepté pour challenge", () => {
    const enrolledId = "factor-unverified-from-enroll";
    // Simule listFactors().data.totp = [] (verified only — vide pendant setup)
    const verifiedOnlyTotp: { id: string; status: string }[] = [];
    expect(verifiedOnlyTotp.find((f) => f.id === enrolledId)).toBeUndefined();

    const resolved = resolveSetupChallengeFactorId(enrolledId);
    expect(resolved).toEqual({ ok: true, factorId: enrolledId });
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

  it("pas de dépendance à listFactors().data.totp pendant setup", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).toMatch(/runMfaSetupActivation/);
    expect(src).toMatch(/resolveSetupChallengeFactorId/);
    expect(src).not.toMatch(/assertFactorReadyForChallenge/);
    // Submit : pas de lookup totp avant challenge — factorId d’état uniquement.
    const submitStart = src.indexOf("function onSubmit");
    const restartStart = src.indexOf("function onRestart");
    const submitBlock = src.slice(submitStart, restartStart);
    expect(submitBlock).not.toMatch(/listed\.data\?\.totp/);
    expect(submitBlock).not.toMatch(/listFactors/);
    expect(submitBlock).toMatch(/runMfaSetupActivation/);
  });
});

describe("runMfaSetupActivation", () => {
  it("enroll factorId → challenge → verify → refresh → AAL2", async () => {
    const enrolledFactorId = "fid-from-enroll";
    const challenge = vi.fn(async ({ factorId }: { factorId: string }) => {
      expect(factorId).toBe(enrolledFactorId);
      return { data: { id: "chal-1" }, error: null };
    });
    const verify = vi.fn(
      async (args: {
        factorId: string;
        challengeId: string;
        code: string;
      }) => {
        expect(args.factorId).toBe(enrolledFactorId);
        expect(args.challengeId).toBe("chal-1");
        expect(args.code).toBe("123456");
        return { error: null };
      },
    );
    const refreshSession = vi.fn(async () => ({ error: null }));
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

    expect(challenge).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(getCurrentAal).toHaveBeenCalledTimes(1);
  });

  it("challenge utilise exactement le factorId retourné par enroll", async () => {
    const challenge = vi.fn(async () => ({
      data: { id: "c1" },
      error: null,
    }));
    await runMfaSetupActivation({
      factorId: "exact-enroll-id",
      code: "654321",
      challenge,
      verify: async () => ({ error: null }),
      refreshSession: async () => ({}),
      getCurrentAal: async () => "aal2",
    });
    expect(challenge).toHaveBeenCalledWith({ factorId: "exact-enroll-id" });
  });

  it("verify utilise le même factorId", async () => {
    const verify = vi.fn(async () => ({ error: null }));
    await runMfaSetupActivation({
      factorId: "same-id",
      code: "111111",
      challenge: async () => ({ data: { id: "ch" }, error: null }),
      verify,
      refreshSession: async () => ({}),
      getCurrentAal: async () => "aal2",
    });
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({ factorId: "same-id", challengeId: "ch" }),
    );
  });

  it("factorId absent → throw factor_missing", async () => {
    await expect(
      runMfaSetupActivation({
        factorId: null,
        code: "123456",
        challenge: async () => ({ data: null, error: null }),
        verify: async () => ({ error: null }),
        refreshSession: async () => ({}),
        getCurrentAal: async () => "aal2",
      }),
    ).rejects.toMatchObject({ code: "factor_missing" });
  });
});

describe("enroll instrumentation + formulaire", () => {
  it("enroll réellement appelé (attempt log + mfa.enroll dans le form)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).toMatch(/logMfaSetupDiagnostic\("enroll"/);
    expect(src).toMatch(/supabase\.auth\.mfa\.enroll/);
    expect(src).toMatch(/code: "attempt"/);
  });

  it("listFactors error ne bloque plus enroll au mount", () => {
    const src = readFileSync(
      join(process.cwd(), "components/auth/MfaSetupForm.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Ne bloque pas enroll/);
    // Mount : log + continue vers enrollFresh (pas de throw listFactors).
    expect(src).toMatch(
      /logMfaSetupDiagnostic\("listFactors", listed\.error\);/,
    );
    expect(src).toMatch(/const display = await enrollFresh/);
  });

  it("aucun secret loggé", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logMfaSetupDiagnostic("enroll", {
      code: "mfa_factor_name_conflict",
      status: 422,
      message: "A factor with this friendly name already exists",
    });
    logMfaSetupDiagnostic("enroll", { code: "attempt", status: null });
    const payload = JSON.stringify(spy.mock.calls);
    expect(payload).toContain('"step":"enroll"');
    expect(payload.toLowerCase()).not.toContain("secret");
    expect(payload.toLowerCase()).not.toContain("otp");
    expect(payload.toLowerCase()).not.toContain("qr");
    expect(payload.toLowerCase()).not.toContain("token");
  });

  it("AuthError enroll propagée", () => {
    const err = {
      name: "AuthApiError",
      message: "session missing",
      code: "session_not_found",
      status: 401,
    };
    try {
      throwMfaStepError("enroll", err);
    } catch (e) {
      expect(e).toBe(err);
    }
  });
});
