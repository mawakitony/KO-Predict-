import { describe, expect, it } from "vitest";
import { comparePredictionTrajectory } from "@/lib/prediction/diff";

describe("comparePredictionTrajectory", () => {
  it("détecte une date de préparation repoussée de 7 jours (cas CDC)", () => {
    const diff = comparePredictionTrajectory(
      {
        predictedCompletionDate: "2026-09-13",
        predictedReadinessDate: "2026-09-20",
        currentPace: 4,
        requiredPace: 5,
      },
      {
        predictedCompletionDate: "2026-09-20",
        predictedReadinessDate: "2026-09-27",
        currentPace: 4,
        requiredPace: 7,
      },
    );

    expect(diff.readinessDaysDelta).toBe(7);
    expect(diff.postponed).toBe(true);
    expect(diff.headline).toBe(
      "Votre date prévue de préparation a été repoussée de 7 jours.",
    );
    expect(diff.paceHint).toContain("4 activités par semaine");
    expect(diff.paceHint).toContain("7 activités par semaine");
  });

  it("détecte une date avancée", () => {
    const diff = comparePredictionTrajectory(
      {
        predictedCompletionDate: "2026-09-20",
        predictedReadinessDate: "2026-09-27",
      },
      {
        predictedCompletionDate: "2026-09-13",
        predictedReadinessDate: "2026-09-20",
        currentPace: 6,
        requiredPace: 5,
      },
    );

    expect(diff.readinessDaysDelta).toBe(-7);
    expect(diff.advanced).toBe(true);
    expect(diff.headline).toContain("avancée de 7 jours");
    expect(diff.paceHint).toBeNull();
  });

  it("sans historique précédent → pas de headline", () => {
    const diff = comparePredictionTrajectory(null, {
      predictedCompletionDate: "2026-09-20",
      predictedReadinessDate: "2026-09-27",
      currentPace: 4,
      requiredPace: 7,
    });
    expect(diff.headline).toBeNull();
    expect(diff.readinessDaysDelta).toBeNull();
  });
});
