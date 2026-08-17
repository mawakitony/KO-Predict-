import "server-only";

import { normalizeEmail } from "@/lib/admin/status";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import {
  activationCodesMatch,
  generateActivationCodePlaintext,
  hashActivationCode,
} from "@/lib/auth/activation-code-crypto";
import {
  PASSWORD_RESET_CLAIM_TIMEOUT_MINUTES,
  PASSWORD_RESET_CODE_LOCK_MINUTES,
  PASSWORD_RESET_CODE_MAX_ATTEMPTS,
  PASSWORD_RESET_CODE_TTL_MINUTES,
} from "@/lib/auth/password-reset-constants";
import { createAdminClient } from "@/lib/supabase/admin";

export type PasswordResetCodeStatus =
  | "PENDING"
  | "PROCESSING"
  | "USED"
  | "EXPIRED"
  | "REVOKED";

export interface IssuedPasswordResetCode {
  codePlaintext: string;
  expiresAt: string;
  passwordResetCodeId: string;
}

export type IssuePasswordResetResult =
  | { ok: true; issued: IssuedPasswordResetCode; email: string }
  | { ok: false; error: string };

export type VerifyPasswordResetResult =
  | {
      ok: true;
      passwordResetCodeId: string;
      authUserId: string;
      studentId: string;
      email: string;
    }
  | { ok: false; reason: "generic" | "expired" };

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_status: string | null;
};

function unwrapProfile(
  raw: ProfileRow | ProfileRow[] | null | undefined,
): ProfileRow | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/** True si locked_until est dans le futur. */
export function isPasswordResetCodeLocked(
  lockedUntil: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > nowMs;
}

/** True si un claim PROCESSING est abandonné (claimed_at + timeout). */
export function isPasswordResetClaimExpired(
  claimedAt: string | null | undefined,
  nowMs: number = Date.now(),
  timeoutMinutes: number = PASSWORD_RESET_CLAIM_TIMEOUT_MINUTES,
): boolean {
  if (!claimedAt) return true;
  return (
    new Date(claimedAt).getTime() + timeoutMinutes * 60_000 <= nowMs
  );
}

/** Révoque les codes actifs (PENDING + PROCESSING) d’un apprenant. */
export async function revokePendingPasswordResetCodes(
  studentId: string,
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("password_reset_codes")
    .update({
      status: "REVOKED",
      claimed_at: null,
      updated_at: now,
    })
    .eq("student_id", studentId)
    .in("status", ["PENDING", "PROCESSING"]);
}

/**
 * Incrémente attempt_count ; lock après MAX essais.
 * Ne révèle rien au caller (effet serveur uniquement).
 */
export async function incrementResetAttempt(options: {
  codeId: string;
  attemptCount: number;
}): Promise<void> {
  const admin = createAdminClient();
  const now = Date.now();
  const nextAttempts = (options.attemptCount ?? 0) + 1;
  const patch: Record<string, unknown> = {
    attempt_count: nextAttempts,
    updated_at: new Date().toISOString(),
  };
  if (nextAttempts >= PASSWORD_RESET_CODE_MAX_ATTEMPTS) {
    patch.locked_until = new Date(
      now + PASSWORD_RESET_CODE_LOCK_MINUTES * 60_000,
    ).toISOString();
    patch.attempt_count = 0;
  }
  await admin
    .from("password_reset_codes")
    .update(patch)
    .eq("id", options.codeId);
}

/**
 * Émet un code reset pour un étudiant ACTIVE.
 * Plaintext retourné une seule fois — ne jamais logger.
 */
export async function issuePasswordResetCode(options: {
  studentId: string;
  createdBy?: string | null;
}): Promise<IssuePasswordResetResult> {
  const admin = createAdminClient();

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, profile_id, profiles(id, email, role, account_status)")
    .eq("id", options.studentId)
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
    return { ok: false, error: "Réinitialisation réservée aux comptes ACTIVE." };
  }

  const email = normalizeEmail(profile.email);
  if (!email) {
    return { ok: false, error: "Profil sans email." };
  }

  await revokePendingPasswordResetCodes(student.id);

  const plaintext = generateActivationCodePlaintext();
  const codeHash = hashActivationCode(plaintext);
  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("password_reset_codes")
    .insert({
      student_id: student.id,
      auth_user_id: profile.id,
      email,
      code_hash: codeHash,
      status: "PENDING",
      expires_at: expiresAt,
      attempt_count: 0,
      locked_until: null,
      created_by: options.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: `Password reset code insert: ${error?.message ?? "inconnu"}`,
    };
  }

  await recordAccessAudit({
    eventType: "password_reset_code_issued",
    studentId: student.id,
    authUserId: profile.id,
    actorId: options.createdBy ?? null,
    meta: {
      student_id: student.id,
      target_profile_id: profile.id,
      expires_at: expiresAt,
    },
  });

  return {
    ok: true,
    email,
    issued: {
      codePlaintext: plaintext,
      expiresAt,
      passwordResetCodeId: data.id,
    },
  };
}

/**
 * Vérifie email + code. Ne passe PAS le code en USED.
 * Messages d’échec non discriminants (sauf expiration).
 */
export async function verifyPasswordResetCode(options: {
  email: string;
  code: string;
}): Promise<VerifyPasswordResetResult> {
  const email = normalizeEmail(options.email);
  if (!email || !options.code?.trim()) {
    return { ok: false, reason: "generic" };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, account_status, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "student" ||
    profile.account_status !== "ACTIVE"
  ) {
    return { ok: false, reason: "generic" };
  }

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!student) {
    return { ok: false, reason: "generic" };
  }

  const { data: codeRow } = await admin
    .from("password_reset_codes")
    .select(
      "id, auth_user_id, code_hash, status, expires_at, attempt_count, locked_until, email, claimed_at",
    )
    .eq("student_id", student.id)
    .in("status", ["PENDING", "PROCESSING"])
    .maybeSingle();

  if (!codeRow) {
    return { ok: false, reason: "generic" };
  }

  const now = Date.now();
  if (
    codeRow.status === "PROCESSING" &&
    !isPasswordResetClaimExpired(codeRow.claimed_at, now)
  ) {
    return { ok: false, reason: "generic" };
  }

  if (isPasswordResetCodeLocked(codeRow.locked_until, now)) {
    return { ok: false, reason: "generic" };
  }

  if (new Date(codeRow.expires_at).getTime() <= now) {
    await admin
      .from("password_reset_codes")
      .update({
        status: "EXPIRED",
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", codeRow.id)
      .in("status", ["PENDING", "PROCESSING"]);
    await recordAccessAudit({
      eventType: "password_reset_code_expired",
      studentId: student.id,
      authUserId: profile.id,
      meta: { password_reset_code_id: codeRow.id },
    });
    return { ok: false, reason: "expired" };
  }

  const storedEmail = normalizeEmail(codeRow.email);
  if (storedEmail && storedEmail !== email) {
    await incrementResetAttempt({
      codeId: codeRow.id,
      attemptCount: codeRow.attempt_count ?? 0,
    });
    return { ok: false, reason: "generic" };
  }

  const match = activationCodesMatch(options.code, codeRow.code_hash);
  if (!match) {
    await incrementResetAttempt({
      codeId: codeRow.id,
      attemptCount: codeRow.attempt_count ?? 0,
    });
    return { ok: false, reason: "generic" };
  }

  const authUserId = codeRow.auth_user_id ?? profile.id;
  if (authUserId !== profile.id) {
    return { ok: false, reason: "generic" };
  }

  return {
    ok: true,
    passwordResetCodeId: codeRow.id,
    authUserId,
    studentId: student.id,
    email,
  };
}

/**
 * Claim exclusif : PENDING → PROCESSING (claimed_at).
 * Reclaim : PROCESSING abandonné (claimed_at expiré) → PENDING puis PROCESSING.
 * @returns true si ce caller détient le claim.
 */
export async function claimPasswordResetCode(options: {
  passwordResetCodeId: string;
  studentId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  async function tryPendingToProcessing(): Promise<boolean> {
    const claimedAt = new Date().toISOString();
    const { data, error } = await admin
      .from("password_reset_codes")
      .update({
        status: "PROCESSING",
        claimed_at: claimedAt,
        updated_at: claimedAt,
      })
      .eq("id", options.passwordResetCodeId)
      .eq("student_id", options.studentId)
      .eq("status", "PENDING")
      .select("id");

    if (error) return false;
    return Array.isArray(data) ? data.length > 0 : Boolean(data);
  }

  if (await tryPendingToProcessing()) {
    return true;
  }

  // Libère un claim abandonné (conditionnel) — un seul gagnant en race.
  const claimCutoff = new Date(
    Date.now() - PASSWORD_RESET_CLAIM_TIMEOUT_MINUTES * 60_000,
  ).toISOString();
  const releaseAt = new Date().toISOString();
  const { data: released, error: releaseError } = await admin
    .from("password_reset_codes")
    .update({
      status: "PENDING",
      claimed_at: null,
      updated_at: releaseAt,
    })
    .eq("id", options.passwordResetCodeId)
    .eq("student_id", options.studentId)
    .eq("status", "PROCESSING")
    .lt("claimed_at", claimCutoff)
    .select("id");

  if (releaseError) return false;
  const didRelease = Array.isArray(released)
    ? released.length > 0
    : Boolean(released);
  if (!didRelease) {
    return false;
  }

  return tryPendingToProcessing();
}

/**
 * Auth a échoué : PROCESSING → PENDING, claimed_at null.
 */
export async function revertPasswordResetCodeClaim(options: {
  passwordResetCodeId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("password_reset_codes")
    .update({
      status: "PENDING",
      claimed_at: null,
      updated_at: now,
    })
    .eq("id", options.passwordResetCodeId)
    .eq("status", "PROCESSING");
}

/**
 * Auth OK : PROCESSING → USED + used_at (conditionnel) + audit.
 * @returns true si une ligne a été finalisée.
 */
export async function finalizePasswordResetCodeUsed(options: {
  passwordResetCodeId: string;
  studentId: string;
  authUserId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("password_reset_codes")
    .update({
      status: "USED",
      used_at: now,
      claimed_at: null,
      updated_at: now,
    })
    .eq("id", options.passwordResetCodeId)
    .eq("status", "PROCESSING")
    .select("id");

  if (error) {
    return false;
  }

  const updated = Array.isArray(data) ? data.length > 0 : Boolean(data);
  if (!updated) {
    return false;
  }

  await admin
    .from("password_reset_codes")
    .update({ status: "REVOKED", claimed_at: null, updated_at: now })
    .eq("student_id", options.studentId)
    .in("status", ["PENDING", "PROCESSING"])
    .neq("id", options.passwordResetCodeId);

  await recordAccessAudit({
    eventType: "password_reset_completed",
    studentId: options.studentId,
    authUserId: options.authUserId,
    meta: {
      student_id: options.studentId,
      target_profile_id: options.authUserId,
      password_reset_code_id: options.passwordResetCodeId,
    },
  });

  return true;
}

/**
 * @deprecated Préférer claim + Auth + finalizePasswordResetCodeUsed.
 * Conservé pour compat tests : claim PROCESSING puis finalize USED.
 */
export async function markPasswordResetCodeUsed(options: {
  passwordResetCodeId: string;
  studentId: string;
  authUserId: string;
}): Promise<boolean> {
  const claimed = await claimPasswordResetCode({
    passwordResetCodeId: options.passwordResetCodeId,
    studentId: options.studentId,
  });
  if (!claimed) {
    return false;
  }
  return finalizePasswordResetCodeUsed(options);
}
