import { describe, expect, it } from "vitest";
import {
  activityProgressDelta,
  allMeasurableTasksCompleted,
  buildWorkPlanDraft,
  computeWorkPlanWindow,
  detectMajorPlanEvents,
  mapWeeklyStatusToPlanType,
  refreshWorkPlanTasks,
  resolveWorkPlanClosureStatus,
  WORK_PLAN_DURATION_DAYS,
  workPlanTypeLabelFr,
} from "@/lib/planning/work-plan";
import type { WorkPlanBuildInput } from "@/lib/planning/work-plan";
import { resolveWeeklyTargetActivities } from "@/lib/planning/weekly-plan";

function base(overrides: Partial<WorkPlanBuildInput> = {}): WorkPlanBuildInput {
  return {
    completedActivities: 98,
    readinessScore: 54,
    paceStatus: "BEHIND",
    inactiveDays: 2,
    targetExamDate: "2026-10-01",
    requiredPace: 8.6,
    remainingActivities: 100,
    qcmAverage: 75,
    currentPace: 4,
    issues: [],
    riskLevel: "AMBER",
    ...overrides,
  };
}

describe("mapWeeklyStatusToPlanType", () => {
  it("INSUFFICIENT_DATA → STARTUP", () => {
    expect(mapWeeklyStatusToPlanType("INSUFFICIENT_DATA")).toBe("STARTUP");
  });
  it("BEHIND / NO_ACTIVITY → CATCH_UP", () => {
    expect(mapWeeklyStatusToPlanType("BEHIND")).toBe("CATCH_UP");
    expect(mapWeeklyStatusToPlanType("SLIGHTLY_BEHIND")).toBe("CATCH_UP");
    expect(mapWeeklyStatusToPlanType("NO_ACTIVITY")).toBe("CATCH_UP");
  });
  it("ON_TRACK / AHEAD / COMPLETE → CONSOLIDATION", () => {
    expect(mapWeeklyStatusToPlanType("ON_TRACK")).toBe("CONSOLIDATION");
    expect(mapWeeklyStatusToPlanType("AHEAD")).toBe("CONSOLIDATION");
    expect(mapWeeklyStatusToPlanType("COMPLETE")).toBe("CONSOLIDATION");
  });
});

describe("buildWorkPlanDraft — STARTUP (Loyuoky-like)", () => {
  it("pas d’objectif chiffré si requiredPace null", () => {
    const draft = buildWorkPlanDraft(
      base({
        completedActivities: 0,
        readinessScore: null,
        paceStatus: null,
        currentPace: null,
        requiredPace: null,
        remainingActivities: 263,
        qcmAverage: null,
        targetExamDate: null,
        inactiveDays: 0,
        issues: [
          "INSUFFICIENT_QCM",
          "INSUFFICIENT_ACTIVITY_FOR_PACE",
          "MISSING_TARGET_DATE",
        ],
        riskLevel: null,
      }),
    );
    expect(draft.planType).toBe("STARTUP");
    expect(draft.snapshot.targetActivities).toBeNull();
    expect(draft.tasks.some((t) => t.type === "QCM_PRACTICE")).toBe(true);
    expect(draft.tasks.some((t) => t.type === "TARGET_DATE")).toBe(true);
    expect(
      draft.tasks.find((t) => t.type === "ACTIVITIES")?.target,
    ).toBeNull();
    expect(draft.tasks.length).toBeGreaterThanOrEqual(2);
    expect(draft.tasks.length).toBeLessThanOrEqual(5);
  });
});

describe("buildWorkPlanDraft — CATCH_UP", () => {
  it("utilise resolveWeeklyTargetActivities(requiredPace)", () => {
    const draft = buildWorkPlanDraft(base());
    expect(draft.planType).toBe("CATCH_UP");
    expect(draft.snapshot.targetActivities).toBe(
      resolveWeeklyTargetActivities(8.6),
    );
    expect(draft.snapshot.targetActivities).toBe(9);
    const activities = draft.tasks.find((t) => t.type === "ACTIVITIES");
    expect(activities?.target).toBe(9);
    expect(activities?.measurable).toBe(true);
  });

  it("NO_ACTIVITY ajoute RESUME_ACTIVITY sans SUPERSEDE", () => {
    const draft = buildWorkPlanDraft(
      base({
        paceStatus: "NO_ACTIVITY",
        currentPace: 0,
        inactiveDays: 10,
      }),
    );
    expect(draft.planType).toBe("CATCH_UP");
    expect(draft.tasks.some((t) => t.type === "RESUME_ACTIVITY")).toBe(true);
  });
});

describe("buildWorkPlanDraft — CONSOLIDATION", () => {
  it("ON_TRACK — ton maintien", () => {
    const draft = buildWorkPlanDraft(
      base({
        paceStatus: "ON_TRACK",
        currentPace: 9,
        requiredPace: 8.6,
        readinessScore: 72,
        riskLevel: "GREEN",
      }),
    );
    expect(draft.planType).toBe("CONSOLIDATION");
    expect(draft.primaryObjective.toLowerCase()).toContain("maintenir");
    expect(draft.tasks.some((t) => t.type === "MAINTAIN_PACE")).toBe(true);
  });

  it("COMPLETE — pas d’objectif activités artificiel", () => {
    const draft = buildWorkPlanDraft(
      base({
        remainingActivities: 0,
        paceStatus: "ON_TRACK",
        issues: ["NO_REMAINING_WORK"],
      }),
    );
    expect(draft.planType).toBe("CONSOLIDATION");
    expect(draft.snapshot.targetActivities).toBeNull();
    expect(
      draft.tasks.find((t) => t.type === "ACTIVITIES"),
    ).toBeUndefined();
  });
});

describe("activity progress 0/9 → 6/9 → 9/9", () => {
  it("delta clamp + statuts", () => {
    const draft = buildWorkPlanDraft(base({ completedActivities: 98 }));
    const snap = draft.snapshot;
    expect(activityProgressDelta(98, 98)).toBe(0);
    expect(activityProgressDelta(98, 104)).toBe(6);
    expect(activityProgressDelta(98, 107)).toBe(9);
    expect(activityProgressDelta(98, 90)).toBe(0); // jamais négatif

    let tasks = refreshWorkPlanTasks(draft.tasks, snap, {
      completedActivities: 98,
      targetExamDate: "2026-10-01",
    });
    expect(tasks.find((t) => t.type === "ACTIVITIES")?.progress).toBe(0);
    expect(tasks.find((t) => t.type === "ACTIVITIES")?.status).toBe("TODO");

    tasks = refreshWorkPlanTasks(draft.tasks, snap, {
      completedActivities: 104,
      targetExamDate: "2026-10-01",
    });
    expect(tasks.find((t) => t.type === "ACTIVITIES")?.progress).toBe(6);
    expect(tasks.find((t) => t.type === "ACTIVITIES")?.status).toBe(
      "IN_PROGRESS",
    );

    tasks = refreshWorkPlanTasks(draft.tasks, snap, {
      completedActivities: 107,
      targetExamDate: "2026-10-01",
    });
    expect(tasks.find((t) => t.type === "ACTIVITIES")?.progress).toBe(9);
    expect(tasks.find((t) => t.type === "ACTIVITIES")?.status).toBe(
      "COMPLETED",
    );
  });
});

describe("TARGET_DATE + RESUME", () => {
  it("TARGET_DATE TODO → COMPLETED", () => {
    const draft = buildWorkPlanDraft(
      base({
        targetExamDate: null,
        issues: ["MISSING_TARGET_DATE"],
        readinessScore: null,
        requiredPace: null,
        paceStatus: null,
        currentPace: null,
        qcmAverage: null,
      }),
    );
    const task = draft.tasks.find((t) => t.type === "TARGET_DATE");
    expect(task?.status).toBe("TODO");
    const updated = refreshWorkPlanTasks(draft.tasks, draft.snapshot, {
      completedActivities: draft.snapshot.completedActivitiesStart,
      targetExamDate: "2026-11-01",
    });
    expect(updated.find((t) => t.type === "TARGET_DATE")?.status).toBe(
      "COMPLETED",
    );
  });

  it("RESUME_ACTIVITY completed si activité réelle", () => {
    const draft = buildWorkPlanDraft(
      base({ paceStatus: "NO_ACTIVITY", currentPace: 0 }),
    );
    const updated = refreshWorkPlanTasks(draft.tasks, draft.snapshot, {
      completedActivities: draft.snapshot.completedActivitiesStart + 1,
      targetExamDate: draft.snapshot.targetExamDateStart,
    });
    expect(updated.find((t) => t.type === "RESUME_ACTIVITY")?.status).toBe(
      "COMPLETED",
    );
  });
});

describe("QCM guidance V1", () => {
  it("ne passe pas auto à COMPLETED", () => {
    const draft = buildWorkPlanDraft(
      base({ qcmAverage: null, issues: ["INSUFFICIENT_QCM"] }),
    );
    const qcm = draft.tasks.find((t) => t.type === "QCM_PRACTICE");
    expect(qcm?.measurable).toBe(false);
    const updated = refreshWorkPlanTasks(draft.tasks, draft.snapshot, {
      completedActivities: 200,
      targetExamDate: "2026-10-01",
    });
    expect(updated.find((t) => t.type === "QCM_PRACTICE")?.status).toBe(
      "IN_PROGRESS",
    );
  });
});

describe("clôture COMPLETED / PARTIAL / EXPIRED", () => {
  it("toutes mesurables done → COMPLETED (guidance ignorée)", () => {
    const draft = buildWorkPlanDraft(base({ completedActivities: 98 }));
    const tasks = refreshWorkPlanTasks(draft.tasks, draft.snapshot, {
      completedActivities: 98 + 9,
      targetExamDate: "2026-10-01",
    });
    expect(allMeasurableTasksCompleted(tasks)).toBe(true);
    expect(resolveWorkPlanClosureStatus(tasks).status).toBe("COMPLETED");
  });

  it("progression partielle → PARTIAL", () => {
    const draft = buildWorkPlanDraft(base({ completedActivities: 98 }));
    const tasks = refreshWorkPlanTasks(draft.tasks, draft.snapshot, {
      completedActivities: 104,
      targetExamDate: "2026-10-01",
    });
    expect(resolveWorkPlanClosureStatus(tasks).status).toBe("PARTIAL");
  });

  it("aucune progression → EXPIRED", () => {
    const draft = buildWorkPlanDraft(base({ completedActivities: 98 }));
    const tasks = refreshWorkPlanTasks(draft.tasks, draft.snapshot, {
      completedActivities: 98,
      targetExamDate: "2026-10-01",
    });
    expect(resolveWorkPlanClosureStatus(tasks).status).toBe("EXPIRED");
  });
});

describe("événements majeurs restreints V1", () => {
  it("date null → date", () => {
    const draft = buildWorkPlanDraft(
      base({
        targetExamDate: null,
        issues: ["MISSING_TARGET_DATE"],
        readinessScore: null,
        requiredPace: null,
        paceStatus: null,
        currentPace: null,
      }),
    );
    const events = detectMajorPlanEvents({
      snapshot: draft.snapshot,
      now: {
        ...base({ targetExamDate: "2026-11-01", requiredPace: 8 }),
      },
      weeklyStatusAtStart: "INSUFFICIENT_DATA",
      weeklyStatusNow: "BEHIND",
    });
    expect(events).toContain("TARGET_DATE_BECAME_AVAILABLE");
  });

  it("NO_ACTIVITY seul ne produit pas d’événement majeur", () => {
    const draft = buildWorkPlanDraft(base());
    const events = detectMajorPlanEvents({
      snapshot: draft.snapshot,
      now: {
        ...base({ paceStatus: "NO_ACTIVITY", currentPace: 0 }),
      },
      weeklyStatusAtStart: "BEHIND",
      weeklyStatusNow: "NO_ACTIVITY",
    });
    expect(events).toEqual([]);
  });

  it("FIRST_RELIABLE_TRAJECTORY", () => {
    const draft = buildWorkPlanDraft(
      base({
        readinessScore: null,
        requiredPace: null,
        paceStatus: null,
        currentPace: null,
        qcmAverage: null,
        targetExamDate: null,
        issues: ["INSUFFICIENT_QCM", "MISSING_TARGET_DATE"],
      }),
    );
    expect(draft.weeklyStatus).toBe("INSUFFICIENT_DATA");
    const events = detectMajorPlanEvents({
      snapshot: draft.snapshot,
      now: base({
        requiredPace: 9,
        paceStatus: "BEHIND",
        readinessScore: 40,
        targetExamDate: "2026-11-01",
        qcmAverage: 70,
      }),
      weeklyStatusAtStart: "INSUFFICIENT_DATA",
      weeklyStatusNow: "BEHIND",
    });
    expect(events).toContain("FIRST_RELIABLE_TRAJECTORY");
  });
});

describe("fenêtre 7 jours", () => {
  it("ends_at = starts_at + 7", () => {
    const start = new Date("2026-08-15T12:00:00.000Z");
    const { endsAt } = computeWorkPlanWindow(start);
    expect(WORK_PLAN_DURATION_DAYS).toBe(7);
    expect(endsAt.toISOString()).toBe("2026-08-22T12:00:00.000Z");
  });
});

describe("labels FR", () => {
  it("noms produit", () => {
    expect(workPlanTypeLabelFr("STARTUP")).toBe("Plan de démarrage");
    expect(workPlanTypeLabelFr("CATCH_UP")).toBe("Plan de rattrapage");
    expect(workPlanTypeLabelFr("CONSOLIDATION")).toBe(
      "Plan de consolidation",
    );
  });
});
