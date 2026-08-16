import "server-only";

import { normalizeEmail } from "@/lib/admin/status";
import { requireActiveLwSuperAdminAuthorizationForPromotion } from "@/lib/admin/learnworlds-super-admin-authorizations";
import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { parseUserRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/student";

export type PromoteSuperAdminResult =
  | {
      ok: true;
      profileId: string;
      from: UserRole;
      to: "super_admin";
      alreadySuperAdmin?: boolean;
      activeSuperAdminCount: number;
    }
  | {
      ok: false;
      error: string;
      reasonCode?: string;
    };

async function blockPromotion(options: {
  actorId: string;
  targetProfileId?: string | null;
  reasonCode: string;
  error: string;
  meta?: Record<string, unknown>;
}): Promise<PromoteSuperAdminResult> {
  await recordAccessAudit({
    eventType: "SUPER_ADMIN_PROMOTION_BLOCKED",
    authUserId: options.targetProfileId ?? null,
    actorId: options.actorId,
    meta: {
      source: "admin_team_promote",
      reason_code: options.reasonCode,
      target_profile_id: options.targetProfileId ?? null,
      ...options.meta,
    },
  });
  return {
    ok: false,
    error: options.error,
    reasonCode: options.reasonCode,
  };
}

/**
 * Promotion contrôlée admin ACTIVE → super_admin.
 * Prérequis : autorisation LearnWorlds Super Admin ACTIVE (futures promotions).
 * Les SA déjà existants restent no-op sans exiger d’autorisation historique.
 * Pas de demote/disable ici.
 */
export async function promoteToSuperAdmin(options: {
  targetProfileId: string;
  actorId: string;
  confirmEmail: string;
  confirmAcknowledged: boolean;
}): Promise<PromoteSuperAdminResult> {
  if (!options.confirmAcknowledged) {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "CONFIRMATION_REQUIRED",
      error:
        "Confirmation obligatoire : cochez la case pour valider la promotion.",
    });
  }

  const confirmEmail = normalizeEmail(options.confirmEmail);
  if (!confirmEmail) {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "CONFIRM_EMAIL_INVALID",
      error: "Saisissez l’email exact du membre à promouvoir.",
    });
  }

  const admin = createAdminClient();

  const { data: actor } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", options.actorId)
    .maybeSingle();

  if (!actor || parseUserRole(actor.role) !== "super_admin") {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "ACTOR_NOT_SUPER_ADMIN",
      error: "Seul un super_admin peut promouvoir un autre super_admin.",
    });
  }
  if (actor.account_status !== "ACTIVE") {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "ACTOR_NOT_ACTIVE",
      error: "Votre compte super_admin n’est pas actif.",
    });
  }

  if (options.targetProfileId === options.actorId) {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "SELF_TARGET",
      error: "Vous ne pouvez pas vous promouvoir vous-même (déjà super_admin).",
    });
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, email, role, account_status")
    .eq("id", options.targetProfileId)
    .maybeSingle();

  if (!target) {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "TARGET_NOT_FOUND",
      error: "Membre introuvable.",
    });
  }

  const from = parseUserRole(target.role);
  const targetEmail = normalizeEmail(target.email);

  if (!targetEmail || targetEmail !== confirmEmail) {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "CONFIRM_EMAIL_MISMATCH",
      error:
        "L’email saisi ne correspond pas au compte cible. Recopiez l’adresse exacte.",
      meta: { from_role: from },
    });
  }

  // SA existants : no-op sans exiger d’autorisation LW historique.
  if (from === "super_admin") {
    const activeSuperAdminCount = await countActiveSuperAdmins();
    return {
      ok: true,
      profileId: target.id,
      from: "super_admin",
      to: "super_admin",
      alreadySuperAdmin: true,
      activeSuperAdminCount,
    };
  }

  if (from !== "admin") {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "TARGET_NOT_ADMIN",
      error:
        from === "coach"
          ? "Passez d’abord ce coach en admin via le flux normal, puis promouvez."
          : "Seuls les comptes admin ACTIVE peuvent devenir super_admin.",
      meta: { from_role: from },
    });
  }

  if (target.account_status !== "ACTIVE") {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "TARGET_NOT_ACTIVE",
      error: "Le compte cible doit être ACTIVE pour être promu super_admin.",
      meta: {
        from_role: from,
        account_status: target.account_status,
      },
    });
  }

  const authGate = await requireActiveLwSuperAdminAuthorizationForPromotion({
    email: targetEmail,
  });
  if (!authGate.ok) {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: authGate.reasonCode,
      error: authGate.error,
      meta: {
        from_role: from,
        authorization_id: authGate.authorizationId ?? null,
      },
    });
  }

  const { error } = await admin
    .from("profiles")
    .update({
      role: "super_admin",
      updated_at: new Date().toISOString(),
    })
    .eq("id", target.id)
    .eq("role", "admin")
    .eq("account_status", "ACTIVE");

  if (error) {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "UPDATE_FAILED",
      error: error.message,
      meta: { from_role: from },
    });
  }

  const { data: verify } = await admin
    .from("profiles")
    .select("role")
    .eq("id", target.id)
    .maybeSingle();

  if (parseUserRole(verify?.role) !== "super_admin") {
    return blockPromotion({
      actorId: options.actorId,
      targetProfileId: options.targetProfileId,
      reasonCode: "UPDATE_NOT_APPLIED",
      error:
        "Promotion non appliquée (le compte n’était plus admin ACTIVE).",
      meta: { from_role: from },
    });
  }

  const activeSuperAdminCount = await countActiveSuperAdmins();

  await recordAccessAudit({
    eventType: "SUPER_ADMIN_PROMOTED",
    authUserId: target.id,
    actorId: options.actorId,
    meta: {
      source: "admin_team_promote",
      from_role: "admin",
      to_role: "super_admin",
      target_profile_id: target.id,
      active_super_admin_count: activeSuperAdminCount,
      authorization_id: authGate.authorization.id,
      learnworlds_user_id: authGate.authorization.learnworldsUserId,
    },
  });

  return {
    ok: true,
    profileId: target.id,
    from: "admin",
    to: "super_admin",
    activeSuperAdminCount,
  };
}
