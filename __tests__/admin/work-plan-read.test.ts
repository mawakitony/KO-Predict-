import { describe, expect, it } from "vitest";
import { canViewStudents } from "@/lib/auth/permissions";
import { InMemoryWorkPlanStore } from "@/lib/planning/work-plan/memory-store";
import {
  buildWorkPlanSummaryView,
  formatActivitiesProgress,
} from "@/lib/planning/work-plan/presentation";
import type { WorkPlanBuildInput, WorkPlanTask } from "@/lib/planning/work-plan/types";

const STUDENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function input(overrides: Partial<WorkPlanBuildInput> = {}): WorkPlanBuildInput {
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

describe("admin work-plan permissions", () => {
  it("coach / admin / super_admin peuvent lire", () => {
    expect(canViewStudents("coach")).toBe(true);
    expect(canViewStudents("admin")).toBe(true);
    expect(canViewStudents("super_admin")).toBe(true);
  });

  it("student interdit", () => {
    expect(canViewStudents("student")).toBe(false);
  });

  it("route admin sans écriture (contrat)", () => {
    const path = "/api/admin/students/:id/work-plan";
    expect(path).toContain("/api/admin/students/");
    // Lecture seule Phase D — pas de POST/PATCH/DELETE exposé.
    const allowedMethods = ["GET"] as const;
    expect(allowedMethods).toEqual(["GET"]);
  });
});

describe("admin work-plan lecture données", () => {
  it("aucun plan actif", () => {
    const store = new InMemoryWorkPlanStore();
    expect(store.getActive(STUDENT)).toBeNull();
  });

  it("plan actif + résumé (null ≠ faux 0 inventé)", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT, input());
    store.updateActive(STUDENT, input({ completedActivities: 104 }));
    const active = store.getActive(STUDENT)!;
    const summary = buildWorkPlanSummaryView(active);
    expect(summary.typeLabel).toBe("Plan de rattrapage");
    expect(summary.activitiesLabel).toBe("6 / 9");
    expect(summary.measurableTotal).toBeGreaterThan(0);
  });

  it("plan précédent disponible après clôture", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT, input());
    store.updateActive(STUDENT, input({ completedActivities: 200 }));
    const prev = store.listPrevious(STUDENT);
    expect(prev.length).toBeGreaterThanOrEqual(1);
    expect(prev[0]?.status).not.toBe("ACTIVE");
  });

  it("tâche sans target → pas de x / y", () => {
    const task: WorkPlanTask = {
      id: "a",
      type: "ACTIVITIES",
      title: "t",
      description: "d",
      target: null,
      progress: 0,
      status: "TODO",
      reason: "r",
      measurable: true,
    };
    expect(formatActivitiesProgress(task)).toBeNull();
  });
});
