import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";

export const REMINDER_ACK_COOKIE = "ko_reminder_acks";

export type LearnerReminderSource = "automatic" | "coach";

export interface LearnerReminder {
  id: string;
  source: LearnerReminderSource;
  title: string;
  body: string;
  createdAt: string;
  href: string;
  unread: boolean;
}

export function parseReminderAcks(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === "string" && typeof value === "string") {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Rappel automatique V1 = plan actif (objectif réel, pas inventé). */
export function buildAutomaticReminderFromPlan(
  plan: PersistedWorkPlan,
): Omit<LearnerReminder, "unread"> {
  return {
    id: `auto-plan:${plan.id}:${plan.updatedAt}`,
    source: "automatic",
    title: "Rappel automatique KO Predict™",
    body: plan.snapshot.primaryObjective.trim() || plan.snapshot.reason.trim(),
    createdAt: plan.updatedAt,
    href: "/plan",
  };
}

export function withUnreadState(
  reminders: Array<Omit<LearnerReminder, "unread">>,
  acks: Record<string, string>,
): LearnerReminder[] {
  return reminders.map((r) => ({
    ...r,
    unread: acks[r.id] == null,
  }));
}

export function serializeReminderAcks(acks: Record<string, string>): string {
  return JSON.stringify(acks);
}
