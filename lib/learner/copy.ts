/**
 * Libellés visibles côté apprenant.
 * Ne pas utiliser pour l’admin (LearnWorlds y reste techniquement utile).
 */

export const LEARNER_PLATFORM = "plateforme WOLOYEM";
export const LEARNER_TRAINING_SPACE = "espace de formation WOLOYEM";

export const LEARNER_LAST_SYNC_LABEL =
  "Dernière synchronisation avec la plateforme WOLOYEM";

export const LEARNER_LAST_SYNC_UNAVAILABLE =
  "Dernière synchronisation indisponible";

export const LEARNER_DATA_UNAVAILABLE_MESSAGE =
  "Vos données de l’espace de formation WOLOYEM sont momentanément indisponibles.";

export const LEARNER_COPY = {
  collectionNextStep: `Suivez votre formation sur la ${LEARNER_PLATFORM} : KO Predict™ mettra à jour votre tableau de bord dès que possible.`,
  progressKicker: "Parcours de formation",
  progressContinue: `Continuez votre formation sur la ${LEARNER_PLATFORM} : activités et quiz s'afficheront automatiquement après synchronisation.`,
  datesSyncPrefix: LEARNER_LAST_SYNC_LABEL,
  issueTargetDatePassed: `Votre date cible d'examen est dépassée. Mettez-la à jour dans votre ${LEARNER_TRAINING_SPACE} pour recalculer votre trajectoire.`,
  issueNoRemainingWork:
    "Le parcours semble terminé côté activités. Vérifiez votre progression pédagogique.",
  actionMissingDate: `Renseignez votre date cible d'examen dans votre ${LEARNER_TRAINING_SPACE}.`,
  actionTargetDatePassed: `Mettez à jour votre date cible d'examen dans votre ${LEARNER_TRAINING_SPACE} pour recalculer votre trajectoire.`,
  learningKicker: "Historique de formation",
  learningEmptyQuizzes: `Pas encore de résultat QCM. Vos scores apparaîtront après vos premiers quiz sur la ${LEARNER_PLATFORM}.`,
  planEmptySync: `Votre premier plan sera généré automatiquement après la prochaine synchronisation avec la ${LEARNER_PLATFORM}.`,
  examCountdownMissing: `Renseignez votre date cible dans votre ${LEARNER_TRAINING_SPACE} pour activer le compte à rebours et la trajectoire.`,
  profileSubtitle: `Préférences KO Predict™ — indépendantes de l’${LEARNER_TRAINING_SPACE}`,
  taskActivitiesStartup:
    "Avancez dans vos activités de formation afin que KO Predict™ puisse mesurer votre trajectoire.",
  taskTargetDate: `Indiquez votre date cible d’examen dans l’${LEARNER_TRAINING_SPACE} pour activer le calcul de trajectoire.`,
  taskActivitiesCatchUp:
    "Avancez régulièrement dans vos activités de formation.",
} as const;
