import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { parseUserRole } from "@/lib/auth/roles";

/** Pure — utilisable en tests sans I/O. */
export function hasMinimumActiveSuperAdmins(
  activeCount: number,
  min = 2,
): boolean {
  return Number.isFinite(activeCount) && activeCount >= min;
}

/** Pure — true si un seul super_admin ACTIVE existe. */
export function isLastActiveSuperAdminCount(activeCount: number): boolean {
  return activeCount === 1;
}

export async function countActiveSuperAdmins(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("account_status", "ACTIVE");

  if (error) {
    throw new Error(`Comptage super_admin: ${error.message}`);
  }
  return count ?? 0;
}

export type LastSuperAdminGuardResult =
  | { ok: true }
  | { ok: false; error: string; reasonCode: "LAST_ACTIVE_SUPER_ADMIN" | "NOT_SUPER_ADMIN" | "NOT_FOUND" };

/**
 * Empêche toute opération future qui supprimerait / désactiverait / rétrograderait
 * le dernier super_admin ACTIVE.
 * V1 : disable/demote restent interdits en UI ; ce helper prépare la garde.
 */
export async function assertNotLastActiveSuperAdmin(
  targetProfileId: string,
): Promise<LastSuperAdminGuardResult> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", targetProfileId)
    .maybeSingle();

  if (!profile) {
    return { ok: false, error: "Profil introuvable.", reasonCode: "NOT_FOUND" };
  }

  const role = parseUserRole(profile.role);
  if (role !== "super_admin") {
    return {
      ok: false,
      error: "La cible n’est pas super_admin.",
      reasonCode: "NOT_SUPER_ADMIN",
    };
  }

  if (profile.account_status !== "ACTIVE") {
    // Pas le dernier ACTIVE si déjà non-ACTIVE.
    return { ok: true };
  }

  const activeCount = await countActiveSuperAdmins();
  if (isLastActiveSuperAdminCount(activeCount)) {
    return {
      ok: false,
      error:
        "Impossible d’agir sur le dernier super_admin ACTIVE. Créez un second super_admin d’abord.",
      reasonCode: "LAST_ACTIVE_SUPER_ADMIN",
    };
  }

  return { ok: true };
}
