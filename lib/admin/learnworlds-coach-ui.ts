/**
 * Messages UI — flux « Ajouter un coach LearnWorlds ».
 * Logique pure testable, sans I/O.
 */

export type LwCoachLookupEligibilityStatus =
  | "ELIGIBLE_INSTRUCTOR"
  | "ELIGIBLE_ADMIN_OVERRIDE"
  | "NOT_ELIGIBLE"
  | "NOT_FOUND";

export function mapLwCoachEligibilityUiMessage(
  status: LwCoachLookupEligibilityStatus,
): string {
  switch (status) {
    case "ELIGIBLE_INSTRUCTOR":
      return "Instructor LearnWorlds reconnu";
    case "ELIGIBLE_ADMIN_OVERRIDE":
      return "Ce compte est administrateur LearnWorlds. La création automatique comme coach n’est pas autorisée en V1.";
    case "NOT_ELIGIBLE":
      return "Ce compte LearnWorlds n’est pas éligible comme coach.";
    case "NOT_FOUND":
      return "Aucun compte LearnWorlds trouvé avec cette adresse.";
    default:
      return "Vérification LearnWorlds impossible.";
  }
}

export function mapLwCoachCreateConflictUiMessage(code: string | undefined): string {
  switch (code) {
    case "existing_student":
      return "Cette adresse est déjà utilisée par un apprenant KO Predict™. Aucune modification n’a été effectuée.";
    case "existing_admin":
    case "existing_super_admin":
      return "Cette adresse correspond déjà à un compte staff avec un rôle supérieur.";
    case "existing_disabled":
      return "Ce compte KO Predict™ est désactivé. Réactivez-le manuellement avant toute action.";
    case "existing_pending":
      return "Un compte KO Predict™ est déjà en attente d’activation pour cet email. Ne pas recréer ni contourner le cycle d’accès.";
    case "existing_auth_orphan":
      return "Un compte Auth existe déjà pour cet email. Traitement manuel requis.";
    case "existing_student_row":
      return "Une fiche apprenant existe déjà pour cet email. Traitement manuel requis.";
    default:
      return "Création impossible.";
  }
}

export function mapLwCoachApiError(options: {
  status: number;
  body: { error?: string; code?: string; reasonCode?: string } | null;
}): { message: string; needsMfaChallenge: boolean } {
  const reason =
    options.body?.reasonCode ?? options.body?.code ?? null;
  if (
    options.status === 403 &&
    (reason === "MFA_AAL2_REQUIRED" ||
      options.body?.error?.includes("MFA_AAL2") ||
      options.body?.error?.toLowerCase().includes("aal2"))
  ) {
    return {
      message:
        "Vérification en deux étapes requise. Validez votre code authenticator puis réessayez.",
      needsMfaChallenge: true,
    };
  }
  if (options.body?.code) {
    const conflict = mapLwCoachCreateConflictUiMessage(options.body.code);
    if (conflict !== "Création impossible.") {
      return { message: conflict, needsMfaChallenge: false };
    }
  }
  return {
    message: options.body?.error ?? "Action impossible.",
    needsMfaChallenge: false,
  };
}

export const LW_COACH_PASSWORD_NOTE =
  "Le coach utilisera la même adresse email dans KO Predict™. Son mot de passe LearnWorlds n’est pas réutilisé.";

export const LW_COACH_CREATE_SUCCESS_NOTE =
  "Coach KO Predict™ créé. Un code de première activation a été généré selon le flux équipe existant.";
