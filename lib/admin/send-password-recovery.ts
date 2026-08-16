import "server-only";

import { getPasswordRecoveryRedirectUrl } from "@/lib/admin/auth-lookup";
import { normalizeEmail } from "@/lib/admin/status";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendPasswordRecoveryResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_status: string | null;
};

function unwrapProfile(
  raw:
    | ProfileRow
    | ProfileRow[]
    | null
    | undefined,
): ProfileRow | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/**
 * Envoie un email Supabase Password Recovery pour un apprenant ACTIVE.
 * Ne touche pas account_status, role, students, ni le mot de passe.
 */
export async function sendStudentPasswordRecovery(
  studentId: string,
  options?: { actorId?: string | null },
): Promise<SendPasswordRecoveryResult> {
  const admin = createAdminClient();

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, profile_id, profiles(id, email, role, account_status)")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return { ok: false, error: "Apprenant introuvable." };
  }

  const profile = unwrapProfile(
    student.profiles as ProfileRow | ProfileRow[] | null,
  );
  if (!profile) {
    return { ok: false, error: "Profil introuvable." };
  }

  if (profile.role !== "student") {
    return { ok: false, error: "Réservé aux comptes apprenant." };
  }

  if (profile.account_status === "PENDING_ACTIVATION") {
    return {
      ok: false,
      error: "Compte en attente : utilisez Régénérer le code d’accès.",
    };
  }

  if (profile.account_status === "DISABLED") {
    return { ok: false, error: "Réactivez d’abord le compte." };
  }

  if (profile.account_status !== "ACTIVE") {
    return { ok: false, error: "Récupération réservée aux comptes ACTIVE." };
  }

  const email = normalizeEmail(profile.email);
  if (!email) {
    return { ok: false, error: "Profil sans email." };
  }

  const redirectTo = getPasswordRecoveryRedirectUrl();
  const { error: recoveryError } = await admin.auth.resetPasswordForEmail(
    email,
    { redirectTo },
  );

  if (recoveryError) {
    console.error(
      "[password-recovery] envoi échoué:",
      recoveryError.message,
    );
    return {
      ok: false,
      error: "Envoi du lien de réinitialisation impossible.",
    };
  }

  await recordAccessAudit({
    eventType: "PASSWORD_RECOVERY_SENT",
    studentId: student.id,
    authUserId: profile.id,
    actorId: options?.actorId ?? null,
    meta: {
      student_id: student.id,
      target_profile_id: profile.id,
    },
  });

  return { ok: true, email };
}
