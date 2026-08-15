import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildWebhookDeliveryKey,
  parseLearnWorldsWebhookPayload,
} from "@/lib/learnworlds/webhooks/parse";
import { syncLearnWorldsLearner } from "@/lib/learnworlds/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";

export type WebhookProcessOutcome =
  | { status: "duplicate"; deliveryKey: string }
  | { status: "ignored"; deliveryKey: string; reason: string }
  | {
      status: "processed";
      deliveryKey: string;
      studentId: string | null;
      synced: boolean;
    }
  | { status: "failed"; deliveryKey: string; error: string };

async function claimDelivery(
  db: SupabaseClient,
  deliveryKey: string,
  parsed: ReturnType<typeof parseLearnWorldsWebhookPayload>,
): Promise<"claimed" | "duplicate"> {
  const { error } = await db.from("webhook_events").insert({
    delivery_key: deliveryKey,
    event_type:
      parsed.type ??
      (parsed.isAutomationPayload ? "automation_user_update" : null),
    trigger_name: parsed.trigger,
    learnworlds_user_id: parsed.learnworldsUserId,
    payload: parsed.payload,
    status: "received",
  });

  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(`Enregistrement webhook: ${error.message}`);
  }
  return "claimed";
}

async function markDelivery(
  db: SupabaseClient,
  deliveryKey: string,
  status: "processed" | "ignored" | "failed",
  errorMessage?: string,
) {
  await db
    .from("webhook_events")
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("delivery_key", deliveryKey);
}

/**
 * Traite un payload webhook LearnWorlds déjà authentifié (signature OK).
 * Idempotent via delivery_key = sha256(rawBody).
 */
export async function processLearnWorldsWebhook(
  rawBody: string,
  payload: unknown,
): Promise<WebhookProcessOutcome> {
  if (!isSupabaseAdminConfigured()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant — requis pour les webhooks.",
    );
  }

  const db = createAdminClient();
  const deliveryKey = buildWebhookDeliveryKey(rawBody);
  const parsed = parseLearnWorldsWebhookPayload(payload);

  const claim = await claimDelivery(db, deliveryKey, parsed);
  if (claim === "duplicate") {
    return { status: "duplicate", deliveryKey };
  }

  if (!parsed.shouldSync) {
    const reason = parsed.learnworldsUserId
      ? `Événement ${parsed.type ?? "inconnu"} ignoré (pas de sync).`
      : "Aucun utilisateur LearnWorlds dans le payload.";
    await markDelivery(db, deliveryKey, "ignored", reason);
    return { status: "ignored", deliveryKey, reason };
  }

  const learnworldsUserIdOrEmail =
    parsed.learnworldsUserId ?? parsed.email;

  if (!learnworldsUserIdOrEmail) {
    const reason = "Identifiant utilisateur manquant.";
    await markDelivery(db, deliveryKey, "ignored", reason);
    return { status: "ignored", deliveryKey, reason };
  }

  try {
    const result = await syncLearnWorldsLearner(
      { learnworldsUserIdOrEmail },
      db,
    );
    await markDelivery(db, deliveryKey, "processed");
    return {
      status: "processed",
      deliveryKey,
      studentId: result.studentId,
      synced: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec de synchronisation.";
    await markDelivery(db, deliveryKey, "failed", message);
    return { status: "failed", deliveryKey, error: message };
  }
}
