import "server-only";

import { normalizeEmail } from "@/lib/admin/status";
import {
  evaluateLearnWorldsCoachEligibility,
  mapLearnWorldsCoachLookupIdentity,
  type LearnWorldsCoachEligibility,
  type LearnWorldsCoachLookupIdentity,
} from "@/lib/admin/learnworlds-coach-eligibility";
import { getLearnWorldsUserByEmail } from "@/lib/learnworlds/users";
import type { LearnWorldsUser } from "@/types/learnworlds";

export type LearnWorldsCoachLookupResult =
  | {
      ok: true;
      email: string;
      eligibility: LearnWorldsCoachEligibility;
      identity: LearnWorldsCoachLookupIdentity | null;
    }
  | { ok: false; error: string; code?: string };

type GetUserByEmail = (email: string) => Promise<LearnWorldsUser | null>;

/**
 * Lookup email → user LW → éligibilité coach.
 * Ne crée aucun compte KO. Ne modifie aucun rôle.
 * Le client ne fournit que l’email — le rôle LW vient toujours de l’API.
 */
export async function lookupLearnWorldsCoachByEmail(
  emailInput: string,
  options?: { getUserByEmail?: GetUserByEmail },
): Promise<LearnWorldsCoachLookupResult> {
  const email = normalizeEmail(emailInput);
  if (!email) {
    return { ok: false, error: "Adresse email invalide.", code: "invalid_email" };
  }

  const getUser = options?.getUserByEmail ?? getLearnWorldsUserByEmail;

  try {
    const user = await getUser(email);
    const eligibility = evaluateLearnWorldsCoachEligibility(user);
    return {
      ok: true,
      email,
      eligibility,
      identity: user ? mapLearnWorldsCoachLookupIdentity(user) : null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de vérifier LearnWorlds.";
    return { ok: false, error: message, code: "lookup_failed" };
  }
}
