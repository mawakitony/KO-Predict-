import { describe, expect, it } from "vitest";
import { formatDateFr } from "@/lib/dashboard/format";
import {
  getLearnerIssueExplanations,
  isCollectingDataState,
  isLearnerDashboardCollecting,
  learnerRiskDisplay,
  resolveLearnerPredictionUiState,
  resolveLearnerRecommendedAction,
} from "@/lib/dashboard/learner-presentation";
import { cockpitDaysUntil } from "@/lib/dashboard/cockpit-copy";
import type { PredictionResult } from "@/types/prediction";

function basePrediction(
  overrides: Partial<PredictionResult>,
): PredictionResult {
  return {
    progressPercent: 0,
    remainingActivities: 100,
    currentPace: 0,
    requiredPace: 40.9,
    readinessScore: null,
    readinessProbability: null,
    predictedCompletionDate: null,
    predictedReadinessDate: null,
    riskLevel: null,
    paceStatus: "NO_ACTIVITY",
    recommendedAction: "Action moteur brute",
    issues: [],
    calculatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("learner presentation — données insuffisantes", () => {
  it("CAS 1 : INSUFFICIENT_QCM + ZERO_CURRENT_PACE → collecte, pas de faux 0", () => {
    const prediction = basePrediction({
      issues: ["INSUFFICIENT_QCM", "ZERO_CURRENT_PACE"],
      readinessScore: null,
    });

    expect(resolveLearnerPredictionUiState(prediction)).toBe("COLLECTING_DATA");
    expect(isCollectingDataState(prediction)).toBe(true);
    expect(prediction.readinessScore).toBeNull();
    expect(resolveLearnerRecommendedAction(prediction)).toBe(
      "Continuez votre formation et réalisez quelques QCM afin que KO Predict™ puisse établir votre première estimation.",
    );
    expect(getLearnerIssueExplanations(prediction.issues)).toEqual([
      "Pas encore assez de résultats QCM pour évaluer votre niveau de maîtrise.",
      "Votre rythme d'étude n'est pas encore suffisamment établi.",
    ]);
    expect(getLearnerIssueExplanations(prediction.issues).join(" ")).not.toContain(
      "INSUFFICIENT_QCM",
    );
  });

  it("CAS 2 : date cible manquante", () => {
    const prediction = basePrediction({
      issues: ["MISSING_TARGET_DATE"],
      requiredPace: null,
    });
    expect(resolveLearnerPredictionUiState(prediction)).toBe(
      "INSUFFICIENT_DATA",
    );
    expect(resolveLearnerRecommendedAction(prediction)).toBe(
      "Renseignez votre date cible d'examen dans votre profil LearnWorlds.",
    );
  });

  it("CAS 3 : readiness disponible → pas de collecte", () => {
    const prediction = basePrediction({
      readinessScore: 72,
      readinessProbability: 65,
      riskLevel: "GREEN",
      paceStatus: "ON_TRACK",
      issues: [],
      recommendedAction: "Maintenez votre rythme.",
    });
    expect(resolveLearnerPredictionUiState(prediction)).toBe("READY");
    expect(isCollectingDataState(prediction)).toBe(false);
    expect(resolveLearnerRecommendedAction(prediction)).toBe(
      "Maintenez votre rythme.",
    );
  });

  it("CAS 4 : probability null ne doit pas être présentée comme 0", () => {
    const prediction = basePrediction({
      readinessProbability: null,
      issues: ["INSUFFICIENT_QCM"],
    });
    expect(prediction.readinessProbability).toBeNull();
    expect(prediction.readinessProbability === 0).toBe(false);
  });

  it("CAS 5 : risk null → Non évalué", () => {
    expect(learnerRiskDisplay(null).title).toBe("Non évalué");
  });

  it("CAS 6 : date cible format FR", () => {
    expect(formatDateFr("2026-09-26")).toBe("26 septembre 2026");
  });

  it("priorité QCM seul vs rythme seul", () => {
    expect(
      resolveLearnerRecommendedAction(
        basePrediction({ issues: ["INSUFFICIENT_QCM"] }),
      ),
    ).toContain("QCM");
    expect(
      resolveLearnerRecommendedAction(
        basePrediction({ issues: ["ZERO_CURRENT_PACE"] }),
      ),
    ).toContain("rythme");
  });

  it("AT_RISK lorsque score présent et risque élevé", () => {
    expect(
      resolveLearnerPredictionUiState(
        basePrediction({
          readinessScore: 30,
          riskLevel: "RED",
          issues: [],
        }),
      ),
    ).toBe("AT_RISK");
  });
});

describe("isLearnerDashboardCollecting — modes dashboard", () => {
  it("COLLECTING_DATA → mode collecte", () => {
    const prediction = basePrediction({
      issues: ["INSUFFICIENT_QCM", "ZERO_CURRENT_PACE"],
      readinessScore: null,
    });
    expect(resolveLearnerPredictionUiState(prediction)).toBe("COLLECTING_DATA");
    expect(isLearnerDashboardCollecting(prediction)).toBe(true);
  });

  it("INSUFFICIENT_DATA → mode collecte", () => {
    const prediction = basePrediction({
      issues: ["MISSING_TARGET_DATE"],
      readinessScore: null,
    });
    expect(resolveLearnerPredictionUiState(prediction)).toBe(
      "INSUFFICIENT_DATA",
    );
    expect(isLearnerDashboardCollecting(prediction)).toBe(true);
  });

  it("READY → mode cockpit", () => {
    const prediction = basePrediction({
      readinessScore: 72,
      riskLevel: "GREEN",
      issues: [],
    });
    expect(resolveLearnerPredictionUiState(prediction)).toBe("READY");
    expect(isLearnerDashboardCollecting(prediction)).toBe(false);
  });

  it("AT_RISK → mode cockpit", () => {
    const prediction = basePrediction({
      readinessScore: 30,
      riskLevel: "RED",
      issues: [],
    });
    expect(resolveLearnerPredictionUiState(prediction)).toBe("AT_RISK");
    expect(isLearnerDashboardCollecting(prediction)).toBe(false);
  });

  it("date cible présente → J-n calculable ; absente → pas de J-n inventé", () => {
    expect(cockpitDaysUntil("2026-09-26", new Date("2026-08-13"))).toBe(44);
    expect(cockpitDaysUntil(null)).toBeNull();
  });
});
