import "server-only";

import { normalizeEmail } from "@/lib/admin/status";
import {
  PASSWORD_RESET_AUTH_FAILED,
  PASSWORD_RESET_CODE_ALREADY_USED,
  PASSWORD_RESET_SESSION_EXPIRED,
} from "@/lib/auth/password-reset-constants";
import {
  claimPasswordResetCode,
  finalizePasswordResetCodeUsed,
  revertPasswordResetCodeClaim,
} from "@/lib/auth/password-reset-codes";
import { verifyPasswordResetToken } from "@/lib/auth/password-reset-token";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompletePasswordResetResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

type CodeRow = {
  id: string;
  student_id: string;
  auth_user_id: string | null;
  email: string | null;
  status: string;
  expires_at: string;
  claimed_at: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  role: string | null;
  account_status: string | null;
};

/**
 * Finalise le reset après cookie verify.
 *
 * Ordre sûr :
 * 1) revalider cookie + DB
 * 2) claim exclusif PENDING → PROCESSING (reclaim si PROCESSING expiré)
 * 3) updateUserById(password)
 * 4) Auth KO → PROCESSING → PENDING
 * 5) Auth OK → PROCESSING → USED + audit
 *
 * Limitation sessions : admin.signOut(jwt) exige un JWT — pas d’invalidation
 * globale par userId. Pas de workaround. Pas d’auto-login.
 */
export async function completePasswordResetAccess(options: {
  password: string;
  confirmPassword: string;
  token: string | undefined | null;
}): Promise<CompletePasswordResetResult> {
  if (options.password.length < 8 || options.password.length > 128) {
    return {
      ok: false,
      status: 400,
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  if (options.password !== options.confirmPassword) {
    return {
      ok: false,
      status: 400,
      error: "Les mots de passe ne correspondent pas.",
    };
  }

  const payload = verifyPasswordResetToken(options.token);
  if (!payload) {
    return {
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  const admin = createAdminClient();

  const { data: codeRow } = await admin
    .from("password_reset_codes")
    .select(
      "id, student_id, auth_user_id, email, status, expires_at, claimed_at",
    )
    .eq("id", payload.passwordResetCodeId)
    .maybeSingle();

  const code = codeRow as CodeRow | null;
  if (!code) {
    return {
      ok: false,
      status: 400,
      error: PASSWORD_RESET_CODE_ALREADY_USED,
    };
  }

  if (
    code.status === "USED" ||
    code.status === "REVOKED" ||
    code.status === "EXPIRED"
  ) {
    return {
      ok: false,
      status: 400,
      error: PASSWORD_RESET_CODE_ALREADY_USED,
    };
  }

  if (code.status !== "PENDING" && code.status !== "PROCESSING") {
    return {
      ok: false,
      status: 400,
      error: PASSWORD_RESET_CODE_ALREADY_USED,
    };
  }

  if (new Date(code.expires_at).getTime() <= Date.now()) {
    await admin
      .from("password_reset_codes")
      .update({
        status: "EXPIRED",
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", code.id)
      .in("status", ["PENDING", "PROCESSING"]);
    return {
      ok: false,
      status: 400,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  if (code.student_id !== payload.studentId) {
    return {
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  const authUserId = code.auth_user_id ?? payload.authUserId;
  if (authUserId !== payload.authUserId) {
    return {
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  const codeEmail = normalizeEmail(code.email);
  if (codeEmail && codeEmail !== payload.email) {
    return {
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  const { data: student } = await admin
    .from("students")
    .select("id, profile_id")
    .eq("id", payload.studentId)
    .maybeSingle();

  if (!student || student.profile_id !== payload.authUserId) {
    return {
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("id, email, role, account_status")
    .eq("id", payload.authUserId)
    .maybeSingle();

  const profile = profileRaw as ProfileRow | null;
  if (
    !profile ||
    profile.role !== "student" ||
    profile.account_status !== "ACTIVE"
  ) {
    return {
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  const profileEmail = normalizeEmail(profile.email);
  if (profileEmail && profileEmail !== payload.email) {
    return {
      ok: false,
      status: 401,
      error: PASSWORD_RESET_SESSION_EXPIRED,
    };
  }

  const claimed = await claimPasswordResetCode({
    passwordResetCodeId: code.id,
    studentId: payload.studentId,
  });

  if (!claimed) {
    return {
      ok: false,
      status: 400,
      error: PASSWORD_RESET_CODE_ALREADY_USED,
    };
  }

  const { error: pwdError } = await admin.auth.admin.updateUserById(
    payload.authUserId,
    { password: options.password },
  );

  if (pwdError) {
    await revertPasswordResetCodeClaim({
      passwordResetCodeId: code.id,
    });
    return {
      ok: false,
      status: 500,
      error: PASSWORD_RESET_AUTH_FAILED,
    };
  }

  const finalized = await finalizePasswordResetCodeUsed({
    passwordResetCodeId: code.id,
    studentId: payload.studentId,
    authUserId: payload.authUserId,
  });

  if (!finalized) {
    // Password déjà changé ; code devrait être USED. Ne pas revert.
    return {
      ok: false,
      status: 500,
      error: PASSWORD_RESET_AUTH_FAILED,
    };
  }

  return { ok: true };
}
