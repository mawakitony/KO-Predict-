import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVATION_CODE_LOCK_MINUTES,
  ACTIVATION_CODE_MAX_ATTEMPTS,
  ACTIVATION_CODE_TTL_HOURS,
} from "@/lib/auth/activation-constants";
import {
  activationCodesMatch,
  generateActivationCodePlaintext,
  hashActivationCode,
  normalizeActivationCode,
} from "@/lib/auth/activation-code-crypto";
import {
  createFirstAccessToken,
  verifyFirstAccessToken,
} from "@/lib/auth/first-access-token";

describe("activation code crypto", () => {
  const prevPepper = process.env.ACTIVATION_CODE_PEPPER;
  const prevSecret = process.env.FIRST_ACCESS_TOKEN_SECRET;

  beforeEach(() => {
    process.env.ACTIVATION_CODE_PEPPER = "test-pepper-activation-32chars!!";
    process.env.FIRST_ACCESS_TOKEN_SECRET =
      "test-first-access-secret-32chars!";
  });

  afterEach(() => {
    process.env.ACTIVATION_CODE_PEPPER = prevPepper;
    process.env.FIRST_ACCESS_TOKEN_SECRET = prevSecret;
  });

  it("génère un code KP-XXXX-XXXX", () => {
    const code = generateActivationCodePlaintext();
    expect(code).toMatch(/^KP-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it("hash + compare (insensible à la casse / espaces)", () => {
    const code = "KP-7M4X-92QF";
    const hash = hashActivationCode(code);
    expect(hash).not.toContain("KP-");
    expect(activationCodesMatch("kp-7m4x-92qf", hash)).toBe(true);
    expect(activationCodesMatch(" KP-7M4X-92QF ", hash)).toBe(true);
    expect(activationCodesMatch("KP-AAAA-BBBB", hash)).toBe(false);
  });

  it("normalise le code", () => {
    expect(normalizeActivationCode(" kp-ab12-cd34 ")).toBe("KP-AB12-CD34");
  });

  it("constantes TTL / lock documentées", () => {
    expect(ACTIVATION_CODE_TTL_HOURS).toBe(72);
    expect(ACTIVATION_CODE_MAX_ATTEMPTS).toBe(8);
    expect(ACTIVATION_CODE_LOCK_MINUTES).toBe(15);
  });

  it("cookie first-access signé et expirant", () => {
    const token = createFirstAccessToken({
      activationCodeId: "code-1",
      authUserId: "user-1",
      email: "marie@example.com",
      kind: "student",
      ttlMinutes: 15,
    });
    const payload = verifyFirstAccessToken(token);
    expect(payload?.activationCodeId).toBe("code-1");
    expect(payload?.authUserId).toBe("user-1");
    expect(payload?.email).toBe("marie@example.com");
    expect(payload?.kind).toBe("student");

    expect(verifyFirstAccessToken("invalid")).toBeNull();
    expect(verifyFirstAccessToken(`${token}x`)).toBeNull();
  });
});
