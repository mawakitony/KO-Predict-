/**

 * Accès compte KO Predict™ — désactivation / réactivation / activation code.

 *

 * Auth : ban via admin.updateUserById({ ban_duration })

 * App   : profiles.account_status ACTIVE | DISABLED | PENDING_ACTIVATION

 */



/** ~100 ans — ban « permanent » documenté Supabase Admin Auth. */

export const AUTH_BAN_DURATION_DISABLED = "876000h";



/** Lève le ban Auth. */

export const AUTH_BAN_DURATION_NONE = "none";



export const DISABLED_ACCESS_MESSAGE =

  "Votre accès KO Predict™ a été désactivé. Contactez WOLOYEM.";



export type ProfileAccountStatus =

  | "ACTIVE"

  | "DISABLED"

  | "PENDING_ACTIVATION";



export function resolveUiAccountStatus(options: {

  profileAccountStatus: ProfileAccountStatus | null;

  isFullyLinked: boolean;

  /** Historique invitations email — plus écrit en V1 code. */

  invitationStatus?: "PENDING" | "ACCEPTED" | "FAILED" | "EXPIRED" | null;

}):

  | "ACTIVE"

  | "DISABLED"

  | "PENDING_ACTIVATION"

  | "NOT_ACTIVATED"

  | "ERROR" {

  if (options.profileAccountStatus === "DISABLED") return "DISABLED";

  if (options.profileAccountStatus === "PENDING_ACTIVATION") {

    return "PENDING_ACTIVATION";

  }

  if (options.profileAccountStatus === "ACTIVE" && options.isFullyLinked) {

    return "ACTIVE";

  }

  // Compat lecture seule : anciennes invitations PENDING non migrées

  if (options.invitationStatus === "PENDING") return "PENDING_ACTIVATION";

  if (options.invitationStatus === "FAILED" && !options.isFullyLinked) {

    return "ERROR";

  }

  if (options.isFullyLinked && options.profileAccountStatus === "ACTIVE") {

    return "ACTIVE";

  }

  if (options.invitationStatus === "FAILED") return "ERROR";

  return "NOT_ACTIVATED";

}



/** Idempotence : désactiver un compte déjà DISABLED ne change rien. */

export function shouldApplyDisable(

  current: ProfileAccountStatus | null | undefined,

): boolean {

  return current !== "DISABLED";

}



/** Idempotence : réactiver un compte déjà ACTIVE ne change rien. */

export function shouldApplyEnable(

  current: ProfileAccountStatus | null | undefined,

): boolean {

  return current === "DISABLED";

}

