/**
 * Couche d'intégration LearnWorlds — Phase 9.
 *
 * - Auth OAuth2 / Bearer : confirmée (client.ts)
 * - Endpoints métier users/progress/assessments/activity : stubs
 *   « À confirmer avec la documentation API LearnWorlds »
 * - Custom field `cf_ko_target_exam_date` → students.target_exam_date (mappers.ts)
 *
 * Doc : https://www.learnworlds.dev/
 */

export {
  LEARNWORLDS_PATHS,
  getLearnWorldsConfig,
  assertLearnWorldsConfigured,
  isLearnWorldsConfigured,
} from "@/lib/learnworlds/config";
export {
  LearnWorldsClient,
  createLearnWorldsClient,
} from "@/lib/learnworlds/client";
export {
  LearnWorldsApiError,
  LearnWorldsConfigError,
  LearnWorldsEndpointPendingError,
} from "@/lib/learnworlds/errors";
export { listUserAssessmentScores } from "@/lib/learnworlds/assessments";
export { listUserActivity } from "@/lib/learnworlds/activity";
export {
  aggregateCourseProgress,
  summarizeAssessmentScores,
  getLastActivityDate,
  calculateInactiveDays,
} from "@/lib/learnworlds/aggregations";
export {
  parseTargetExamDateFromCustomFields,
  resolvePersistedTargetExamDate,
  mapLearnWorldsUserToStudentFields,
  emptyNormalizedSnapshot,
} from "@/lib/learnworlds/mappers";
export {
  syncLearnWorldsLearner,
  type SyncLearnerInput,
  type SyncLearnerResult,
} from "@/lib/learnworlds/sync";
export {
  verifyLearnWorldsWebhookSignature,
  computeLearnWorldsWebhookSignature,
} from "@/lib/learnworlds/webhooks/signature";
export {
  parseLearnWorldsWebhookPayload,
  buildWebhookDeliveryKey,
  LEARNWORLDS_SYNC_EVENT_TYPES,
} from "@/lib/learnworlds/webhooks/parse";
export {
  getLearnWorldsUserById,
  getLearnWorldsUserByEmail,
  listLearnWorldsUsers,
  extractTargetExamDate,
} from "@/lib/learnworlds/users";
export {
  listUserEnrollments,
  getUserCourseProgress,
  getUserCourseProgressList,
  listCourses,
} from "@/lib/learnworlds/progress";
