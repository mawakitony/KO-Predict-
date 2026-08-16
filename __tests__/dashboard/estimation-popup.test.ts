import { describe, expect, it } from "vitest";
import { buildEstimationPopupContent } from "@/lib/dashboard/estimation-popup";

describe("buildEstimationPopupContent", () => {
  it("n’affiche pas le popup si readiness disponible", () => {
    const popup = buildEstimationPopupContent({
      readinessScore: 72,
      riskLevel: "GREEN",
      issues: [],
      recommendedAction: null,
    });
    expect(popup.show).toBe(false);
  });

  it("affiche le popup selon les issues QCM + rythme", () => {
    const popup = buildEstimationPopupContent({
      readinessScore: null,
      riskLevel: null,
      issues: ["INSUFFICIENT_QCM", "ZERO_CURRENT_PACE"],
      recommendedAction: null,
    });
    expect(popup.show).toBe(true);
    expect(popup.title).toMatch(/estimation n’est pas encore disponible/i);
    expect(popup.reasons.length).toBeGreaterThanOrEqual(2);
    expect(popup.primaryLabel).toBe("Compris");
  });

  it("affiche le popup pour date cible manquante", () => {
    const popup = buildEstimationPopupContent({
      readinessScore: null,
      riskLevel: null,
      issues: ["MISSING_TARGET_DATE"],
      recommendedAction: null,
    });
    expect(popup.show).toBe(true);
    expect(popup.reasons[0]).toMatch(/date cible/i);
  });
});
