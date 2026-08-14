import type {

  InvitationDbStatus,

  KoPredictAccountStatus,

  PredictionStatus,

  ProfileAccountStatusDb,

} from "@/lib/admin/types";

import { resolveUiAccountStatus } from "@/lib/admin/account-access-constants";

import type { PredictionResult } from "@/types/prediction";



export function normalizeEmail(email: string | null | undefined): string | null {

  if (!email) return null;

  const n = email.trim().toLowerCase();

  return n || null;

}



/**

 * Statut UI LearnWorlds / KO Predict.

 * Le nouveau parcours V1 pilote via profiles.account_status

 * (PENDING_ACTIVATION | ACTIVE | DISABLED).

 * invitationStatus n’est plus écrit ; conservé en lecture pour historique.

 */

export function deriveAccountStatus(options: {

  isFullyLinked: boolean;

  invitationStatus?: InvitationDbStatus | null;

  profileAccountStatus?: ProfileAccountStatusDb | null;

}): KoPredictAccountStatus {

  return resolveUiAccountStatus({

    profileAccountStatus: options.profileAccountStatus ?? null,

    isFullyLinked: options.isFullyLinked,

    invitationStatus: options.invitationStatus ?? null,

  });

}



/** Compte actif = Auth + profile + student + learnworlds_user_id. */

export function isFullyLinkedAccount(options: {

  authUserId: string | null;

  profileId: string | null;

  studentId: string | null;

  learnworldsUserIdOnStudent: string | null;

  expectedLearnworldsUserId: string;

}): boolean {

  return Boolean(

    options.authUserId &&

      options.profileId &&

      options.studentId &&

      options.learnworldsUserIdOnStudent === options.expectedLearnworldsUserId,

  );

}



export function derivePredictionStatus(

  prediction: PredictionResult | null,

  syncError?: string | null,

): PredictionStatus {

  if (syncError) return "ERROR";

  if (!prediction) return "NONE";

  const blocking = prediction.issues.filter(

    (i) =>

      i === "MISSING_TARGET_DATE" ||

      i === "INSUFFICIENT_QCM" ||

      i === "INCOMPLETE_METRICS" ||

      i === "INSUFFICIENT_ACTIVITY_FOR_PACE",

  );

  if (

    prediction.readinessScore == null &&

    (blocking.length > 0 || prediction.issues.length > 0)

  ) {

    return "INSUFFICIENT_DATA";

  }

  if (prediction.readinessScore != null || prediction.predictedCompletionDate) {

    return "READY";

  }

  return "INSUFFICIENT_DATA";

}



export function certificationFromTags(tags: string[]): string {

  const joined = tags.join(" ").toLowerCase();

  if (joined.includes("capm")) return "CAPM";

  if (joined.includes("pmp")) return "PMP";

  if (tags[0]) return tags[0].slice(0, 40);

  return "PMP";

}

