import type {
  PredictionDataIssue,
  PredictionResult,
  RiskLevel,
} from "@/types/prediction";

/**
 * États UI apprenant — dérivés du résultat moteur existant
 * (sans nouvelles formules).
 */
export type LearnerPredictionUiState =
  | "COLLECTING_DATA"
  | "INSUFFICIENT_DATA"
  | "READY"
  | "AT_RISK";

const COLLECTING_ISSUES: ReadonlySet<PredictionDataIssue> = new Set([
  "INSUFFICIENT_QCM",
  "ZERO_CURRENT_PACE",
  "INSUFFICIENT_ACTIVITY_FOR_PACE",
  "INCOMPLETE_METRICS",
]);

const INSUFFICIENT_BLOCKERS: ReadonlySet<PredictionDataIssue> = new Set([
  "MISSING_TARGET_DATE",
  "TARGET_DATE_PASSED",
  "NO_REMAINING_WORK",
]);

/** Messages pédagogiques — jamais les codes techniques bruts. */
export const ISSUE_LEARNER_MESSAGES: Record<PredictionDataIssue, string> = {
  INSUFFICIENT_QCM:
    "Pas encore assez de résultats QCM pour évaluer votre niveau de maîtrise.",
  ZERO_CURRENT_PACE:
    "Votre rythme d'étude n'est pas encore suffisamment établi.",
  INSUFFICIENT_ACTIVITY_FOR_PACE:
    "Pas encore assez d'activité récente pour estimer votre rythme d'étude.",
  INCOMPLETE_METRICS:
    "Certaines données de formation sont encore incomplètes.",
  MISSING_TARGET_DATE:
    "Définissez votre date cible d'examen pour permettre à KO Predict™ de calculer votre trajectoire.",
  TARGET_DATE_PASSED:
    "Votre date cible d'examen est dépassée. Mettez-la à jour dans LearnWorlds pour recalculer votre trajectoire.",
  NO_REMAINING_WORK:
    "Le parcours semble terminé côté activités. Vérifiez votre progression dans LearnWorlds.",
};

export function resolveLearnerPredictionUiState(
  prediction: Pick<PredictionResult, "readinessScore" | "riskLevel" | "issues">,
): LearnerPredictionUiState {
  if (prediction.readinessScore != null) {
    if (
      prediction.riskLevel === "AMBER" ||
      prediction.riskLevel === "RED" ||
      prediction.riskLevel === "CRITICAL"
    ) {
      return "AT_RISK";
    }
    return "READY";
  }

  const hasCollecting = prediction.issues.some((i) => COLLECTING_ISSUES.has(i));
  const hasBlocker = prediction.issues.some((i) =>
    INSUFFICIENT_BLOCKERS.has(i),
  );

  if (hasCollecting) return "COLLECTING_DATA";
  if (hasBlocker || prediction.issues.length > 0) return "INSUFFICIENT_DATA";
  return "INSUFFICIENT_DATA";
}

export function isCollectingDataState(
  prediction: Pick<PredictionResult, "readinessScore" | "riskLevel" | "issues">,
): boolean {
  return resolveLearnerPredictionUiState(prediction) === "COLLECTING_DATA";
}

/**
 * Source de vérité UI dashboard apprenant :
 * COLLECTING_DATA | INSUFFICIENT_DATA → mode collecte (UI courte)
 * READY | AT_RISK → mode cockpit (analyses complètes)
 *
 * Garde défensive : readinessScore == null force aussi le mode collecte.
 */
export function isLearnerDashboardCollecting(
  prediction: Pick<PredictionResult, "readinessScore" | "riskLevel" | "issues">,
): boolean {
  const state = resolveLearnerPredictionUiState(prediction);
  if (state === "COLLECTING_DATA" || state === "INSUFFICIENT_DATA") {
    return true;
  }
  // Garde centralisée (ne pas disperser readinessScore == null dans la page)
  return prediction.readinessScore == null;
}

export function getLearnerIssueExplanations(
  issues: PredictionDataIssue[],
): string[] {
  const seen = new Set<string>();
  const messages: string[] = [];
  for (const issue of issues) {
    const msg = ISSUE_LEARNER_MESSAGES[issue];
    if (msg && !seen.has(msg)) {
      seen.add(msg);
      messages.push(msg);
    }
  }
  return messages;
}

/**
 * Une seule action priorisée (pas de messages contradictoires).
 * Priorité : date cible → QCM (+ rythme) → rythme seul → autres → moteur.
 */
export function resolveLearnerRecommendedAction(
  prediction: Pick<PredictionResult, "issues" | "recommendedAction" | "readinessScore">,
): string {
  const issues = new Set(prediction.issues);

  if (issues.has("MISSING_TARGET_DATE")) {
    return "Renseignez votre date cible d'examen dans votre profil LearnWorlds.";
  }

  if (issues.has("TARGET_DATE_PASSED")) {
    return "Mettez à jour votre date cible d'examen dans LearnWorlds pour recalculer votre trajectoire.";
  }

  if (issues.has("INSUFFICIENT_QCM") && issues.has("ZERO_CURRENT_PACE")) {
    return "Continuez votre formation et réalisez quelques QCM afin que KO Predict™ puisse établir votre première estimation.";
  }

  if (issues.has("INSUFFICIENT_QCM")) {
    return "Réalisez davantage de QCM pour permettre à KO Predict™ d'évaluer votre niveau de maîtrise.";
  }

  if (
    issues.has("ZERO_CURRENT_PACE") ||
    issues.has("INSUFFICIENT_ACTIVITY_FOR_PACE")
  ) {
    return "Poursuivez régulièrement votre formation afin que KO Predict™ puisse mesurer votre rythme d'étude.";
  }

  if (issues.has("INCOMPLETE_METRICS")) {
    return "Continuez votre formation : KO Predict™ finalisera votre estimation dès que les données seront complètes.";
  }

  if (prediction.recommendedAction?.trim()) {
    return prediction.recommendedAction.trim();
  }

  if (prediction.readinessScore == null) {
    return "Continuez votre formation : KO Predict™ calculera automatiquement votre première estimation dès que suffisamment de données seront disponibles.";
  }

  return "Poursuivez votre préparation selon le rythme recommandé.";
}

export function learnerRiskDisplay(riskLevel: RiskLevel | null): {
  title: string;
  detail: string;
} {
  if (riskLevel == null) {
    return {
      title: "Non évalué",
      detail:
        "KO Predict™ ne dispose pas encore d'assez d'informations pour déterminer le risque.",
    };
  }
  switch (riskLevel) {
    case "GREEN":
      return { title: "Trajectoire maîtrisée", detail: "Trajectoire maîtrisée" };
    case "AMBER":
      return { title: "À surveiller", detail: "À surveiller" };
    case "RED":
      return { title: "Risque élevé", detail: "Risque élevé" };
    case "CRITICAL":
      return { title: "Risque élevé", detail: "Risque élevé" };
  }
}
