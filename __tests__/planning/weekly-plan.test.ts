import { describe, expect, it } from "vitest";
import {
  buildWeeklyPlan,
  resolveWeeklyTargetActivities,
} from "@/lib/planning/weekly-plan";
import type { WeeklyPlanInput } from "@/lib/planning/weekly-plan";

function base(overrides: Partial<WeeklyPlanInput> = {}): WeeklyPlanInput {
  return {
    readinessScore: 70,
    currentPace: 5,
    requiredPace: 7.4,
    paceStatus: "ON_TRACK",
    remainingActivities: 40,
    inactiveDays: 1,
    qcmAverage: 75,
    riskLevel: "GREEN",
    issues: [],
    ...overrides,
  };
}

describe("resolveWeeklyTargetActivities", () => {
  it("arrondit requiredPace avec max(1, round0)", () => {
    expect(resolveWeeklyTargetActivities(7.4)).toBe(7);
    expect(resolveWeeklyTargetActivities(7.5)).toBe(8);
    expect(resolveWeeklyTargetActivities(0.4)).toBe(1);
  });

  it("retourne null si requiredPace null ou ≤ 0", () => {
    expect(resolveWeeklyTargetActivities(null)).toBeNull();
    expect(resolveWeeklyTargetActivities(0)).toBeNull();
    expect(resolveWeeklyTargetActivities(-1)).toBeNull();
  });
});

describe("buildWeeklyPlan", () => {
  it("données insuffisantes — readiness null + issues collecte", () => {
    const plan = buildWeeklyPlan(
      base({
        readinessScore: null,
        currentPace: null,
        requiredPace: null,
        paceStatus: null,
        qcmAverage: null,
        issues: ["INSUFFICIENT_QCM", "INSUFFICIENT_ACTIVITY_FOR_PACE"],
      }),
    );
    expect(plan.status).toBe("INSUFFICIENT_DATA");
    expect(plan.targetActivities).toBeNull();
    expect(plan.emphasizeQcm).toBe(true);
    expect(plan.primaryAction.toLowerCase()).toContain("progression");
    expect(plan.reason.toLowerCase()).toContain("qcm");
  });

  it("requiredPace null sans rythme → pas d’objectif chiffré", () => {
    const plan = buildWeeklyPlan(
      base({
        readinessScore: null,
        requiredPace: null,
        paceStatus: null,
        currentPace: null,
        issues: ["MISSING_TARGET_DATE"],
      }),
    );
    expect(plan.status).toBe("INSUFFICIENT_DATA");
    expect(plan.targetActivities).toBeNull();
  });

  it("ON_TRACK — objectif activités depuis requiredPace", () => {
    const plan = buildWeeklyPlan(
      base({
        paceStatus: "ON_TRACK",
        currentPace: 7.2,
        requiredPace: 7.4,
      }),
    );
    expect(plan.status).toBe("ON_TRACK");
    expect(plan.targetActivities).toBe(7);
    expect(plan.primaryAction.toLowerCase()).toContain("maintenez");
    expect(plan.reason).toContain("7.2");
    expect(plan.reason).toContain("7.4");
  });

  it("BEHIND — accélérer + rythme actuel vs cible", () => {
    const plan = buildWeeklyPlan(
      base({
        paceStatus: "BEHIND",
        currentPace: 4,
        requiredPace: 7,
        riskLevel: "RED",
      }),
    );
    expect(plan.status).toBe("BEHIND");
    expect(plan.targetActivities).toBe(7);
    expect(plan.primaryAction.toLowerCase()).toContain("accélérez");
    expect(plan.reason).toMatch(/4/);
    expect(plan.reason).toMatch(/7/);
  });

  it("NO_ACTIVITY — currentPace = 0 réel (pas null)", () => {
    const plan = buildWeeklyPlan(
      base({
        currentPace: 0,
        paceStatus: "NO_ACTIVITY",
        requiredPace: 6.2,
        inactiveDays: 9,
        issues: ["ZERO_CURRENT_PACE"],
      }),
    );
    expect(plan.status).toBe("NO_ACTIVITY");
    expect(plan.currentPace).toBe(0);
    expect(plan.targetActivities).toBe(6);
    expect(plan.reason).toContain("9 jour");
    expect(plan.primaryAction.toLowerCase()).toContain("reprenez");
  });

  it("currentPace null ≠ NO_ACTIVITY si issue activité insuffisante", () => {
    const plan = buildWeeklyPlan(
      base({
        readinessScore: null,
        currentPace: null,
        requiredPace: null,
        paceStatus: null,
        inactiveDays: 0,
        issues: ["INSUFFICIENT_ACTIVITY_FOR_PACE"],
      }),
    );
    expect(plan.status).toBe("INSUFFICIENT_DATA");
    expect(plan.currentPace).toBeNull();
  });

  it("n’invente aucun volume de questions", () => {
    const plan = buildWeeklyPlan(
      base({
        paceStatus: "BEHIND",
        requiredPace: 8,
      }),
    );
    const blob = JSON.stringify(plan).toLowerCase();
    expect(blob).not.toContain("question");
    expect(blob).not.toContain("25");
    expect(
      Object.prototype.hasOwnProperty.call(plan, "targetQuestions"),
    ).toBe(false);
  });

  it("COMPLETE quand remainingActivities = 0", () => {
    const plan = buildWeeklyPlan(
      base({
        remainingActivities: 0,
        paceStatus: "ON_TRACK",
        requiredPace: 0,
      }),
    );
    expect(plan.status).toBe("COMPLETE");
    expect(plan.targetActivities).toBeNull();
  });

  it("SLIGHTLY_BEHIND", () => {
    const plan = buildWeeklyPlan(
      base({
        paceStatus: "SLIGHTLY_BEHIND",
        currentPace: 6,
        requiredPace: 7.2,
      }),
    );
    expect(plan.status).toBe("SLIGHTLY_BEHIND");
    expect(plan.targetActivities).toBe(7);
  });
});
