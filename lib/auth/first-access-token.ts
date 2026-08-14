import { createHmac, timingSafeEqual } from "node:crypto";
import { FIRST_ACCESS_TOKEN_TTL_MINUTES } from "@/lib/auth/activation-constants";

function requireFirstAccessSecret(): string {
  const secret = process.env.FIRST_ACCESS_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "FIRST_ACCESS_TOKEN_SECRET manquant ou trop court (min. 16 caractères).",
    );
  }
  return secret;
}

export type FirstAccessKind = "student" | "team";

export interface FirstAccessTokenPayload {
  activationCodeId: string;
  authUserId: string;
  email: string;
  kind: FirstAccessKind;
  exp: number;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", requireFirstAccessSecret())
    .update(payloadB64, "utf8")
    .digest("base64url");
}

export function createFirstAccessToken(options: {
  activationCodeId: string;
  authUserId: string;
  email: string;
  kind: FirstAccessKind;
  ttlMinutes?: number;
}): string {
  const ttl = options.ttlMinutes ?? FIRST_ACCESS_TOKEN_TTL_MINUTES;
  const payload: FirstAccessTokenPayload = {
    activationCodeId: options.activationCodeId,
    authUserId: options.authUserId,
    email: options.email.trim().toLowerCase(),
    kind: options.kind,
    exp: Date.now() + ttl * 60_000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyFirstAccessToken(
  token: string | undefined | null,
): FirstAccessTokenPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as FirstAccessTokenPayload;
    if (
      !payload.activationCodeId ||
      !payload.authUserId ||
      !payload.email ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    const kind: FirstAccessKind =
      payload.kind === "team" ? "team" : "student";
    if (Date.now() > payload.exp) return null;
    return { ...payload, kind };
  } catch {
    return null;
  }
}

export const FIRST_ACCESS_COOKIE_NAME = "ko_first_access";
