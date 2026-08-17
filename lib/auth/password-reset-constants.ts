/**
 * Codes de réinitialisation d’accès (étudiants ACTIVE).
 * Distinct du first-access (activation_codes, TTL 72 h).
 */

/** TTL d’un code PENDING (minutes). */
export const PASSWORD_RESET_CODE_TTL_MINUTES = 60;

/** Essais incorrects avant verrouillage. */
export const PASSWORD_RESET_CODE_MAX_ATTEMPTS = 8;

/** Durée du verrouillage (minutes). */
export const PASSWORD_RESET_CODE_LOCK_MINUTES = 15;

/** Durée du cookie de finalisation reset-access (minutes). */
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 15;

/** Timeout d’un claim PROCESSING avant reclaim possible (minutes). */
export const PASSWORD_RESET_CLAIM_TIMEOUT_MINUTES = 3;

export const PASSWORD_RESET_CODE_GENERIC_ERROR =
  "Code incorrect ou expiré.";

export const PASSWORD_RESET_CODE_EXPIRED_MESSAGE =
  "Ce code a expiré. Demandez un nouveau code à WOLOYEM.";

export const PASSWORD_RESET_SESSION_EXPIRED =
  "Session de réinitialisation expirée. Recommencez avec votre email et le code.";

export const PASSWORD_RESET_CODE_ALREADY_USED =
  "Ce code a déjà été utilisé. Demandez un nouveau code à WOLOYEM.";

export const PASSWORD_RESET_AUTH_FAILED =
  "Impossible de mettre à jour le mot de passe. Réessayez.";

export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.";
