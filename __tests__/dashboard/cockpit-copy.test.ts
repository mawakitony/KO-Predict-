import { describe, expect, it } from "vitest";
import {
  cockpitCountdownInterpretation,
  cockpitDaysUntil,
  cockpitEstimationTips,
  cockpitHeroNarrative,
  cockpitPriorityWhy,
  cockpitRiskLabel,
} from "@/lib/dashboard/cockpit-copy";

describe("cockpitRiskLabel", () => {
  it("traduit les niveaux techniques", () => {
    expect(cockpitRiskLabel("GREEN")).toBe("Trajectoire maîtrisée");
    expect(cockpitRiskLabel("AMBER")).toBe("À surveiller");
    expect(cockpitRiskLabel("RED")).toBe("Risque élevé");
    expect(cockpitRiskLabel("CRITICAL")).toBe("Risque élevé");
    expect(cockpitRiskLabel(null)).toBe("Statut non évalué");
  });
});

describe("cockpitHeroNarrative", () => {
  it("reste neutre si readiness null", () => {
    expect(
      cockpitHeroNarrative({
        readinessScore: null,
        paceStatus: null,
        currentPace: null,
        requiredPace: null,
      }),
    ).toContain("pas encore disponible");
  });

  it("utilise le rythme existant pour un léger retard", () => {
    const text = cockpitHeroNarrative({
      readinessScore: 46,
      paceStatus: "SLIGHTLY_BEHIND",
      currentPace: 4,
      requiredPace: 7,
    });
    expect(text).toContain("4");
    expect(text).toContain("7");
  });
});

describe("cockpitPriorityWhy", () => {
  it("priorise paceHint moteur", () => {
    expect(
      cockpitPriorityWhy({
        paceHint: "Message rythme existant.",
        currentPace: 4,
        requiredPace: 7,
        issues: [],
      }),
    ).toBe("Message rythme existant.");
  });
});

describe("cockpitDaysUntil / interpretation", () => {
  it("ne calcule pas J-n sans date", () => {
    expect(cockpitDaysUntil(null)).toBeNull();
  });

  it("interprète un retard de préparation vs cible", () => {
    const text = cockpitCountdownInterpretation({
      targetExamDate: "2026-09-26",
      predictedReadinessDate: "2026-10-08",
    });
    expect(text).toContain("après votre date cible");
  });

  it("interprète une trajectoire compatible", () => {
    const text = cockpitCountdownInterpretation({
      targetExamDate: "2026-10-08",
      predictedReadinessDate: "2026-10-08",
    });
    expect(text).toContain("compatible");
  });
});

describe("cockpitEstimationTips", () => {
  it("ne propose que des tips liés aux issues", () => {
    expect(cockpitEstimationTips(["INSUFFICIENT_QCM"])).toEqual([
      "réalisez davantage de QCM",
    ]);
    expect(cockpitEstimationTips([])).toEqual([]);
  });
});
