import {
  getLearnerIssueExplanationKeys,
  getLearnerIssueExplanations,
  isLearnerDashboardCollecting,
  resolveLearnerRecommendedAction,
} from "@/lib/dashboard/learner-presentation";
import { translate } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/storage";
import type { PredictionDataIssue, PredictionResult } from "@/types/prediction";

export const ESTIMATION_POPUP_DELAY_MS = 10_000;
export const ESTIMATION_POPUP_SESSION_KEY = "ko_estimation_popup_seen_v2";
export const ESTIMATION_POPUP_ENTER_KEY = "ko_estimation_popup_enter_at_v2";

export interface EstimationPopupContent {
  /** Afficher le popup (estimation absente / collecte). */
  show: boolean;
  title: string;
  body: string;
  reasons: string[];
  reasonKeys?: MessageKey[];
  primaryLabel: string;
  secondaryLabel: string;
  secondaryHref: string;
}

/**
 * Contenu du popup d’explication — basé sur le statut réel (issues / readiness).
 * Ne s’affiche que si l’estimation n’est pas encore disponible.
 */
export function buildEstimationPopupContent(
  prediction: Pick<
    PredictionResult,
    "readinessScore" | "riskLevel" | "issues" | "recommendedAction"
  >,
  locale: Locale = "fr",
): EstimationPopupContent {
  if (!isLearnerDashboardCollecting(prediction)) {
    return {
      show: false,
      title: translate(locale, "learner.estimationTitle"),
      body: "",
      reasons: [],
      reasonKeys: [],
      primaryLabel: translate(locale, "learner.understood"),
      secondaryLabel: translate(locale, "learner.seePlan"),
      secondaryHref: "/plan",
    };
  }

  const reasons = getLearnerIssueExplanations(prediction.issues);
  const reasonKeys = getLearnerIssueExplanationKeys(prediction.issues);
  const action = resolveLearnerRecommendedAction(prediction);
  const body =
    reasons.length > 0
      ? translate(locale, "learner.estimationBody")
      : action;

  return {
    show: true,
    title: translate(locale, "learner.estimationTitle"),
    body,
    reasons: reasons.length > 0 ? reasons : [],
    reasonKeys,
    primaryLabel: translate(locale, "learner.understood"),
    secondaryLabel: translate(locale, "learner.seeDashboard"),
    secondaryHref: "/dashboard",
  };
}

/** Pour tests / API : entrée minimale. */
export function buildEstimationPopupFromIssues(
  issues: PredictionDataIssue[],
  readinessScore: number | null = null,
): EstimationPopupContent {
  return buildEstimationPopupContent({
    readinessScore,
    riskLevel: null,
    issues,
    recommendedAction: null,
  });
}
