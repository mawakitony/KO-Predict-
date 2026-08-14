import { RISK_THRESHOLDS } from "@/lib/prediction/constants";
import type { RiskLevel } from "@/types/prediction";

/**
 * Niveaux de risque V1 :
 * GREEN  >= 80%
 * AMBER  60–79.99%
 * RED    < 60%
 * CRITICAL si inactive_days >= 7 ET performances faibles / en baisse
 */
export function calculateRiskLevel(options: {
  readinessProbability: number | null;
  inactiveDays: number;
  qcmAverage: number | null;
  recentQcmAverage?: number | null;
  progressPercent: number | null;
}): RiskLevel | null {
  const {
    readinessProbability,
    inactiveDays,
    qcmAverage,
    recentQcmAverage,
    progressPercent,
  } = options;

  if (readinessProbability == null) return null;

  const weakPerformance =
    (qcmAverage != null && qcmAverage < 70) ||
    (progressPercent != null && progressPercent < 50) ||
    (qcmAverage != null &&
      recentQcmAverage != null &&
      recentQcmAverage < qcmAverage - 5);

  if (
    inactiveDays >= RISK_THRESHOLDS.criticalInactiveDays &&
    weakPerformance
  ) {
    return "CRITICAL";
  }

  if (readinessProbability >= RISK_THRESHOLDS.greenMin) return "GREEN";
  if (readinessProbability >= RISK_THRESHOLDS.amberMin) return "AMBER";
  return "RED";
}
