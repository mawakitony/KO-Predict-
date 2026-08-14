import type { CoachInterventionRecord } from "@/lib/admin/interventions/types";

export function summarizeInterventionCounts(
  cards: Array<{ intervention: CoachInterventionRecord }>,
): {
  critical: number;
  red: number;
  amber: number;
  open: number;
  contacted: number;
  followUp: number;
  resolved: number;
  active: number;
} {
  const summary = {
    critical: 0,
    red: 0,
    amber: 0,
    open: 0,
    contacted: 0,
    followUp: 0,
    resolved: 0,
    active: 0,
  };

  for (const card of cards) {
    const { status, riskLevel } = card.intervention;
    if (status === "OPEN") summary.open += 1;
    if (status === "CONTACTED") summary.contacted += 1;
    if (status === "FOLLOW_UP") summary.followUp += 1;
    if (status === "RESOLVED") summary.resolved += 1;
    if (status !== "RESOLVED") {
      summary.active += 1;
      if (riskLevel === "CRITICAL") summary.critical += 1;
      else if (riskLevel === "RED") summary.red += 1;
      else if (riskLevel === "AMBER") summary.amber += 1;
    }
  }
  return summary;
}
