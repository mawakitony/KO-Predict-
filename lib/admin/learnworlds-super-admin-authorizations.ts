import "server-only";

import { normalizeEmail } from "@/lib/admin/status";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { parseUserRole } from "@/lib/auth/roles";
import { getLearnWorldsUserByEmail } from "@/lib/learnworlds/users";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LearnWorldsUser } from "@/types/learnworlds";

export type LearnWorldsSuperAdminAuthorizationStatus = "ACTIVE" | "REVOKED";

export type LearnWorldsSuperAdminAuthorizationRow = {
  id: string;
  email: string;
  learnworldsUserId: string | null;
  status: LearnWorldsSuperAdminAuthorizationStatus;
  createdBy: string;
  createdAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  note: string | null;
  /** Info LW uniquement — jamais une preuve de promotion. */
  learnworldsRoleLevel: string | null;
};

export type CreateLearnWorldsSuperAdminAuthorizationResult =
  | {
      ok: true;
      authorization: LearnWorldsSuperAdminAuthorizationRow;
      learnworldsRoleLevel: string | null;
    }
  | { ok: false; error: string; reasonCode?: string };

export type RevokeLearnWorldsSuperAdminAuthorizationResult =
  | {
      ok: true;
      authorization: LearnWorldsSuperAdminAuthorizationRow;
      alreadyRevoked?: boolean;
    }
  | { ok: false; error: string; reasonCode?: string };

type GetUserByEmail = (email: string) => Promise<LearnWorldsUser | null>;

function mapRow(
  row: {
    id: string;
    email: string;
    learnworlds_user_id: string | null;
    status: string;
    created_by: string;
    created_at: string;
    revoked_by: string | null;
    revoked_at: string | null;
    note: string | null;
  },
  learnworldsRoleLevel: string | null = null,
): LearnWorldsSuperAdminAuthorizationRow {
  return {
    id: row.id,
    email: row.email,
    learnworldsUserId: row.learnworlds_user_id,
    status: row.status === "REVOKED" ? "REVOKED" : "ACTIVE",
    createdBy: row.created_by,
    createdAt: row.created_at,
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at,
    note: row.note,
    learnworldsRoleLevel,
  };
}

async function assertActorSuperAdminActive(
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string; reasonCode: string }> {
  const admin = createAdminClient();
  const { data: actor } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", actorId)
    .maybeSingle();

  if (!actor || parseUserRole(actor.role) !== "super_admin") {
    return {
      ok: false,
      error: "Seul un super_admin peut gérer ces autorisations.",
      reasonCode: "ACTOR_NOT_SUPER_ADMIN",
    };
  }
  if (actor.account_status !== "ACTIVE") {
    return {
      ok: false,
      error: "Votre compte super_admin n’est pas actif.",
      reasonCode: "ACTOR_NOT_ACTIVE",
    };
  }
  return { ok: true };
}

/**
 * Crée une autorisation ACTIVE (éligibilité SA KO).
 * Ne modifie jamais profiles.role / auth.users / LearnWorlds.
 * role.level LW est informatif uniquement.
 */
export async function createLearnWorldsSuperAdminAuthorization(options: {
  email: string;
  actorId: string;
  note?: string | null;
  /** Si fourni, doit correspondre à l’id LW re-fetché. */
  expectedLearnWorldsUserId?: string | null;
  getUserByEmail?: GetUserByEmail;
}): Promise<CreateLearnWorldsSuperAdminAuthorizationResult> {
  const actorGate = await assertActorSuperAdminActive(options.actorId);
  if (!actorGate.ok) return actorGate;

  const email = normalizeEmail(options.email);
  if (!email) {
    return {
      ok: false,
      error: "Adresse email invalide.",
      reasonCode: "INVALID_EMAIL",
    };
  }

  const getUser = options.getUserByEmail ?? getLearnWorldsUserByEmail;
  let lwUser: LearnWorldsUser | null;
  try {
    lwUser = await getUser(email);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de vérifier LearnWorlds.",
      reasonCode: "LOOKUP_FAILED",
    };
  }

  if (!lwUser) {
    return {
      ok: false,
      error: "Aucun compte LearnWorlds trouvé avec cette adresse.",
      reasonCode: "LW_NOT_FOUND",
    };
  }

  const lwEmail = normalizeEmail(lwUser.email);
  if (!lwEmail || lwEmail !== email) {
    return {
      ok: false,
      error:
        "L’email LearnWorlds ne correspond pas à l’adresse demandée.",
      reasonCode: "EMAIL_MISMATCH",
    };
  }

  if (
    options.expectedLearnWorldsUserId &&
    options.expectedLearnWorldsUserId.trim() !== "" &&
    options.expectedLearnWorldsUserId !== lwUser.id
  ) {
    return {
      ok: false,
      error:
        "L’identifiant LearnWorlds ne correspond pas au compte trouvé pour cet email.",
      reasonCode: "LW_ID_MISMATCH",
    };
  }

  const existing = await getActiveAuthorizationByEmail(email);
  if (existing) {
    return {
      ok: false,
      error: "Une autorisation ACTIVE existe déjà pour cet email.",
      reasonCode: "DUPLICATE_ACTIVE",
    };
  }

  const note =
    typeof options.note === "string" && options.note.trim()
      ? options.note.trim().slice(0, 500)
      : null;

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("learnworlds_super_admin_authorizations")
    .insert({
      email,
      learnworlds_user_id: lwUser.id,
      status: "ACTIVE",
      created_by: options.actorId,
      note,
    })
    .select(
      "id, email, learnworlds_user_id, status, created_by, created_at, revoked_by, revoked_at, note",
    )
    .maybeSingle();

  if (error || !inserted) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "Une autorisation ACTIVE existe déjà pour cet email ou cet id LearnWorlds.",
        reasonCode: "DUPLICATE_ACTIVE",
      };
    }
    return {
      ok: false,
      error: error?.message ?? "Création d’autorisation impossible.",
      reasonCode: "INSERT_FAILED",
    };
  }

  const roleLevel = lwUser.role.level ?? null;

  await recordAccessAudit({
    eventType: "LEARNWORLDS_SUPER_ADMIN_AUTHORIZED",
    actorId: options.actorId,
    meta: {
      authorization_id: inserted.id,
      email,
      learnworlds_user_id: lwUser.id,
      learnworlds_role_level: roleLevel,
      // Informational only — never used as promotion proof.
    },
  });

  return {
    ok: true,
    authorization: mapRow(inserted, roleLevel),
    learnworldsRoleLevel: roleLevel,
  };
}

export async function revokeLearnWorldsSuperAdminAuthorization(options: {
  authorizationId: string;
  actorId: string;
}): Promise<RevokeLearnWorldsSuperAdminAuthorizationResult> {
  const actorGate = await assertActorSuperAdminActive(options.actorId);
  if (!actorGate.ok) return actorGate;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("learnworlds_super_admin_authorizations")
    .select(
      "id, email, learnworlds_user_id, status, created_by, created_at, revoked_by, revoked_at, note",
    )
    .eq("id", options.authorizationId)
    .maybeSingle();

  if (!row) {
    return {
      ok: false,
      error: "Autorisation introuvable.",
      reasonCode: "NOT_FOUND",
    };
  }

  if (row.status === "REVOKED") {
    return {
      ok: true,
      authorization: mapRow(row),
      alreadyRevoked: true,
    };
  }

  const revokedAt = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("learnworlds_super_admin_authorizations")
    .update({
      status: "REVOKED",
      revoked_by: options.actorId,
      revoked_at: revokedAt,
    })
    .eq("id", options.authorizationId)
    .eq("status", "ACTIVE")
    .select(
      "id, email, learnworlds_user_id, status, created_by, created_at, revoked_by, revoked_at, note",
    )
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message,
      reasonCode: "UPDATE_FAILED",
    };
  }
  if (!updated) {
    return {
      ok: false,
      error: "L’autorisation a changé. Actualisez puis réessayez.",
      reasonCode: "STALE_STATE",
    };
  }

  await recordAccessAudit({
    eventType: "LEARNWORLDS_SUPER_ADMIN_AUTHORIZATION_REVOKED",
    actorId: options.actorId,
    meta: {
      authorization_id: updated.id,
      email: updated.email,
      learnworlds_user_id: updated.learnworlds_user_id,
    },
  });

  return { ok: true, authorization: mapRow(updated) };
}

export async function getActiveAuthorizationByEmail(
  emailInput: string,
): Promise<LearnWorldsSuperAdminAuthorizationRow | null> {
  const email = normalizeEmail(emailInput);
  if (!email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("learnworlds_super_admin_authorizations")
    .select(
      "id, email, learnworlds_user_id, status, created_by, created_at, revoked_by, revoked_at, note",
    )
    .eq("email", email)
    .eq("status", "ACTIVE")
    .maybeSingle();

  return data ? mapRow(data) : null;
}

export async function getLatestRevokedAuthorizationByEmail(
  emailInput: string,
): Promise<LearnWorldsSuperAdminAuthorizationRow | null> {
  const email = normalizeEmail(emailInput);
  if (!email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("learnworlds_super_admin_authorizations")
    .select(
      "id, email, learnworlds_user_id, status, created_by, created_at, revoked_by, revoked_at, note",
    )
    .eq("email", email)
    .eq("status", "REVOKED")
    .order("revoked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapRow(data) : null;
}

export type LwSuperAdminAuthPromotionGate =
  | {
      ok: true;
      authorization: LearnWorldsSuperAdminAuthorizationRow;
    }
  | {
      ok: false;
      reasonCode:
        | "LW_SUPER_ADMIN_AUTH_REQUIRED"
        | "LW_SUPER_ADMIN_AUTH_REVOKED"
        | "LW_SUPER_ADMIN_ID_MISMATCH";
      error: string;
      authorizationId?: string;
    };

/**
 * Prérequis promotion admin → SA : autorisation LW ACTIVE obligatoire.
 * Ne s’applique pas aux comptes déjà super_admin (no-op promote).
 * Ne demote jamais.
 */
export async function requireActiveLwSuperAdminAuthorizationForPromotion(options: {
  email: string;
  getUserByEmail?: GetUserByEmail;
}): Promise<LwSuperAdminAuthPromotionGate> {
  const email = normalizeEmail(options.email);
  if (!email) {
    return {
      ok: false,
      reasonCode: "LW_SUPER_ADMIN_AUTH_REQUIRED",
      error:
        "Autorisation LearnWorlds Super Admin requise avant la promotion.",
    };
  }

  const active = await getActiveAuthorizationByEmail(email);
  if (!active) {
    const revoked = await getLatestRevokedAuthorizationByEmail(email);
    if (revoked) {
      return {
        ok: false,
        reasonCode: "LW_SUPER_ADMIN_AUTH_REVOKED",
        error:
          "Autorisation LearnWorlds révoquée. Une nouvelle autorisation est requise avant la promotion.",
        authorizationId: revoked.id,
      };
    }
    return {
      ok: false,
      reasonCode: "LW_SUPER_ADMIN_AUTH_REQUIRED",
      error:
        "Autorisation LearnWorlds Super Admin requise avant la promotion.",
    };
  }

  if (active.learnworldsUserId) {
    const getUser = options.getUserByEmail ?? getLearnWorldsUserByEmail;
    try {
      const lwUser = await getUser(email);
      if (lwUser && lwUser.id !== active.learnworldsUserId) {
        return {
          ok: false,
          reasonCode: "LW_SUPER_ADMIN_ID_MISMATCH",
          error:
            "L’identifiant LearnWorlds actif ne correspond plus à l’autorisation. Révoquez puis recréez l’autorisation.",
          authorizationId: active.id,
        };
      }
    } catch {
      // Indisponibilité LW temporaire : on conserve l’autorisation ACTIVE déjà validée.
    }
  }

  return { ok: true, authorization: active };
}

export async function listLearnWorldsSuperAdminAuthorizations(options?: {
  status?: LearnWorldsSuperAdminAuthorizationStatus | "ALL";
}): Promise<LearnWorldsSuperAdminAuthorizationRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("learnworlds_super_admin_authorizations")
    .select(
      "id, email, learnworlds_user_id, status, created_by, created_at, revoked_by, revoked_at, note",
    )
    .order("created_at", { ascending: false });

  const status = options?.status ?? "ALL";
  if (status === "ACTIVE" || status === "REVOKED") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`listLearnWorldsSuperAdminAuthorizations: ${error.message}`);
  }
  return (data ?? []).map((row) => mapRow(row));
}
