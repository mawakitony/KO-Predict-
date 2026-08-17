/**
 * Libellés persistés / API (FR V1).
 * L’affichage apprenant passe par t() + lib/i18n/fr.ts|en.ts.
 * Ne pas utiliser pour l’admin (LearnWorlds y reste techniquement utile).
 */

import { translate } from "@/lib/i18n/translate";

export const LEARNER_PLATFORM = translate("fr", "learner.platform");
export const LEARNER_TRAINING_SPACE = translate("fr", "learner.trainingSpace");

export const LEARNER_LAST_SYNC_LABEL = translate("fr", "learner.lastSync");

export const LEARNER_LAST_SYNC_UNAVAILABLE = translate(
  "fr",
  "learner.lastSyncUnavailable",
);

export const LEARNER_DATA_UNAVAILABLE_MESSAGE = translate(
  "fr",
  "learner.dataUnavailable",
);

export const LEARNER_COPY = {
  collectionNextStep: translate("fr", "learner.collectionNextStep"),
  progressKicker: translate("fr", "learner.progressKicker"),
  progressContinue: translate("fr", "learner.progressContinue"),
  datesSyncPrefix: LEARNER_LAST_SYNC_LABEL,
  issueTargetDatePassed: translate("fr", "learner.issue.targetPassed"),
  issueNoRemainingWork: translate("fr", "learner.issue.noRemainingWork"),
  actionMissingDate: translate("fr", "learner.action.missingDate"),
  actionTargetDatePassed: translate("fr", "learner.action.targetPassed"),
  learningKicker: translate("fr", "learner.learningKicker"),
  learningEmptyQuizzes: translate("fr", "learner.learningEmptyQuizzes"),
  planEmptySync: translate("fr", "learner.planEmptySync"),
  examCountdownMissing: translate("fr", "learner.examCountdownMissing"),
  profileSubtitle: translate("fr", "learner.profileSubtitle"),
  taskActivitiesStartup:
    "Avancez dans vos activités de formation afin que KO Predict™ puisse mesurer votre trajectoire.",
  taskTargetDate: translate("fr", "learner.action.missingDate"),
  taskActivitiesCatchUp: "Avancez régulièrement dans vos activités de formation.",
} as const;
