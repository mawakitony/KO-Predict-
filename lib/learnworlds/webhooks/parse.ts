import { createHash } from "node:crypto";
import { asRecord, asString } from "@/lib/learnworlds/mappers";

/** Événements Settings LearnWorlds qui déclenchent une resync. */
export const LEARNWORLDS_SYNC_EVENT_TYPES = new Set([
  "userUpdated",
  "courseCompleted",
  "enrolledFreeCourse",
  "learningProgramCompleted",
  "productBought",
  "awardedCertificate",
  "userUnenrolledFromProduct",
  "paymentCreated",
]);

export interface ParsedLearnWorldsWebhook {
  version: number | null;
  type: string | null;
  trigger: string | null;
  schoolId: string | null;
  learnworldsUserId: string | null;
  email: string | null;
  shouldSync: boolean;
  /** true si format User Automation (user à la racine, souvent sans type). */
  isAutomationPayload: boolean;
  payload: Record<string, unknown>;
}

function digUser(
  root: Record<string, unknown>,
  data: Record<string, unknown>,
): Record<string, unknown> | null {
  // Settings : data.user — Automation : user à la racine
  for (const candidate of [data.user, root.user]) {
    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      return candidate as Record<string, unknown>;
    }
  }
  return null;
}

/**
 * Format User Automation : user.id/email à la racine, souvent sans `type`.
 * Traité comme une mise à jour utilisateur générique (équivalent sync userUpdated),
 * sans inventer un type d'événement Settings officiel.
 */
export function isLearnWorldsAutomationUserPayload(
  payload: unknown,
): boolean {
  const root = asRecord(payload);
  if (asString(root.type)) return false;
  const user = asRecord(root.user ?? {});
  return Boolean(asString(user.id) || asString(user.email));
}

export function parseLearnWorldsWebhookPayload(
  payload: unknown,
): ParsedLearnWorldsWebhook {
  const root = asRecord(payload);
  const data = asRecord(root.data ?? {});
  const user = digUser(root, data);

  const learnworldsUserId =
    asString(user?.id) ??
    asString(data.user_id) ??
    asString(root.user_id) ??
    null;

  const email =
    asString(user?.email) ??
    asString(data.email) ??
    asString(root.email) ??
    null;

  const type = asString(root.type);
  const trigger =
    asString(root.trigger) ?? asString(root.automation_name) ?? null;
  const isAutomationPayload = isLearnWorldsAutomationUserPayload(payload);

  const shouldSync =
    Boolean(learnworldsUserId || email) &&
    (type
      ? LEARNWORLDS_SYNC_EVENT_TYPES.has(type)
      : isAutomationPayload);

  const schoolRecord = asRecord(root.school ?? {});
  const schoolId =
    asString(root.school_id) ??
    asString(schoolRecord.id) ??
    (typeof root.school === "string" ? root.school : null);

  return {
    version: typeof root.version === "number" ? root.version : null,
    type,
    trigger,
    schoolId,
    learnworldsUserId,
    email,
    shouldSync,
    isAutomationPayload,
    payload: root,
  };
}

/** Clé d'idempotence stable pour une livraison (retries = même body). */
export function buildWebhookDeliveryKey(rawBody: string | Buffer): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
