import "server-only";

import type { User } from "@supabase/supabase-js";
import { findAuthUserByEmail } from "@/lib/admin/auth-lookup";
import {
  certificationFromTags,
  derivePredictionStatus,
  isFullyLinkedAccount,
  normalizeEmail,
} from "@/lib/admin/status";
import type {
  KoPredictAccountStatus,
  PredictionStatus,
} from "@/lib/admin/types";
import { AUTH_EMAIL_CONFIRM_ADMIN_ACTIVATION_NOTE } from "@/lib/auth/activation-constants";
import { issueActivationCode } from "@/lib/auth/activation-codes";
import { getLearnWorldsUserById } from "@/lib/learnworlds/users";
import { mapLearnWorldsUserToStudentFields } from "@/lib/learnworlds/mappers";
import { syncLearnWorldsLearner } from "@/lib/learnworlds/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActivateLearnerResult {
  ok: boolean;
  accountStatus: KoPredictAccountStatus;
  predictionStatus: PredictionStatus;
  studentId: string | null;
  authUserId: string | null;
  invitationId: string | null;
  alreadyExisted?: boolean;
  /** Présent une seule fois à la génération — ne jamais logger. */
  activationCode?: string;
  activationExpiresAt?: string;
  error?: string;
  predictionIssues?: string[];
}

async function findStudentForLwUser(
  learnworldsUserId: string,
  email: string | null,
) {
  const admin = createAdminClient();

  const { data: byLw } = await admin
    .from("students")
    .select("id, profile_id, learnworlds_user_id")
    .eq("learnworlds_user_id", learnworldsUserId)
    .maybeSingle();

  if (byLw) return byLw;

  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", emailNorm)
    .maybeSingle();

  if (!profile) return null;

  const { data: byProfile } = await admin
    .from("students")
    .select("id, profile_id, learnworlds_user_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return byProfile;
}

async function ensureProfileAndStudent(options: {
  authUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  learnworldsUserId: string;
  targetExamDate: string | null;
  certification: string;
  accountStatus: "PENDING_ACTIVATION" | "ACTIVE";
}): Promise<string> {
  const admin = createAdminClient();

  await admin.from("profiles").upsert(
    {
      id: options.authUserId,
      email: options.email,
      first_name: options.firstName,
      last_name: options.lastName,
      role: "student",
      account_status: options.accountStatus,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  await admin
    .from("profiles")
    .update({
      email: options.email,
      first_name: options.firstName,
      last_name: options.lastName,
      role: "student",
      account_status: options.accountStatus,
    })
    .eq("id", options.authUserId)
    .neq("account_status", "DISABLED");

  const existing = await findStudentForLwUser(
    options.learnworldsUserId,
    options.email,
  );

  if (existing) {
    const { error } = await admin
      .from("students")
      .update({
        learnworlds_user_id: options.learnworldsUserId,
        profile_id: options.authUserId,
        certification: options.certification,
        target_exam_date: options.targetExamDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Student update: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await admin
    .from("students")
    .insert({
      profile_id: options.authUserId,
      learnworlds_user_id: options.learnworldsUserId,
      certification: options.certification,
      target_exam_date: options.targetExamDate,
      timezone: "Europe/Paris",
    })
    .select("id")
    .single();

  if (error || !data) {
    const again = await findStudentForLwUser(
      options.learnworldsUserId,
      options.email,
    );
    if (again) return again.id;
    throw new Error(`Student insert: ${error?.message ?? "inconnu"}`);
  }

  return data.id;
}

/**
 * Crée un user Auth sans invitation email.
 * email_confirm: true — voir AUTH_EMAIL_CONFIRM_ADMIN_ACTIVATION_NOTE.
 */
async function ensureAuthUser(options: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): Promise<{ user: User; created: boolean }> {
  const existing = await findAuthUserByEmail(options.email);
  if (existing) {
    return { user: existing, created: false };
  }

  // AUTH_EMAIL_CONFIRM_ADMIN_ACTIVATION_NOTE
  void AUTH_EMAIL_CONFIRM_ADMIN_ACTIVATION_NOTE;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: options.email,
    email_confirm: true,
    user_metadata: {
      first_name: options.firstName,
      last_name: options.lastName,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Échec createUser Auth.");
  }
  return { user: data.user, created: true };
}

export async function activateLearnWorldsLearner(
  learnworldsUserId: string,
  options?: { actorId?: string | null },
): Promise<ActivateLearnerResult> {
  const admin = createAdminClient();

  try {
    const lwUser = await getLearnWorldsUserById(learnworldsUserId);
    const mapped = mapLearnWorldsUserToStudentFields(lwUser);
    const email = normalizeEmail(mapped.email);

    if (!email) {
      return {
        ok: false,
        accountStatus: "ERROR",
        predictionStatus: "NONE",
        studentId: null,
        authUserId: null,
        invitationId: null,
        error: "Utilisateur LearnWorlds sans email.",
      };
    }

    const certification = certificationFromTags(lwUser.tags);
    const { user: authUser, created } = await ensureAuthUser({
      email,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
    });

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("account_status")
      .eq("id", authUser.id)
      .maybeSingle();

    if (existingProfile?.account_status === "DISABLED") {
      return {
        ok: false,
        accountStatus: "DISABLED",
        predictionStatus: "NONE",
        studentId: null,
        authUserId: authUser.id,
        invitationId: null,
        error:
          "Compte désactivé. Réactivez-le avant de générer un code d’activation.",
      };
    }

    const alreadyActive = existingProfile?.account_status === "ACTIVE";

    const studentId = await ensureProfileAndStudent({
      authUserId: authUser.id,
      email,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      learnworldsUserId,
      targetExamDate: mapped.targetExamDate,
      certification,
      accountStatus: alreadyActive ? "ACTIVE" : "PENDING_ACTIVATION",
    });

    let predictionStatus: PredictionStatus = "NONE";
    let predictionIssues: string[] | undefined;
    let syncError: string | null = null;

    try {
      const sync = await syncLearnWorldsLearner(
        {
          learnworldsUserIdOrEmail: learnworldsUserId,
          certificationFallback: certification,
        },
        admin,
      );
      predictionStatus = derivePredictionStatus(sync.prediction);
      predictionIssues = sync.prediction.issues;
    } catch (error) {
      syncError =
        error instanceof Error ? error.message : "Échec synchronisation.";
      predictionStatus = "ERROR";
    }

    const linked = isFullyLinkedAccount({
      authUserId: authUser.id,
      profileId: authUser.id,
      studentId,
      learnworldsUserIdOnStudent: learnworldsUserId,
      expectedLearnworldsUserId: learnworldsUserId,
    });

    if (alreadyActive) {
      return {
        ok: true,
        accountStatus: "ACTIVE",
        predictionStatus: syncError ? "ERROR" : predictionStatus,
        studentId,
        authUserId: authUser.id,
        invitationId: null,
        alreadyExisted: !created,
        predictionIssues,
        error: syncError ?? undefined,
      };
    }

    const issued = await issueActivationCode({
      studentId,
      authUserId: authUser.id,
      email,
      createdBy: options?.actorId ?? null,
      auditEvent: "activation_created",
    });

    return {
      ok: true,
      accountStatus: linked ? "PENDING_ACTIVATION" : "ERROR",
      predictionStatus: syncError ? "ERROR" : predictionStatus,
      studentId,
      authUserId: authUser.id,
      invitationId: null,
      alreadyExisted: !created,
      activationCode: issued.codePlaintext,
      activationExpiresAt: issued.expiresAt,
      predictionIssues,
      error: syncError ?? undefined,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Échec d'activation.";
    return {
      ok: false,
      accountStatus: "ERROR",
      predictionStatus: "NONE",
      studentId: null,
      authUserId: null,
      invitationId: null,
      error: message,
    };
  }
}

export async function regenerateActivationCodeForStudent(
  studentId: string,
  options?: { actorId?: string | null },
): Promise<{
  ok: boolean;
  activationCode?: string;
  activationExpiresAt?: string;
  error?: string;
  fullName?: string;
  email?: string;
}> {
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("students")
    .select(
      "id, profile_id, profiles(id, email, first_name, last_name, account_status)",
    )
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return { ok: false, error: "Apprenant introuvable." };
  }

  const profile = student.profiles as
    | {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        account_status: string | null;
      }
    | null
    | {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        account_status: string | null;
      }[];

  const p = Array.isArray(profile) ? profile[0] : profile;
  if (!p?.email) {
    return { ok: false, error: "Profil sans email." };
  }
  if (p.account_status !== "PENDING_ACTIVATION") {
    return {
      ok: false,
      error: "Régénération possible uniquement en PENDING_ACTIVATION.",
    };
  }

  const email = normalizeEmail(p.email);
  if (!email) return { ok: false, error: "Email invalide." };

  const issued = await issueActivationCode({
    studentId: student.id,
    authUserId: p.id,
    email,
    createdBy: options?.actorId ?? null,
    auditEvent: "activation_code_regenerated",
  });

  const fullName =
    [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || email;

  return {
    ok: true,
    activationCode: issued.codePlaintext,
    activationExpiresAt: issued.expiresAt,
    fullName,
    email,
  };
}
