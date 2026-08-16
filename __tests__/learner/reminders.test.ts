import { describe, expect, it } from "vitest";
import {
  buildAutomaticReminderFromPlan,
  parseReminderAcks,
  withUnreadState,
} from "@/lib/learner/reminders-shared";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";

function fakePlan(
  overrides: Partial<PersistedWorkPlan> = {},
): PersistedWorkPlan {
  return {
    id: "plan-1",
    studentId: "stu-1",
    planType: "CATCH_UP",
    status: "ACTIVE",
    startsAt: "2026-08-15T00:00:00.000Z",
    endsAt: "2026-08-22T00:00:00.000Z",
    snapshot: {
      completedActivitiesStart: 0,
      readinessStart: null,
      paceStatusStart: "NO_ACTIVITY",
      inactiveDaysStart: 3,
      targetExamDateStart: null,
      requiredPaceStart: null,
      targetActivities: 43,
      qcmAverageStart: null,
      weeklyStatusStart: "NO_ACTIVITY",
      primaryObjective: "Reprenez votre préparation cette semaine",
      reason: "Inactivité détectée",
    },
    tasks: [],
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T12:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

describe("learner reminders", () => {
  it("construit un rappel automatique depuis le plan actif", () => {
    const reminder = buildAutomaticReminderFromPlan(fakePlan());
    expect(reminder.source).toBe("automatic");
    expect(reminder.body).toBe("Reprenez votre préparation cette semaine");
    expect(reminder.href).toBe("/plan");
    expect(reminder.id).toContain("auto-plan:plan-1:");
  });

  it("point rouge seulement si non accusé", () => {
    const base = [buildAutomaticReminderFromPlan(fakePlan())];
    const unread = withUnreadState(base, {});
    expect(unread[0]?.unread).toBe(true);

    const read = withUnreadState(base, { [base[0]!.id]: "2026-08-15T13:00:00.000Z" });
    expect(read[0]?.unread).toBe(false);
  });

  it("parseReminderAcks ignore le JSON invalide", () => {
    expect(parseReminderAcks(undefined)).toEqual({});
    expect(parseReminderAcks("{bad")).toEqual({});
    expect(parseReminderAcks('{"a":"2026-01-01"}')).toEqual({
      a: "2026-01-01",
    });
  });

  it("pas de badge inventé sans rappel", () => {
    expect(withUnreadState([], {})).toEqual([]);
  });
});
