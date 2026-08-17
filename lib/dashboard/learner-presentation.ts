import { LEARNER_COPY } from "@/lib/learner/copy";
import { predictionIssueKey } from "@/lib/i18n/labels";
import { translate } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/translate";
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

/** Messages pédagogiques FR (explication moteur / API). L’UI apprenant utilise t(predictionIssueKey). */
export const ISSUE_LEARNER_MESSAGES: Record<PredictionDataIssue, string> = {
  INSUFFICIENT_QCM: translate("fr", "learner.issue.insufficientQcm"),
  ZERO_CURRENT_PACE: translate("fr", "learner.issue.zeroPace"),
  INSUFFICIENT_ACTIVITY_FOR_PACE: translate(
    "fr",
    "learner.issue.insufficientActivity",
  ),
  INCOMPLETE_METRICS: translate("fr", "learner.issue.incompleteMetrics"),
  MISSING_TARGET_DATE: translate("fr", "learner.issue.missingDate"),
  TARGET_DATE_PASSED: translate("fr", "learner.issue.targetPassed"),
  NO_REMAINING_WORK: translate("fr", "learner.issue.noRemainingWork"),
};

export function getLearnerIssueExplanationKeys(issues: PredictionDataIssue[]) {
  const seen = new Set<string>();
  const keys: Array<ReturnType<typeof predictionIssueKey>> = [];
  for (const issue of issues) {
    const key = predictionIssueKey(issue);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

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
    return LEARNER_COPY.actionMissingDate;
  }

  if (issues.has("TARGET_DATE_PASSED")) {
    return LEARNER_COPY.actionTargetDatePassed;
  }

  if (issues.has("INSUFFICIENT_QCM") && issues.has("ZERO_CURRENT_PACE")) {
    return translate("fr", "learner.action.qcmAndPace");
  }

  if (issues.has("INSUFFICIENT_QCM")) {
    return translate("fr", "learner.action.moreQcm");
  }

  if (
    issues.has("ZERO_CURRENT_PACE") ||
    issues.has("INSUFFICIENT_ACTIVITY_FOR_PACE")
  ) {
    return translate("fr", "learner.action.keepPace");
  }

  if (issues.has("INCOMPLETE_METRICS")) {
    return translate("fr", "learner.action.incomplete");
  }

  if (prediction.recommendedAction?.trim()) {
    return prediction.recommendedAction.trim();
  }

  if (prediction.readinessScore == null) {
    return translate("fr", "learner.action.waitingScore");
  }

  return translate("fr", "learner.action.keepPreparing");
}

/**
 * Clé i18n de l’action prioritaire — null si le moteur fournit déjà un texte.
 */
export function resolveLearnerRecommendedActionKey(
  prediction: Pick<
    PredictionResult,
    "issues" | "recommendedAction" | "readinessScore"
  >,
): MessageKey | null {
  const issues = new Set(prediction.issues);

  if (issues.has("MISSING_TARGET_DATE")) {
    return "learner.action.missingDate";
  }
  if (issues.has("TARGET_DATE_PASSED")) {
    return "learner.action.targetPassed";
  }
  if (issues.has("INSUFFICIENT_QCM") && issues.has("ZERO_CURRENT_PACE")) {
    return "learner.action.qcmAndPace";
  }
  if (issues.has("INSUFFICIENT_QCM")) {
    return "learner.action.moreQcm";
  }
  if (
    issues.has("ZERO_CURRENT_PACE") ||
    issues.has("INSUFFICIENT_ACTIVITY_FOR_PACE")
  ) {
    return "learner.action.keepPace";
  }
  if (issues.has("INCOMPLETE_METRICS")) {
    return "learner.action.incomplete";
  }
  if (prediction.recommendedAction?.trim()) {
    return null;
  }
  if (prediction.readinessScore == null) {
    return "learner.action.waitingScore";
  }
  return "learner.action.keepPreparing";
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
