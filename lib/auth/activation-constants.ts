/**
 * Codes d’activation KO Predict™ (V1 — sans email d’invitation).
 *
 * ACTIVATION_CODE_TTL_HOURS : durée de validité d’un code PENDING.
 * Brute force : 8 essais → verrouillage 15 minutes.
 */

/** TTL des codes d’activation (heures). */
export const ACTIVATION_CODE_TTL_HOURS = 72;

/** Nombre max d’essais incorrects avant verrouillage. */
export const ACTIVATION_CODE_MAX_ATTEMPTS = 8;

/** Durée du verrouillage après trop d’essais (minutes). */
export const ACTIVATION_CODE_LOCK_MINUTES = 15;

/** Durée du cookie de finalisation first-access (minutes). */
export const FIRST_ACCESS_TOKEN_TTL_MINUTES = 15;

export const ACTIVATION_CODE_EXPIRED_MESSAGE =
  "Ce code d’activation a expiré. Contactez WOLOYEM pour obtenir un nouveau code.";

export const ACTIVATION_CODE_GENERIC_ERROR =
  "Email ou code d’activation incorrect.";

export const PENDING_ACTIVATION_LOGIN_MESSAGE =
  "Votre compte n’est pas encore finalisé.";

/**
 * Email Auth confirmé à la création admin :
 * l’utilisateur provient de LearnWorlds et est activé par un admin WOLOYEM
 * (email_confirm: true — pas de flux Invite Supabase).
 */
export const AUTH_EMAIL_CONFIRM_ADMIN_ACTIVATION_NOTE =
  "email_confirm=true : email considéré validé (source LearnWorlds + activation admin WOLOYEM).";
