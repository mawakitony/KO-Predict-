/**
 * Éligibilité coach KO depuis un user LearnWorlds.
 * Source d’autorité : role.level — jamais role.name seul.
 * Pas de promotion auto : le SA confirme côté KO.
 */

import type { LearnWorldsUser, LearnWorldsUserRoleInfo } from "@/types/learnworlds";

export type LearnWorldsCoachEligibilityStatus =
  | "ELIGIBLE_INSTRUCTOR"
  | "ELIGIBLE_ADMIN_OVERRIDE"
  | "NOT_ELIGIBLE"
  | "NOT_FOUND";

export type LearnWorldsCoachEligibility =
  | {
      status: "NOT_FOUND";
      canCreateCoachV1: false;
      message: string;
    }
  | {
      status: "ELIGIBLE_INSTRUCTOR";
      canCreateCoachV1: true;
      role: LearnWorldsUserRoleInfo;
      coherenceOk: boolean;
      message: string;
    }
  | {
      status: "ELIGIBLE_ADMIN_OVERRIDE";
      canCreateCoachV1: false;
      role: LearnWorldsUserRoleInfo;
      message: string;
    }
  | {
      status: "NOT_ELIGIBLE";
      canCreateCoachV1: false;
      role: LearnWorldsUserRoleInfo;
      message: string;
    };

const MSG_NOT_FOUND =
  "Aucun compte LearnWorlds trouvé pour cette adresse email.";
const MSG_INSTRUCTOR =
  "Instructor reconnu. Vous pouvez créer un accès Coach KO Predict™.";
const MSG_ADMIN_OVERRIDE =
  "Compte LearnWorlds admin : une validation produit spécifique serait nécessaire. Création coach V1 non autorisée automatiquement.";
const MSG_NOT_ELIGIBLE =
  "Ce compte LearnWorlds n’a pas le niveau instructional requis pour devenir coach KO.";

export function evaluateLearnWorldsCoachEligibility(
  user: Pick<LearnWorldsUser, "role"> | null | undefined,
): LearnWorldsCoachEligibility {
  if (!user) {
    return {
      status: "NOT_FOUND",
      canCreateCoachV1: false,
      message: MSG_NOT_FOUND,
    };
  }

  const role = user.role;
  const level = role.level?.trim().toLowerCase() ?? null;

  if (level === "instructor") {
    return {
      status: "ELIGIBLE_INSTRUCTOR",
      canCreateCoachV1: true,
      role,
      coherenceOk: role.isInstructor === true,
      message: MSG_INSTRUCTOR,
    };
  }

  if (level === "admin" || role.isAdmin === true) {
    return {
      status: "ELIGIBLE_ADMIN_OVERRIDE",
      canCreateCoachV1: false,
      role,
      message: MSG_ADMIN_OVERRIDE,
    };
  }

  return {
    status: "NOT_ELIGIBLE",
    canCreateCoachV1: false,
    role,
    message: MSG_NOT_ELIGIBLE,
  };
}

/** Payload UI sûr — jamais de token / raw secrets. */
export type LearnWorldsCoachLookupIdentity = {
  learnworldsUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleLevel: string | null;
  roleName: string | null;
  isInstructor: boolean;
  isAdmin: boolean;
};

export function mapLearnWorldsCoachLookupIdentity(
  user: LearnWorldsUser,
): LearnWorldsCoachLookupIdentity {
  return {
    learnworldsUserId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleLevel: user.role.level,
    roleName: user.role.name,
    isInstructor: user.role.isInstructor,
    isAdmin: user.role.isAdmin,
  };
}
