import { describe, expect, it } from "vitest";
import {
  calculatePrediction,
  calculateProgress,
  calculateRemainingActivities,
  calculateCurrentPace,
  calculateRequiredPace,
  calculatePredictedCompletionDate,
  calculatePredictedReadinessDate,
  calculateReadinessScore,
  calculateConsistencyScore,
  calculateRiskLevel,
  calculatePaceStatus,
  FINAL_REVIEW_DAYS,
} from "@/lib/prediction/engine";

const AS_OF = new Date("2026-08-11T12:00:00.000Z");

describe("progress & remaining", () => {
  it("calcule la progression depuis les activités", () => {
    expect(calculateProgress(62, 100)).toBe(62);
  });

  it("préfère progressPercent fourni", () => {
    expect(calculateProgress(50, 100, 62)).toBe(62);
  });

  it("borne entre 0 et 100", () => {
    expect(calculateProgress(120, 100)).toBe(100);
  });

  it("remaining ne descend pas sous 0", () => {
    expect(calculateRemainingActivities(110, 100)).toBe(0);
    expect(calculateRemainingActivities(62, 100)).toBe(38);
  });
});

describe("pace", () => {
  it("utilise le rythme fourni (fenêtre future-ready)", () => {
    expect(calculateCurrentPace({ currentPace: 5 })).toBe(5);
  });

  it("required pace = remaining / weeksRemaining", () => {
    const pace = calculateRequiredPace({
      remainingActivities: 38,
      targetExamDate: "2026-09-25",
      asOf: AS_OF,
    });
    // 45 jours / 7 ≈ 6.4286 semaines → 38 / 6.4286 ≈ 5.9
    expect(pace).toBe(5.9);
  });

  it("required pace = 0 si plus de travail", () => {
    expect(
      calculateRequiredPace({
        remainingActivities: 0,
        targetExamDate: "2026-09-25",
        asOf: AS_OF,
      }),
    ).toBe(0);
  });

  it("required pace null si date cible absente ou passée", () => {
    expect(
      calculateRequiredPace({
        remainingActivities: 10,
        targetExamDate: null,
        asOf: AS_OF,
      }),
    ).toBeNull();
    expect(
      calculateRequiredPace({
        remainingActivities: 10,
        targetExamDate: "2026-08-01",
        asOf: AS_OF,
      }),
    ).toBeNull();
  });

  it("completion date null si currentPace = 0", () => {
    expect(
      calculatePredictedCompletionDate({
        remainingActivities: 40,
        currentPace: 0,
        asOf: AS_OF,
      }),
    ).toBeNull();
  });

  it("ajoute FINAL_REVIEW_DAYS à la readiness date", () => {
    expect(calculatePredictedReadinessDate("2026-09-18")).toBe("2026-09-25");
    expect(FINAL_REVIEW_DAYS).toBe(7);
  });
});

describe("readiness & risk", () => {
  it("consistency score selon inactive_days", () => {
    expect(calculateConsistencyScore(0)).toBe(100);
    expect(calculateConsistencyScore(1)).toBe(100);
    expect(calculateConsistencyScore(7)).toBe(40);
    expect(calculateConsistencyScore(20)).toBe(0);
  });

  it("pace status", () => {
    expect(calculatePaceStatus(0, 7)).toBe("NO_ACTIVITY");
    expect(calculatePaceStatus(8, 7)).toBe("AHEAD");
    expect(calculatePaceStatus(7, 7)).toBe("ON_TRACK");
    expect(calculatePaceStatus(5.5, 7)).toBe("SLIGHTLY_BEHIND");
    expect(calculatePaceStatus(3, 7)).toBe("BEHIND");
  });

  it("CRITICAL si inactif >= 7 et perf faible", () => {
    expect(
      calculateRiskLevel({
        readinessProbability: 55,
        inactiveDays: 7,
        qcmAverage: 60,
        progressPercent: 40,
      }),
    ).toBe("CRITICAL");
  });
});

describe("calculatePrediction — scénarios", () => {
  it("Tony Test (scénario principal)", () => {
    const result = calculatePrediction({
      completedActivities: 62,
      totalActivities: 100,
      progressPercent: 62,
      qcmAverage: 78,
      recentQcmAverage: 81,
      inactiveDays: 1,
      targetExamDate: "2026-09-25",
      currentPace: 5,
      asOf: AS_OF,
    });

    expect(result.progressPercent).toBe(62);
    expect(result.remainingActivities).toBe(38);
    expect(result.currentPace).toBe(5);
    expect(result.requiredPace).toBe(5.9);
    expect(result.predictedCompletionDate).not.toBeNull();
    expect(result.predictedReadinessDate).not.toBeNull();
    expect(result.readinessScore).not.toBeNull();
    expect(result.readinessProbability).not.toBeNull();
    expect(result.riskLevel).toMatch(/GREEN|AMBER|RED|CRITICAL/);
    expect(result.recommendedAction).toBeTruthy();
    expect(result.issues).not.toContain("MISSING_TARGET_DATE");
    expect(result.issues).not.toContain("INSUFFICIENT_QCM");
  });

  it("apprenant parfaitement à jour", () => {
    const result = calculatePrediction({
      completedActivities: 80,
      totalActivities: 100,
      qcmAverage: 90,
      inactiveDays: 0,
      targetExamDate: "2026-09-25",
      currentPace: 10,
      asOf: AS_OF,
    });
    expect(result.riskLevel).toBe("GREEN");
    expect(result.paceStatus).toMatch(/ON_TRACK|AHEAD/);
  });

  it("apprenant très en retard", () => {
    const result = calculatePrediction({
      completedActivities: 20,
      totalActivities: 100,
      qcmAverage: 55,
      inactiveDays: 4,
      targetExamDate: "2026-09-25",
      currentPace: 2,
      asOf: AS_OF,
    });
    expect(result.riskLevel).toBe("RED");
    expect(result.paceStatus).toBe("BEHIND");
  });

  it("sans activité", () => {
    const result = calculatePrediction({
      completedActivities: 10,
      totalActivities: 100,
      qcmAverage: 70,
      inactiveDays: 10,
      targetExamDate: "2026-09-25",
      currentPace: 0,
      asOf: AS_OF,
    });
    expect(result.paceStatus).toBe("NO_ACTIVITY");
    expect(result.issues).toContain("ZERO_CURRENT_PACE");
    expect(result.predictedCompletionDate).toBeNull();
  });

  it("sans QCM", () => {
    const result = calculatePrediction({
      completedActivities: 40,
      totalActivities: 100,
      qcmAverage: null,
      inactiveDays: 1,
      targetExamDate: "2026-09-25",
      currentPace: 5,
      asOf: AS_OF,
    });
    expect(result.issues).toContain("INSUFFICIENT_QCM");
    expect(result.readinessScore).toBeNull();
    expect(result.recommendedAction).toMatch(/QCM/i);
  });

  it("100 % terminé", () => {
    const result = calculatePrediction({
      completedActivities: 100,
      totalActivities: 100,
      qcmAverage: 85,
      inactiveDays: 0,
      targetExamDate: "2026-09-25",
      currentPace: 5,
      asOf: AS_OF,
    });
    expect(result.remainingActivities).toBe(0);
    expect(result.requiredPace).toBe(0);
    expect(result.issues).toContain("NO_REMAINING_WORK");
  });

  it("date cible passée", () => {
    const result = calculatePrediction({
      completedActivities: 50,
      totalActivities: 100,
      qcmAverage: 70,
      inactiveDays: 1,
      targetExamDate: "2026-07-01",
      currentPace: 5,
      asOf: AS_OF,
    });
    expect(result.issues).toContain("TARGET_DATE_PASSED");
    expect(result.requiredPace).toBeNull();
  });

  it("date cible très éloignée", () => {
    const result = calculatePrediction({
      completedActivities: 10,
      totalActivities: 100,
      qcmAverage: 75,
      inactiveDays: 1,
      targetExamDate: "2027-12-31",
      currentPace: 3,
      asOf: AS_OF,
    });
    expect(result.requiredPace).not.toBeNull();
    expect(result.requiredPace!).toBeLessThan(2);
  });

  it("sans date cible", () => {
    const result = calculatePrediction({
      completedActivities: 40,
      totalActivities: 100,
      qcmAverage: 80,
      inactiveDays: 1,
      targetExamDate: null,
      currentPace: 5,
      asOf: AS_OF,
    });
    expect(result.issues).toContain("MISSING_TARGET_DATE");
    expect(result.requiredPace).toBeNull();
  });

  it("current pace manquant", () => {
    const result = calculatePrediction({
      completedActivities: 40,
      totalActivities: 100,
      qcmAverage: 80,
      inactiveDays: 1,
      targetExamDate: "2026-09-25",
      currentPace: null,
      asOf: AS_OF,
    });
    expect(result.issues).toContain("INSUFFICIENT_ACTIVITY_FOR_PACE");
    expect(result.currentPace).toBeNull();
  });

  it("résultats déterministes (même entrée → même sortie)", () => {
    const input = {
      completedActivities: 62,
      totalActivities: 100,
      progressPercent: 62,
      qcmAverage: 78,
      recentQcmAverage: 81,
      inactiveDays: 1,
      targetExamDate: "2026-09-25",
      currentPace: 5,
      asOf: AS_OF,
    };
    expect(calculatePrediction(input)).toEqual(calculatePrediction(input));
  });
});

describe("readiness score composition", () => {
  it("produit un score entre 0 et 100", () => {
    const score = calculateReadinessScore({
      progressPercent: 62,
      qcmAverage: 78,
      recentQcmAverage: 81,
      inactiveDays: 1,
      currentPace: 5,
      requiredPace: 5.9,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
