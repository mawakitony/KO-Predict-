import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function requirePepper(): string {
  const pepper = process.env.ACTIVATION_CODE_PEPPER?.trim();
  if (!pepper || pepper.length < 16) {
    throw new Error(
      "ACTIVATION_CODE_PEPPER manquant ou trop court (min. 16 caractères).",
    );
  }
  return pepper;
}

/** Alphabet sans ambiguïté (pas de 0/O/1/I). */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Génère un code affiché une seule fois : KP-XXXX-XXXX
 * (jamais stocké ni loggé après retour à l’admin).
 */
export function generateActivationCodePlaintext(): string {
  const bytes = randomBytes(8);
  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return `KP-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function normalizeActivationCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashActivationCode(plaintext: string): string {
  const normalized = normalizeActivationCode(plaintext);
  return createHmac("sha256", requirePepper())
    .update(normalized, "utf8")
    .digest("hex");
}

export function activationCodesMatch(
  plaintext: string,
  storedHash: string,
): boolean {
  const computed = Buffer.from(hashActivationCode(plaintext), "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}
