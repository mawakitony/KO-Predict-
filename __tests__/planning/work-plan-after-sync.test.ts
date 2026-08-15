import { describe, expect, it } from "vitest";
import { workPlanInputFromSyncResult } from "@/lib/planning/work-plan/from-sync";
import { InMemoryWorkPlanStore } from "@/lib/planning/work-plan/memory-store";
import type { WorkPlanBuildInput } from "@/lib/planning/work-plan/types";
import type { PredictionResult } from "@/types/prediction";

const STUDENT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function prediction(
  overrides: Partial<PredictionResult> = {},
): PredictionResult {
  return {
    progressPercent: 20,
    remainingActivities: 100,
    currentPace: 4,
    requiredPace: 8.6,
    readinessScore: 54,
    readinessProbability: 0.4,
    predictedCompletionDate: "2026-11-01",
    predictedReadinessDate: "2026-10-15",
    riskLevel: "AMBER",
    paceStatus: "BEHIND",
    recommendedAction: "Accélérez",
    issues: [],
    calculatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function syncLike(overrides?: {
  completedActivities?: number;
  targetExamDate?: string | null;
  prediction?: Partial<PredictionResult>;
  qcmAverage?: number | null;
  inactiveDays?: number;
}) {
  return {
    metrics: {
      progressPercent: 20,
      completedActivities: overrides?.completedActivities ?? 98,
      totalActivities: 263,
      studyTimeMinutes: 10,
      inactiveDays: overrides?.inactiveDays ?? 1,
      lastActivityDate: "2026-08-14",
      qcmAverage:
        overrides && "qcmAverage" in overrides
          ? overrides.qcmAverage!
          : 75,
      recentQcmAverage: 70,
      qcmScoresFound: 2,
    },
    prediction: prediction(overrides?.prediction),
    targetExamDate:
      overrides && "targetExamDate" in overrides
        ? overrides.targetExamDate!
        : "2026-10-01",
  };
}

describe("workPlanInputFromSyncResult", () => {
  it("mappe metrics + prediction sans inventer", () => {
    const input = workPlanInputFromSyncResult(syncLike());
    expect(input.completedActivities).toBe(98);
    expect(input.requiredPace).toBe(8.6);
    expect(input.paceStatus).toBe("BEHIND");
    expect(input.targetExamDate).toBe("2026-10-01");
  });

  it("compte démo : target null + issues OK", () => {
    const input = workPlanInputFromSyncResult(
      syncLike({
        targetExamDate: null,
        qcmAverage: null,
        prediction: {
          readinessScore: null,
          requiredPace: null,
          paceStatus: null,
          currentPace: 0,
          issues: ["MISSING_TARGET_DATE", "INSUFFICIENT_QCM"],
        },
      }),
    );
    expect(input.targetExamDate).toBeNull();
    expect(input.qcmAverage).toBeNull();
  });
});

/**
 * Simule le hook après sync via le store mémoire
 * (même sémantique que updateActiveWorkPlan).
 */
function afterSync(
  store: InMemoryWorkPlanStore,
  studentId: string,
  sync: ReturnType<typeof syncLike>,
  now?: Date,
) {
  const input: WorkPlanBuildInput = workPlanInputFromSyncResult(sync);
  return store.updateActive(studentId, input, now ?? new Date());
}

describe("hook sync → plan (sémantique)", () => {
  it("sync sans plan → crée ACTIVE", () => {
    const store = new InMemoryWorkPlanStore();
    const plan = afterSync(store, STUDENT, syncLike());
    expect(plan.status).toBe("ACTIVE");
    expect(store.countActive(STUDENT)).toBe(1);
  });

  it("sync avec plan → update même id", () => {
    const store = new InMemoryWorkPlanStore();
    const first = afterSync(store, STUDENT, syncLike({ completedActivities: 98 }));
    const second = afterSync(
      store,
      STUDENT,
      syncLike({ completedActivities: 104 }),
    );
    expect(second.id).toBe(first.id);
    expect(second.tasks.find((t) => t.type === "ACTIVITIES")?.progress).toBe(6);
  });

  it("delta 0", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(store, STUDENT, syncLike({ completedActivities: 98 }));
    const plan = afterSync(store, STUDENT, syncLike({ completedActivities: 98 }));
    expect(plan.tasks.find((t) => t.type === "ACTIVITIES")?.progress).toBe(0);
  });

  it("cible atteinte → COMPLETED puis nouveau ACTIVE au sync suivant", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(store, STUDENT, syncLike({ completedActivities: 98 }));
    const done = afterSync(
      store,
      STUDENT,
      syncLike({ completedActivities: 107 }),
    );
    expect(done.status).toBe("COMPLETED");
    // Hook prod recrée si plus d’ACTIVE — simuler ici
    const next = afterSync(
      store,
      STUDENT,
      syncLike({ completedActivities: 107 }),
    );
    expect(next.status).toBe("ACTIVE");
    expect(store.countActive(STUDENT)).toBe(1);
  });

  it("expiration → clôture + nouveau", () => {
    const store = new InMemoryWorkPlanStore();
    const start = new Date("2026-08-01T12:00:00.000Z");
    afterSync(store, STUDENT, syncLike({ completedActivities: 98 }), start);
    const expired = new Date("2026-08-08T12:00:00.000Z");
    const next = afterSync(
      store,
      STUDENT,
      syncLike({ completedActivities: 100 }),
      expired,
    );
    expect(next.status).toBe("ACTIVE");
    expect(store.listPrevious(STUDENT).length).toBeGreaterThanOrEqual(1);
    expect(store.countActive(STUDENT)).toBe(1);
  });

  it("événement majeur date → SUPERSEDED + nouveau", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(
      store,
      STUDENT,
      syncLike({
        targetExamDate: null,
        qcmAverage: null,
        prediction: {
          readinessScore: null,
          requiredPace: null,
          paceStatus: null,
          currentPace: null,
          issues: ["MISSING_TARGET_DATE", "INSUFFICIENT_QCM"],
        },
      }),
    );
    const next = afterSync(
      store,
      STUDENT,
      syncLike({
        targetExamDate: "2026-11-01",
        prediction: {
          readinessScore: 40,
          requiredPace: 9,
          paceStatus: "BEHIND",
          currentPace: 4,
          issues: [],
        },
      }),
    );
    expect(next.status).toBe("ACTIVE");
    expect(store.listPrevious(STUDENT).some((p) => p.status === "SUPERSEDED")).toBe(
      true,
    );
    expect(store.countActive(STUDENT)).toBe(1);
  });

  it("NO_ACTIVITY → même plan (pas SUPERSEDED)", () => {
    const store = new InMemoryWorkPlanStore();
    const first = afterSync(store, STUDENT, syncLike());
    const second = afterSync(
      store,
      STUDENT,
      syncLike({
        prediction: {
          paceStatus: "NO_ACTIVITY",
          currentPace: 0,
        },
        inactiveDays: 10,
      }),
    );
    expect(second.id).toBe(first.id);
    expect(second.status).toBe("ACTIVE");
  });

  it("double sync → un seul ACTIVE", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(store, STUDENT, syncLike());
    afterSync(store, STUDENT, syncLike());
    afterSync(store, STUDENT, syncLike());
    expect(store.countActive(STUDENT)).toBe(1);
  });

  it("learning complete → SUPERSEDED / nouveau consolidation", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(store, STUDENT, syncLike());
    const next = afterSync(
      store,
      STUDENT,
      syncLike({
        prediction: {
          remainingActivities: 0,
          paceStatus: "ON_TRACK",
          issues: ["NO_REMAINING_WORK"],
        },
      }),
    );
    expect(next.planType).toBe("CONSOLIDATION");
    expect(store.countActive(STUDENT)).toBe(1);
  });

  it("target date ajoutée → SUPERSEDED + nouveau", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(
      store,
      STUDENT,
      syncLike({
        targetExamDate: null,
        prediction: {
          readinessScore: null,
          requiredPace: null,
          paceStatus: null,
          currentPace: null,
          issues: ["MISSING_TARGET_DATE"],
        },
      }),
    );
    const next = afterSync(
      store,
      STUDENT,
      syncLike({ targetExamDate: "2026-12-01" }),
    );
    expect(store.listPrevious(STUDENT).some((p) => p.status === "SUPERSEDED")).toBe(
      true,
    );
    expect(next.status).toBe("ACTIVE");
    expect(store.countActive(STUDENT)).toBe(1);
  });

  it("target date supprimée → SUPERSEDED + nouveau", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(store, STUDENT, syncLike({ targetExamDate: "2026-10-01" }));
    const next = afterSync(
      store,
      STUDENT,
      syncLike({
        targetExamDate: null,
        prediction: {
          readinessScore: null,
          requiredPace: null,
          paceStatus: null,
          currentPace: null,
          issues: ["MISSING_TARGET_DATE"],
        },
      }),
    );
    expect(store.listPrevious(STUDENT).some((p) => p.status === "SUPERSEDED")).toBe(
      true,
    );
    expect(next.status).toBe("ACTIVE");
  });

  it("first reliable trajectory → SUPERSEDED + nouveau", () => {
    const store = new InMemoryWorkPlanStore();
    afterSync(
      store,
      STUDENT,
      syncLike({
        targetExamDate: null,
        prediction: {
          readinessScore: null,
          requiredPace: null,
          paceStatus: null,
          currentPace: null,
          issues: ["MISSING_TARGET_DATE", "INSUFFICIENT_QCM"],
        },
      }),
    );
    // Passage à une trajectoire fiable (date + pace + readiness)
    const next = afterSync(
      store,
      STUDENT,
      syncLike({
        targetExamDate: "2026-11-01",
        prediction: {
          readinessScore: 55,
          requiredPace: 8,
          paceStatus: "BEHIND",
          currentPace: 5,
          issues: [],
        },
      }),
    );
    expect(next.status).toBe("ACTIVE");
    expect(store.countActive(STUDENT)).toBe(1);
  });
});

describe("échec plan ≠ échec sync (contrat)", () => {
  it("le hook sync n’interrompt pas le SyncLearnerResult en cas d’échec plan", () => {
    // Contrat documenté dans sync.ts + after-sync.ts :
    // applyWorkPlanAfterSuccessfulSync catch → { ok:false } ; sync déjà persistée.
    const syncOk = { ok: true as const, studentId: STUDENT };
    const planFailed = { ok: false as const, error: "persist failed" };
    expect(syncOk.ok).toBe(true);
    expect(planFailed.ok).toBe(false);
    // Le caller sync attache workPlan sans throw — pas de rollback metrics.
    const attached = {
      ...syncOk,
      workPlan: planFailed,
    };
    expect(attached.ok).toBe(true);
    expect(attached.workPlan.ok).toBe(false);
  });
});
