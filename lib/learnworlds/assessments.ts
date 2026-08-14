import "server-only";

import {
  createLearnWorldsClient,
  type LearnWorldsClient,
} from "@/lib/learnworlds/client";
import { LEARNWORLDS_PATHS, lwPath } from "@/lib/learnworlds/config";
import { LearnWorldsEndpointPendingError } from "@/lib/learnworlds/errors";
import type { LearnWorldsAssessmentScore } from "@/types/learnworlds";

export { summarizeAssessmentScores } from "@/lib/learnworlds/aggregations";

/**
 * Scores QCM via GET /v2/assessments/{id}/responses?users=
 *
 * Confirmé live (200 + grade + submittedTimestamp).
 * Non utilisé en sync V1 : N+1 trop coûteux (1 appel / assessment).
 * La sync utilise plutôt score_on_unit dans /v2/users/{id}/progress.
 */
export async function listUserAssessmentScores(
  userId: string,
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsAssessmentScore[]> {
  void userId;
  void client;
  throw new LearnWorldsEndpointPendingError(
    "listUserAssessmentScores",
    `Utiliser extractAssessmentScoresFromProgress (progress) en V1. ` +
      `Réponses détaillées : ${LEARNWORLDS_PATHS.userAssessments} (N+1). ` +
      `path=${lwPath(LEARNWORLDS_PATHS.userAssessments, { id: "{assessmentId}" })}`,
  );
}
