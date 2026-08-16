import "server-only";

import { normalizeEmail } from "@/lib/admin/status";
import { getLearnWorldsUserByEmail } from "@/lib/learnworlds/users";
import type { LearnWorldsUser } from "@/types/learnworlds";

export type LwSuperAdminAuthLookupIdentity = {
  learnworldsUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleLevel: string | null;
  roleName: string | null;
  isAdmin: boolean;
  isInstructor: boolean;
};

export type LwSuperAdminAuthLookupResult =
  | {
      ok: true;
      email: string;
      found: true;
      identity: LwSuperAdminAuthLookupIdentity;
    }
  | {
      ok: true;
      email: string;
      found: false;
      identity: null;
    }
  | { ok: false; error: string; reasonCode?: string };

type GetUserByEmail = (email: string) => Promise<LearnWorldsUser | null>;

/**
 * Lookup LW pour autorisation SA — lecture seule.
 * Aucune écriture KO / Auth / LW. role.level = info uniquement.
 */
export async function lookupLearnWorldsSuperAdminAuthCandidate(
  emailInput: string,
  options?: { getUserByEmail?: GetUserByEmail },
): Promise<LwSuperAdminAuthLookupResult> {
  const email = normalizeEmail(emailInput);
  if (!email) {
    return {
      ok: false,
      error: "Adresse email invalide.",
      reasonCode: "INVALID_EMAIL",
    };
  }

  const getUser = options?.getUserByEmail ?? getLearnWorldsUserByEmail;

  try {
    const user = await getUser(email);
    if (!user) {
      return { ok: true, email, found: false, identity: null };
    }
    return {
      ok: true,
      email,
      found: true,
      identity: {
        learnworldsUserId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleLevel: user.role.level,
        roleName: user.role.name,
        isAdmin: user.role.isAdmin,
        isInstructor: user.role.isInstructor,
      },
    };
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
}
