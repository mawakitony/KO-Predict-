import {
  getLearnerIssueExplanations,
  isLearnerDashboardCollecting,
  resolveLearnerRecommendedAction,
} from "@/lib/dashboard/learner-presentation";
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
  primaryLabel: string;
  secondaryLabel: string;
  secondaryHref: string;
}

const TITLE_UNAVAILABLE =
  "Pourquoi l’estimation n’est pas encore disponible ?";

/**
 * Contenu du popup d’explication — basé sur le statut réel (issues / readiness).
 * Ne s’affiche que si l’estimation n’est pas encore disponible.
 */
export function buildEstimationPopupContent(
  prediction: Pick<
    PredictionResult,
    "readinessScore" | "riskLevel" | "issues" | "recommendedAction"
  >,
): EstimationPopupContent {
  if (!isLearnerDashboardCollecting(prediction)) {
    return {
      show: false,
      title: TITLE_UNAVAILABLE,
      body: "",
      reasons: [],
      primaryLabel: "Compris",
      secondaryLabel: "Voir mon plan",
      secondaryHref: "/plan",
    };
  }

  const reasons = getLearnerIssueExplanations(prediction.issues);
  const action = resolveLearnerRecommendedAction(prediction);
  const body =
    reasons.length > 0
      ? "KO Predict™ n’affiche un score que lorsque les données minimales sont présentes. Voici ce qui bloque encore votre estimation :"
      : action;

  return {
    show: true,
    title: TITLE_UNAVAILABLE,
    body,
    reasons: reasons.length > 0 ? reasons : [],
    primaryLabel: "Compris",
    secondaryLabel: "Voir mon tableau de bord",
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
