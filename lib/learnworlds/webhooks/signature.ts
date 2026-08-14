import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérifie Learnworlds-Webhook-Signature: v1=<hex>
 * HMAC-SHA256(rawBody, webhookSecret) — doc LearnWorlds.
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

  // Formats observés / documentés : "v1=<hex>" ou éventuellement hex seul.
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

  const expected = computeLearnWorldsWebhookSignature(
    options.rawBody,
    options.secret,
  );

  try {
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
