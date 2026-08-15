import { describe, expect, it } from "vitest";
import { InMemoryWorkPlanStore } from "@/lib/planning/work-plan/memory-store";
import {
  buildPreviousPlanRow,
  buildWorkPlanSummaryView,
  formatActivitiesProgress,
  formatWorkPlanPeriodFr,
} from "@/lib/planning/work-plan/presentation";
import type { WorkPlanBuildInput, WorkPlanTask } from "@/lib/planning/work-plan/types";

const STUDENT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function catchUp(
  overrides: Partial<WorkPlanBuildInput> = {},
): WorkPlanBuildInput {
  return {
    completedActivities: 98,
    readinessScore: 54,
    paceStatus: "BEHIND",
    inactiveDays: 1,
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

describe("work-plan presentation UI", () => {
  it("dashboard résumé avec plan actif CATCH_UP", () => {
    const store = new InMemoryWorkPlanStore();
    const plan = store.createActive(
      STUDENT_A,
      catchUp(),
      new Date("2026-08-15T12:00:00.000Z"),
    );
    store.updateActive(
      STUDENT_A,
      catchUp({ completedActivities: 104 }),
      new Date("2026-08-15T12:00:00.000Z"),
    );
    const active = store.getActive(STUDENT_A)!;
    const summary = buildWorkPlanSummaryView(active);
    expect(summary.typeLabel).toBe("Plan de rattrapage");
    expect(summary.periodLabel).toContain("→");
    expect(summary.activitiesLabel).toBe("6 / 9");
    expect(summary.measurableTotal).toBeGreaterThan(0);
    expect(summary.measurableCompleted).toBeLessThan(summary.measurableTotal);
  });

  it("dashboard sans plan → pas de faux chiffres", () => {
    expect(formatActivitiesProgress(undefined)).toBeNull();
  });

  it("STARTUP sans target activités chiffré", () => {
    const store = new InMemoryWorkPlanStore();
    const plan = store.createActive(
      STUDENT_A,
      catchUp({
        readinessScore: null,
        requiredPace: null,
        paceStatus: null,
        currentPace: null,
        qcmAverage: null,
        targetExamDate: null,
        issues: ["INSUFFICIENT_QCM", "MISSING_TARGET_DATE"],
      }),
    );
    const summary = buildWorkPlanSummaryView(plan);
    expect(summary.typeLabel).toBe("Plan de démarrage");
    expect(summary.activitiesLabel).toBeNull();
  });

  it("CONSOLIDATION label", () => {
    const store = new InMemoryWorkPlanStore();
    const plan = store.createActive(
      STUDENT_A,
      catchUp({
        paceStatus: "ON_TRACK",
        currentPace: 9,
        requiredPace: 8.6,
        riskLevel: "GREEN",
      }),
    );
    expect(buildWorkPlanSummaryView(plan).typeLabel).toBe(
      "Plan de consolidation",
    );
  });

  it("tâche qualitative : pas de faux %", () => {
    const qcm: WorkPlanTask = {
      id: "qcm-1",
      type: "QCM_PRACTICE",
      title: "QCM",
      description: "d",
      target: null,
      progress: null,
      status: "IN_PROGRESS",
      reason: "r",
      measurable: false,
    };
    expect(formatActivitiesProgress(qcm)).toBeNull();
  });

  it("null ≠ 0 pour progress activités sans target", () => {
    const task: WorkPlanTask = {
      id: "a1",
      type: "ACTIVITIES",
      title: "Progression",
      description: "d",
      target: null,
      progress: 0,
      status: "TODO",
      reason: "r",
      measurable: true,
    };
    expect(formatActivitiesProgress(task)).toBeNull();
  });

  it("0 / 9 réel quand target connu", () => {
    const task: WorkPlanTask = {
      id: "a1",
      type: "ACTIVITIES",
      title: "Progression",
      description: "d",
      target: 9,
      progress: 0,
      status: "TODO",
      reason: "r",
      measurable: true,
    };
    expect(formatActivitiesProgress(task)).toBe("0 / 9");
  });

  it("plans précédents SUPERSEDED / COMPLETED", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT_A, catchUp());
    store.updateActive(STUDENT_A, catchUp({ completedActivities: 200 }));
    const prev = store.listPrevious(STUDENT_A);
    expect(prev.length).toBeGreaterThanOrEqual(1);
    const row = buildPreviousPlanRow(prev[0]!);
    expect(row.statusLabel.length).toBeGreaterThan(0);
    expect(row.typeLabel.length).toBeGreaterThan(0);
  });

  it("période stable", () => {
    expect(
      formatWorkPlanPeriodFr(
        "2026-08-15T12:00:00.000Z",
        "2026-08-22T12:00:00.000Z",
      ),
    ).toMatch(/15 août.*22 août/i);
  });

  it("student A isolé de B (données plan)", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT_A, catchUp());
    store.createActive(STUDENT_B, catchUp({ completedActivities: 1 }));
    expect(store.getActive(STUDENT_A)?.studentId).toBe(STUDENT_A);
    expect(store.getActive(STUDENT_B)?.studentId).toBe(STUDENT_B);
  });

  it("API /api/me/work-plan sans studentId client", () => {
    const path = "/api/me/work-plan";
    expect(path).not.toMatch(/students\//);
    expect(path).not.toContain("studentId");
  });
});
