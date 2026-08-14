import "server-only";

import {
  AUTH_BAN_DURATION_DISABLED,
  AUTH_BAN_DURATION_NONE,
  shouldApplyDisable,
  shouldApplyEnable,
  type ProfileAccountStatus,
} from "@/lib/admin/account-access-constants";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AccountAccessResult {
  ok: boolean;
  studentId: string;
  profileId: string | null;
  accountStatus: ProfileAccountStatus;
  alreadyInState?: boolean;
  error?: string;
}

async function resolveStudentProfile(studentId: string): Promise<{
  studentId: string;
  profileId: string;
  accountStatus: ProfileAccountStatus;
} | null> {
  const admin = createAdminClient();
  const { data: student, error } = await admin
    .from("students")
    .select("id, profile_id, profiles(account_status)")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !student) return null;

  const profileRaw = student.profiles as
    | { account_status: string | null }
    | { account_status: string | null }[]
    | null;
  const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
  const raw = profile?.account_status;
  const status: ProfileAccountStatus =
    raw === "DISABLED"
      ? "DISABLED"
      : raw === "PENDING_ACTIVATION"
        ? "PENDING_ACTIVATION"
        : "ACTIVE";

  return {
    studentId: student.id,
    profileId: student.profile_id,
    accountStatus: status,
  };
}

export async function disableStudentAccess(
  studentId: string,
): Promise<AccountAccessResult> {
  const resolved = await resolveStudentProfile(studentId);
  if (!resolved) {
    return {
      ok: false,
      studentId,
      profileId: null,
      accountStatus: "ACTIVE",
      error: "Étudiant introuvable.",
    };
  }

  if (!shouldApplyDisable(resolved.accountStatus)) {
    return {
      ok: true,
      studentId: resolved.studentId,
      profileId: resolved.profileId,
      accountStatus: "DISABLED",
      alreadyInState: true,
    };
  }

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      account_status: "DISABLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolved.profileId);

  if (profileError) {
    return {
      ok: false,
      studentId: resolved.studentId,
      profileId: resolved.profileId,
      accountStatus: resolved.accountStatus,
      error: profileError.message,
    };
  }

  const { error: banError } = await admin.auth.admin.updateUserById(
    resolved.profileId,
    { ban_duration: AUTH_BAN_DURATION_DISABLED },
  );

  if (banError) {
    return {
      ok: false,
      studentId: resolved.studentId,
      profileId: resolved.profileId,
      accountStatus: "DISABLED",
      error: `Profil désactivé mais ban Auth échoué: ${banError.message}`,
    };
  }

  await recordAccessAudit({
    eventType: "account_disabled",
    studentId: resolved.studentId,
    authUserId: resolved.profileId,
  });

  return {
    ok: true,
    studentId: resolved.studentId,
    profileId: resolved.profileId,
    accountStatus: "DISABLED",
  };
}

export async function enableStudentAccess(
  studentId: string,
): Promise<AccountAccessResult> {
  const resolved = await resolveStudentProfile(studentId);
  if (!resolved) {
    return {
      ok: false,
      studentId,
      profileId: null,
      accountStatus: "ACTIVE",
      error: "Étudiant introuvable.",
    };
  }

  if (!shouldApplyEnable(resolved.accountStatus)) {
    return {
      ok: true,
      studentId: resolved.studentId,
      profileId: resolved.profileId,
      accountStatus: "ACTIVE",
      alreadyInState: true,
    };
  }

  const admin = createAdminClient();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      account_status: "ACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", resolved.profileId);

  if (profileError) {
    return {
      ok: false,
      studentId: resolved.studentId,
      profileId: resolved.profileId,
      accountStatus: "DISABLED",
      error: profileError.message,
    };
  }

  const { error: unbanError } = await admin.auth.admin.updateUserById(
    resolved.profileId,
    { ban_duration: AUTH_BAN_DURATION_NONE },
  );

  if (unbanError) {
    return {
      ok: false,
      studentId: resolved.studentId,
      profileId: resolved.profileId,
      accountStatus: "ACTIVE",
      error: `Profil réactivé mais unban Auth échoué: ${unbanError.message}`,
    };
  }

  await recordAccessAudit({
    eventType: "account_reactivated",
    studentId: resolved.studentId,
    authUserId: resolved.profileId,
  });

  return {
    ok: true,
    studentId: resolved.studentId,
    profileId: resolved.profileId,
    accountStatus: "ACTIVE",
  };
}
