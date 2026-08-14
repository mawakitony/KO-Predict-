import { createHash } from "node:crypto";
import { asRecord, asString } from "@/lib/learnworlds/mappers";

/** Événements qui déclenchent une resync LearnWorlds → KO Predict™. */
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
  payload: Record<string, unknown>;
}

function digUser(data: Record<string, unknown>): Record<string, unknown> | null {
  const user = data.user;
  if (user && typeof user === "object" && !Array.isArray(user)) {
    return user as Record<string, unknown>;
  }
  return null;
}

export function parseLearnWorldsWebhookPayload(
  payload: unknown,
): ParsedLearnWorldsWebhook {
  const root = asRecord(payload);
  const data = asRecord(root.data ?? {});
  const user = digUser(data);

  const learnworldsUserId =
    asString(user?.id) ??
    asString(data.user_id) ??
    asString(root.user_id) ??
    null;

  const email = asString(user?.email) ?? asString(data.email) ?? null;
  const type = asString(root.type);
  const trigger = asString(root.trigger);

  const shouldSync =
    Boolean(learnworldsUserId || email) &&
    (type ? LEARNWORLDS_SYNC_EVENT_TYPES.has(type) : false);

  return {
    version: typeof root.version === "number" ? root.version : null,
    type,
    trigger,
    schoolId: asString(root.school_id),
    learnworldsUserId,
    email,
    shouldSync,
    payload: root,
  };
}

/** Clé d'idempotence stable pour une livraison (retries = même body). */
export function buildWebhookDeliveryKey(rawBody: string | Buffer): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
