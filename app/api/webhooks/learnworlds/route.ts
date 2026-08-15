import { NextResponse } from "next/server";
import { getLearnWorldsConfig } from "@/lib/learnworlds/config";
import { processLearnWorldsWebhook } from "@/lib/learnworlds/webhooks/handler";
import { verifyLearnWorldsWebhookSignature } from "@/lib/learnworlds/webhooks/signature";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const SIGNATURE_HEADER_CANDIDATES = [
  "learnworlds-webhook-signature",
  "x-lw-signature",
] as const;

function readSignatureHeader(request: Request): string | null {
  for (const candidate of SIGNATURE_HEADER_CANDIDATES) {
    const value = request.headers.get(candidate);
    if (value) return value;
  }
  return null;
}

/**
 * POST /api/webhooks/learnworlds
 *
 * Auth : header Learnworlds-Webhook-Signature: v1=<WEBHOOK SIGNATURE>
 * (jeton pré-partagé Settings → Developers → Webhooks ; comparaison timing-safe)
 * Idempotence : sha256(raw body) dans webhook_events.delivery_key
 */
export async function POST(request: Request) {
  const config = getLearnWorldsConfig();
  const secret = config.webhookSecret;

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "LEARNWORLDS_WEBHOOK_SECRET non configuré.",
      },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signatureHeader = readSignatureHeader(request);

  const valid = verifyLearnWorldsWebhookSignature({
    rawBody,
    signatureHeader,
    secret,
  });

  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Signature webhook invalide." },
      { status: 401 },
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY manquant — requis pour persister / synchroniser.",
      },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400 },
    );
  }

  try {
    const outcome = await processLearnWorldsWebhook(rawBody, payload);

    if (outcome.status === "duplicate") {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        deliveryKey: outcome.deliveryKey,
      });
    }

    if (outcome.status === "failed") {
      // 500 → LearnWorlds retente (jusqu'à 20 fois).
      return NextResponse.json(
        {
          ok: false,
          error: outcome.error,
          deliveryKey: outcome.deliveryKey,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      ...outcome,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur webhook.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Health / découverte : confirme que la route existe. */
export async function GET() {
  const config = getLearnWorldsConfig();
  return NextResponse.json({
    ok: true,
    endpoint: "/api/webhooks/learnworlds",
    webhookSecretConfigured: Boolean(config.webhookSecret),
    adminConfigured: isSupabaseAdminConfigured(),
    phase: 11,
  });
}
