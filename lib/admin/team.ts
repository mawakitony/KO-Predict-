import "server-only";

import type { TeamMemberRow } from "@/lib/admin/team-types";
import {
  AUTH_BAN_DURATION_DISABLED,
  AUTH_BAN_DURATION_NONE,
  shouldApplyDisable,
  shouldApplyEnable,
  type ProfileAccountStatus,
} from "@/lib/admin/account-access-constants";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { issueTeamActivationCode } from "@/lib/auth/team-activation-codes";
import { findAuthUserByEmail } from "@/lib/admin/auth-lookup";
import { normalizeEmail } from "@/lib/admin/status";
import {
  parseUserRole,
  type TeamCreatableRole,
} from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/student";

export type { TeamMemberRow };

function isTeamRole(role: UserRole): boolean {
  return role === "coach" || role === "admin" || role === "super_admin";
}

export async function listTeamMembers(): Promise<TeamMemberRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, email, first_name, last_name, role, account_status, created_at",
    )
    .in("role", ["coach", "admin", "super_admin"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`listTeamMembers: ${error.message}`);
  }

  const rows = data ?? [];
  const enriched: TeamMemberRow[] = [];

  for (const row of rows) {
    let lastSignInAt: string | null = null;
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(row.id);
      lastSignInAt = authUser.user?.last_sign_in_at ?? null;
    } catch {
      lastSignInAt = null;
    }

    const status: ProfileAccountStatus =
      row.account_status === "DISABLED"
        ? "DISABLED"
        : row.account_status === "PENDING_ACTIVATION"
          ? "PENDING_ACTIVATION"
          : "ACTIVE";

    enriched.push({
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: parseUserRole(row.role),
      accountStatus: status,
      createdAt: row.created_at,
      lastSignInAt,
    });
  }

  return enriched;
}

export type CreateTeamMemberResult =
  | {
      ok: true;
      profileId: string;
      email: string;
      role: TeamCreatableRole;
      activationCode: string;
      expiresAt: string;
    }
  | { ok: false; error: string };

export async function createTeamMember(options: {
  firstName: string;
  lastName: string;
  email: string;
  role: TeamCreatableRole;
  actorId: string;
}): Promise<CreateTeamMemberResult> {
  const email = normalizeEmail(options.email);
  const firstName = options.firstName.trim();
  const lastName = options.lastName.trim();

  if (!email || !firstName || !lastName) {
    return { ok: false, error: "Prénom, nom et email requis." };
  }
  if (options.role !== "coach" && options.role !== "admin") {
    return { ok: false, error: "Rôle non autorisé." };
  }

  const admin = createAdminClient();

  const existing = await findAuthUserByEmail(email);
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email." };
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

  if (createError || !created.user) {
    return {
      ok: false,
      error: createError?.message ?? "Création Auth impossible.",
    };
  }

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: options.role,
      account_status: "PENDING_ACTIVATION",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    return { ok: false, error: profileError.message };
  }

  // Sécurité : si le trigger a créé student, forcer le rôle équipe.
  await admin
    .from("profiles")
    .update({
      role: options.role,
      first_name: firstName,
      last_name: lastName,
      account_status: "PENDING_ACTIVATION",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  let issued;
  try {
    issued = await issueTeamActivationCode({
      profileId: userId,
      authUserId: userId,
      email,
      createdBy: options.actorId,
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Échec génération code d’activation.",
    };
  }

  await recordAccessAudit({
    eventType: "TEAM_MEMBER_CREATED",
    authUserId: userId,
    actorId: options.actorId,
    meta: {
      role: options.role,
      email,
    },
  });

  return {
    ok: true,
    profileId: userId,
    email,
    role: options.role,
    activationCode: issued.codePlaintext,
    expiresAt: issued.expiresAt,
  };
}

export type TeamMemberAccessResult =
  | {
      ok: true;
      profileId: string;
      accountStatus: ProfileAccountStatus;
      alreadyInState?: boolean;
    }
  | { ok: false; error: string };

export async function disableTeamMember(
  profileId: string,
  actorId: string,
): Promise<TeamMemberAccessResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Membre introuvable." };

  const role = parseUserRole(profile.role);
  if (!isTeamRole(role)) {
    return { ok: false, error: "Ce compte n’est pas un membre équipe." };
  }
  if (role === "super_admin") {
    return {
      ok: false,
      error: "Impossible de désactiver un super_admin depuis cette interface.",
    };
  }
  if (profileId === actorId) {
    return { ok: false, error: "Vous ne pouvez pas vous désactiver vous-même." };
  }

  const status: ProfileAccountStatus =
    profile.account_status === "DISABLED"
      ? "DISABLED"
      : profile.account_status === "PENDING_ACTIVATION"
        ? "PENDING_ACTIVATION"
        : "ACTIVE";

  if (!shouldApplyDisable(status) && status === "DISABLED") {
    return { ok: true, profileId, accountStatus: "DISABLED", alreadyInState: true };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      account_status: "DISABLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (profileError) return { ok: false, error: profileError.message };

  const { error: banError } = await admin.auth.admin.updateUserById(profileId, {
    ban_duration: AUTH_BAN_DURATION_DISABLED,
  });
  if (banError) {
    return {
      ok: false,
      error: `Profil désactivé mais ban Auth échoué: ${banError.message}`,
    };
  }

  await recordAccessAudit({
    eventType: "TEAM_MEMBER_DISABLED",
    authUserId: profileId,
    actorId,
    meta: { role },
  });

  return { ok: true, profileId, accountStatus: "DISABLED" };
}

export async function enableTeamMember(
  profileId: string,
  actorId: string,
): Promise<TeamMemberAccessResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Membre introuvable." };

  const role = parseUserRole(profile.role);
  if (!isTeamRole(role)) {
    return { ok: false, error: "Ce compte n’est pas un membre équipe." };
  }
  if (role === "super_admin") {
    return {
      ok: false,
      error: "Impossible de modifier un super_admin depuis cette interface.",
    };
  }

  const status: ProfileAccountStatus =
    profile.account_status === "DISABLED"
      ? "DISABLED"
      : profile.account_status === "PENDING_ACTIVATION"
        ? "PENDING_ACTIVATION"
        : "ACTIVE";

  // Réactivation : revient ACTIVE seulement si déjà activé une fois.
  // Si PENDING_ACTIVATION, on garde PENDING (sauf DISABLED → ACTIVE si code déjà utilisé).
  // V1 : DISABLED → ACTIVE (même si n’avait pas fini first-access, rare).
  if (status === "PENDING_ACTIVATION") {
    return {
      ok: false,
      error:
        "Ce membre n’a pas encore finalisé sa première connexion. Régénérez un code si besoin.",
    };
  }

  if (!shouldApplyEnable(status)) {
    return { ok: true, profileId, accountStatus: "ACTIVE", alreadyInState: true };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      account_status: "ACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  if (profileError) return { ok: false, error: profileError.message };

  const { error: unbanError } = await admin.auth.admin.updateUserById(
    profileId,
    { ban_duration: AUTH_BAN_DURATION_NONE },
  );
  if (unbanError) {
    return {
      ok: false,
      error: `Profil réactivé mais unban Auth échoué: ${unbanError.message}`,
    };
  }

  await recordAccessAudit({
    eventType: "TEAM_MEMBER_REACTIVATED",
    authUserId: profileId,
    actorId,
    meta: { role },
  });

  return { ok: true, profileId, accountStatus: "ACTIVE" };
}

export type ChangeTeamRoleResult =
  | { ok: true; profileId: string; from: UserRole; to: UserRole }
  | { ok: false; error: string };

const CHANGE_ROLE_STALE_STATE_ERROR =
  "L’état du membre a changé. Actualisez la page puis réessayez.";

/**
 * Coach ↔ admin uniquement. Cible ACTIVE obligatoire pour toute mutation réelle.
 * Pas de touch students / auth password / first-access / LearnWorlds.
 */
export async function changeTeamRole(options: {
  profileId: string;
  newRole: TeamCreatableRole;
  actorId: string;
}): Promise<ChangeTeamRoleResult> {
  if (options.newRole !== "coach" && options.newRole !== "admin") {
    return { ok: false, error: "Rôle cible non autorisé." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", options.profileId)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Membre introuvable." };

  const from = parseUserRole(profile.role);
  if (from === "super_admin") {
    return {
      ok: false,
      error: "Impossible de modifier un super_admin depuis cette interface.",
    };
  }
  if (from !== "coach" && from !== "admin") {
    return { ok: false, error: "Ce compte n’est pas coach/admin." };
  }
  if (options.profileId === options.actorId) {
    return {
      ok: false,
      error: "Vous ne pouvez pas changer votre propre rôle ici.",
    };
  }

  // No-op avant garde statut : aucune écriture, aucun audit.
  if (from === options.newRole) {
    return { ok: true, profileId: options.profileId, from, to: from };
  }

  if (profile.account_status === "PENDING_ACTIVATION") {
    return {
      ok: false,
      error:
        "Finalisez d’abord la première connexion de ce membre avant de modifier son rôle.",
    };
  }
  if (profile.account_status === "DISABLED") {
    return {
      ok: false,
      error: "Réactivez d’abord ce compte avant de modifier son rôle.",
    };
  }
  if (profile.account_status !== "ACTIVE") {
    return {
      ok: false,
      error: "Seuls les comptes ACTIVE peuvent changer de rôle.",
    };
  }

  // Update conditionnel : id + rôle lu + ACTIVE — refuse si état obsolète.
  const { data: updated, error } = await admin
    .from("profiles")
    .update({
      role: options.newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.profileId)
    .eq("role", from)
    .eq("account_status", "ACTIVE")
    .select("id, role")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!updated || parseUserRole(updated.role) !== options.newRole) {
    return { ok: false, error: CHANGE_ROLE_STALE_STATE_ERROR };
  }

  await recordAccessAudit({
    eventType: "TEAM_ROLE_CHANGED",
    authUserId: options.profileId,
    actorId: options.actorId,
    meta: {
      from_role: from,
      to_role: options.newRole,
      target_profile_id: options.profileId,
    },
  });

  return {
    ok: true,
    profileId: options.profileId,
    from,
    to: options.newRole,
  };
}
