import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * LearnWorlds envoie `Learnworlds-Webhook-Signature: v1=<WEBHOOK SIGNATURE>`
 * où la valeur est le jeton pré-partagé (Settings → Developers → Webhooks),
 * pas un HMAC du body (confirmé en production : secret === digest reçu).
 *
 * Compatibilité : on accepte aussi un HMAC-SHA256 hex complet (64) du raw body
 * si un jour / un autre canal signe réellement ainsi. Jamais de HMAC tronqué.
 */

function timingSafeStringEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/** Normalise le secret stocké (trim, retire un éventuel préfixe v1=, lower). */
export function normalizeLearnWorldsWebhookSecret(secret: string): string {
  const trimmed = secret.trim();
  const withoutPrefix = /^v1=/i.test(trimmed) ? trimmed.slice(3) : trimmed;
  return withoutPrefix.toLowerCase();
}

/**
 * HMAC-SHA256 hex complet du raw body (chemin secondaire / docs historiques).
 */
export function computeLearnWorldsWebhookSignature(
  rawBody: string | Buffer,
  secret: string,
): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function extractLearnWorldsSignature(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;

  // Formats : "v1=<token-ou-hex>" ou hex / jeton seul.
  const v1 = trimmed.match(/(?:^|[,;\s])v1=([a-fA-F0-9]+)/);
  if (v1?.[1]) return v1[1].toLowerCase();

  if (/^[a-fA-F0-9]+$/.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

export function verifyLearnWorldsWebhookSignature(options: {
  rawBody: string | Buffer;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  const provided = extractLearnWorldsSignature(options.signatureHeader);
  if (!provided) return false;

  const expectedToken = normalizeLearnWorldsWebhookSecret(options.secret);
  if (!expectedToken) return false;

  // Chemin principal (Automation + Settings LearnWorlds) : jeton pré-partagé.
  if (timingSafeStringEqual(provided, expectedToken)) {
    return true;
  }

  // Chemin secondaire : HMAC-SHA256 hex complet uniquement (jamais tronqué).
  const expectedHmac = computeLearnWorldsWebhookSignature(
    options.rawBody,
    options.secret,
  );
  return timingSafeStringEqual(provided, expectedHmac);
}
