import "server-only";

import { cookies } from "next/headers";
import { loadOwnWorkPlans } from "@/lib/planning/work-plan/load-own";
import {
  buildAutomaticReminderFromPlan,
  parseReminderAcks,
  REMINDER_ACK_COOKIE,
  withUnreadState,
  type LearnerReminder,
} from "@/lib/learner/reminders-shared";

export type {
  LearnerReminder,
  LearnerReminderSource,
} from "@/lib/learner/reminders-shared";
export {
  buildAutomaticReminderFromPlan,
  parseReminderAcks,
  REMINDER_ACK_COOKIE,
  serializeReminderAcks,
  withUnreadState,
} from "@/lib/learner/reminders-shared";

export async function loadOwnLearnerReminders(): Promise<{
  reminders: LearnerReminder[];
  unreadCount: number;
  error: "UNAUTHENTICATED" | "NO_STUDENT" | "UNAVAILABLE" | null;
}> {
  const { active, error } = await loadOwnWorkPlans({ previousLimit: 0 });
  if (error) {
    return { reminders: [], unreadCount: 0, error };
  }

  const jar = await cookies();
  const acks = parseReminderAcks(jar.get(REMINDER_ACK_COOKIE)?.value);

  const base = [];
  if (active) {
    const reminder = buildAutomaticReminderFromPlan(active);
    if (reminder.body) {
      base.push(reminder);
    }
  }

  const reminders = withUnreadState(base, acks).sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return {
    reminders,
    unreadCount: reminders.filter((r) => r.unread).length,
    error: null,
  };
}
