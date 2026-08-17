import { createHmac, timingSafeEqual } from "node:crypto";
import { PASSWORD_RESET_TOKEN_TTL_MINUTES } from "@/lib/auth/password-reset-constants";

function requirePasswordResetTokenSecret(): string {
  const secret = process.env.PASSWORD_RESET_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "PASSWORD_RESET_TOKEN_SECRET manquant ou trop court (min. 16 caractères).",
    );
  }
  return secret;
}

export interface PasswordResetTokenPayload {
  passwordResetCodeId: string;
  studentId: string;
  authUserId: string;
  email: string;
  exp: number;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", requirePasswordResetTokenSecret())
    .update(payloadB64, "utf8")
    .digest("base64url");
}

export function createPasswordResetToken(options: {
  passwordResetCodeId: string;
  studentId: string;
  authUserId: string;
  email: string;
  ttlMinutes?: number;
}): string {
  const ttl = options.ttlMinutes ?? PASSWORD_RESET_TOKEN_TTL_MINUTES;
  const payload: PasswordResetTokenPayload = {
    passwordResetCodeId: options.passwordResetCodeId,
    studentId: options.studentId,
    authUserId: options.authUserId,
    email: options.email.trim().toLowerCase(),
    exp: Date.now() + ttl * 60_000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyPasswordResetToken(
  token: string | undefined | null,
): PasswordResetTokenPayload | null {
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
    ) as PasswordResetTokenPayload;
    if (
      !payload.passwordResetCodeId ||
      !payload.studentId ||
      !payload.authUserId ||
      !payload.email ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Cookie HttpOnly distinct de ko_first_access. */
export const PASSWORD_RESET_COOKIE_NAME = "ko_password_reset";
