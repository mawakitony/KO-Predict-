import { describe, expect, it } from "vitest";
import { READINESS_WEIGHTS } from "@/lib/prediction/constants";
import {
  READINESS_DISCLAIMER,
  buildReadinessExplanation,
} from "@/lib/prediction/explanation";
import { calculateReadinessScore } from "@/lib/prediction/readiness";

describe("buildReadinessExplanation", () => {
  it("utilise les pondérations READINESS_WEIGHTS sans les modifier", () => {
    expect(READINESS_WEIGHTS).toEqual({
      progress: 0.3,
      qcm: 0.3,
      consistency: 0.2,
      pace: 0.2,
    });

    const explanation = buildReadinessExplanation({
      readinessScore: 70,
      progressPercent: 60,
      qcmAverage: 80,
      recentQcmAverage: 70,
      inactiveDays: 1,
      currentPace: 7,
      requiredPace: 7,
      issues: [],
    });

    expect(explanation.mode).toBe("available");
    const weights = Object.fromEntries(
      explanation.factors.map((f) => [f.key, f.weightPercent]),
    );
    expect(weights.progress).toBe(30);
    expect(weights.qcm).toBe(30);
    expect(weights.consistency).toBe(20);
    expect(weights.pace).toBe(20);
  });

  it("calcule des contributions qui recomposent le score moteur", () => {
    const input = {
      progressPercent: 50,
      qcmAverage: 80,
      recentQcmAverage: null as number | null,
      inactiveDays: 1,
      currentPace: 4,
      requiredPace: 8,
    };
    const score = calculateReadinessScore(input);
    const explanation = buildReadinessExplanation({
      ...input,
      readinessScore: score,
      issues: [],
    });

    expect(explanation.mode).toBe("available");
    expect(explanation.recomputedScore).toBe(score);

    // progress 50×0.3=15 ; qcm 80×0.3=24 ; consistency 100×0.2=20 ; pace 50×0.2=10 → 69
    const byKey = Object.fromEntries(
      explanation.factors.map((f) => [f.key, f.contributionPoints]),
    );
    expect(byKey.progress).toBe(15);
    expect(byKey.qcm).toBe(24);
    expect(byKey.consistency).toBe(20);
    expect(byKey.pace).toBe(10);
    expect(score).toBe(69);
  });

  it("distingue QCM null (indisponible) de QCM 0 réel", () => {
    const withNull = buildReadinessExplanation({
      readinessScore: null,
      progressPercent: 40,
      qcmAverage: null,
      recentQcmAverage: null,
      inactiveDays: 2,
      currentPace: 3,
      requiredPace: 5,
      issues: ["INSUFFICIENT_QCM"],
    });
    expect(withNull.mode).toBe("unavailable");
    expect(
      withNull.unavailableReasons.some((r) =>
        r.toLowerCase().includes("qcm"),
      ),
    ).toBe(true);

    const withZero = buildReadinessExplanation({
      readinessScore: calculateReadinessScore({
        progressPercent: 40,
        qcmAverage: 0,
        inactiveDays: 2,
        currentPace: 5,
        requiredPace: 5,
      }),
      progressPercent: 40,
      qcmAverage: 0,
      recentQcmAverage: null,
      inactiveDays: 2,
      currentPace: 5,
      requiredPace: 5,
      issues: [],
    });
    expect(withZero.mode).toBe("available");
    const qcm = withZero.factors.find((f) => f.key === "qcm");
    expect(qcm?.factorScore).toBe(0);
    expect(qcm?.contributionPoints).toBe(0);
  });

  it("currentPace 0 réel produit un facteur rythme à 0, pas null", () => {
    const score = calculateReadinessScore({
      progressPercent: 55,
      qcmAverage: 70,
      inactiveDays: 3,
      currentPace: 0,
      requiredPace: 6,
    });
    const explanation = buildReadinessExplanation({
      readinessScore: score,
      progressPercent: 55,
      qcmAverage: 70,
      inactiveDays: 3,
      currentPace: 0,
      requiredPace: 6,
      issues: ["ZERO_CURRENT_PACE"],
    });
    expect(explanation.mode).toBe("available");
    const pace = explanation.factors.find((f) => f.key === "pace");
    expect(pace?.factorScore).toBe(0);
    expect(pace?.contributionPoints).toBe(0);
    expect(
      explanation.improve.some((m) => m.toLowerCase().includes("0")),
    ).toBe(true);
  });

  it("score null → mode unavailable avec issues, sans facteurs trompeurs", () => {
    const explanation = buildReadinessExplanation({
      readinessScore: null,
      progressPercent: null,
      qcmAverage: null,
      inactiveDays: 0,
      currentPace: null,
      requiredPace: null,
      issues: ["INSUFFICIENT_QCM", "INSUFFICIENT_ACTIVITY_FOR_PACE"],
    });
    expect(explanation.mode).toBe("unavailable");
    expect(explanation.factors).toHaveLength(0);
    expect(explanation.unavailableReasons.length).toBeGreaterThan(0);
    expect(explanation.disclaimer).toBe(READINESS_DISCLAIMER);
  });

  it("redistribue le poids si rythme non calculable", () => {
    const score = calculateReadinessScore({
      progressPercent: 60,
      qcmAverage: 60,
      inactiveDays: 1,
      currentPace: null,
      requiredPace: null,
    });
    const explanation = buildReadinessExplanation({
      readinessScore: score,
      progressPercent: 60,
      qcmAverage: 60,
      inactiveDays: 1,
      currentPace: null,
      requiredPace: null,
      issues: ["INSUFFICIENT_ACTIVITY_FOR_PACE"],
    });
    expect(explanation.paceRedistributed).toBe(true);
    expect(explanation.recomputedScore).toBe(score);
    const pace = explanation.factors.find((f) => f.key === "pace");
    expect(pace?.excluded).toBe(true);
    expect(pace?.contributionPoints).toBeNull();
    // 0.3/0.8 = 37.5 %
    expect(explanation.factors.find((f) => f.key === "progress")?.weightPercent).toBe(
      37.5,
    );
  });

  it("inclut le disclaimer d’estimation", () => {
    const explanation = buildReadinessExplanation({
      readinessScore: 80,
      progressPercent: 80,
      qcmAverage: 80,
      inactiveDays: 0,
      currentPace: 8,
      requiredPace: 8,
      issues: [],
    });
    expect(explanation.disclaimer).toContain("pas une garantie");
    expect(explanation.disclaimer.toLowerCase()).not.toContain("intelligence");
  });
});
