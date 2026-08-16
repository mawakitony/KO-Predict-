import "server-only";

import { resolveKoCoachCreationConflict } from "@/lib/admin/learnworlds-coach-conflicts";
import {
  evaluateLearnWorldsCoachEligibility,
  mapLearnWorldsCoachLookupIdentity,
} from "@/lib/admin/learnworlds-coach-eligibility";
import { findAuthUserByEmail } from "@/lib/admin/auth-lookup";
import { normalizeEmail } from "@/lib/admin/status";
import { createTeamMember } from "@/lib/admin/team";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { getLearnWorldsUserByEmail } from "@/lib/learnworlds/users";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LearnWorldsUser } from "@/types/learnworlds";

export type CreateLearnWorldsCoachResult =
  | {
      ok: true;
      created: true;
      profileId: string;
      email: string;
      role: "coach";
      activationCode: string;
      expiresAt: string;
    }
  | {
      ok: true;
      created: false;
      alreadyCoach: true;
      profileId: string;
      email: string;
      message: string;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };

type GetUserByEmail = (email: string) => Promise<LearnWorldsUser | null>;

type KoPresence = {
  profile: {
    id: string;
    role: string | null;
    accountStatus: string | null;
  } | null;
  authExists: boolean;
  hasStudentRow: boolean;
};

function displayNamesFromLwUser(
  user: LearnWorldsUser,
  email: string,
): { firstName: string; lastName: string } {
  const firstName = user.firstName?.trim() || "Coach";
  const local = email.split("@")[0]?.trim() || "LearnWorlds";
  const lastName = user.lastName?.trim() || local;
  return { firstName, lastName };
}

export async function loadKoCoachPresence(email: string): Promise<KoPresence> {
  const admin = createAdminClient();
  const auth = await findAuthUserByEmail(email);

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .ilike("email", email)
    .maybeSingle();

  let hasStudentRow = false;
  if (profile?.id) {
    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    hasStudentRow = Boolean(student?.id);
  }

  return {
    profile: profile
      ? {
          id: profile.id,
          role: profile.role,
          accountStatus: profile.account_status,
        }
      : null,
    authExists: Boolean(auth),
    hasStudentRow,
  };
}

async function profileHasStudentRow(profileId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  return (count ?? 0) > 0;
}

/**
 * Crée un coach KO depuis un email LW — revalidation LW obligatoire.
 * Réutilise createTeamMember (Auth + profile coach + first-access).
 * Aucune ligne students.
 */
export async function createLearnWorldsCoach(options: {
  email: string;
  actorId: string;
  getUserByEmail?: GetUserByEmail;
  createTeamMemberFn?: typeof createTeamMember;
  loadKoPresenceFn?: (email: string) => Promise<KoPresence>;
  profileHasStudentRowFn?: (profileId: string) => Promise<boolean>;
  recordAuditFn?: typeof recordAccessAudit;
}): Promise<CreateLearnWorldsCoachResult> {
  const email = normalizeEmail(options.email);
  if (!email) {
    return { ok: false, error: "Adresse email invalide.", code: "invalid_email" };
  }

  const getUser = options.getUserByEmail ?? getLearnWorldsUserByEmail;
  const createMember = options.createTeamMemberFn ?? createTeamMember;
  const loadPresence = options.loadKoPresenceFn ?? loadKoCoachPresence;
  const hasStudent = options.profileHasStudentRowFn ?? profileHasStudentRow;
  const audit = options.recordAuditFn ?? recordAccessAudit;

  let user: LearnWorldsUser | null;
  try {
    user = await getUser(email);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de vérifier LearnWorlds.",
      code: "lookup_failed",
    };
  }

  const eligibility = evaluateLearnWorldsCoachEligibility(user);
  if (eligibility.status !== "ELIGIBLE_INSTRUCTOR" || !user) {
    await audit({
      eventType:
        eligibility.status === "ELIGIBLE_ADMIN_OVERRIDE"
          ? "LEARNWORLDS_COACH_ROLE_CONFLICT"
          : "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
      actorId: options.actorId,
      meta: {
        email,
        eligibility: eligibility.status,
        lw_role_level: user?.role.level ?? null,
      },
    });
    return {
      ok: false,
      error: eligibility.message,
      code: eligibility.status.toLowerCase(),
    };
  }

  const presence = await loadPresence(email);
  const conflict = resolveKoCoachCreationConflict(presence);

  if (conflict.action === "already_coach") {
    return {
      ok: true,
      created: false,
      alreadyCoach: true,
      profileId: conflict.profileId,
      email,
      message: conflict.message,
    };
  }

  if (conflict.action === "block") {
    await audit({
      eventType: conflict.auditEvent,
      authUserId: conflict.profileId,
      actorId: options.actorId,
      meta: {
        email,
        code: conflict.code,
        role: conflict.role,
        account_status: conflict.accountStatus,
      },
    });
    return {
      ok: false,
      error: conflict.message,
      code: conflict.code,
    };
  }

  const { firstName, lastName } = displayNamesFromLwUser(user, email);
  const identity = mapLearnWorldsCoachLookupIdentity(user);

  const created = await createMember({
    firstName,
    lastName,
    email,
    role: "coach",
    actorId: options.actorId,
  });

  if (!created.ok) {
    return { ok: false, error: created.error, code: "create_failed" };
  }

  if (await hasStudent(created.profileId)) {
    await audit({
      eventType: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
      authUserId: created.profileId,
      actorId: options.actorId,
      meta: {
        email,
        code: "unexpected_student_row",
      },
    });
    return {
      ok: false,
      error:
        "Création refusée : une fiche apprenant inattendue est liée à ce compte.",
      code: "unexpected_student_row",
    };
  }

  await audit({
    eventType: "LEARNWORLDS_COACH_CREATED",
    authUserId: created.profileId,
    actorId: options.actorId,
    meta: {
      email,
      role: "coach",
      learnworlds_user_id: identity.learnworldsUserId,
      lw_role_level: identity.roleLevel,
    },
  });

  return {
    ok: true,
    created: true,
    profileId: created.profileId,
    email: created.email,
    role: "coach",
    activationCode: created.activationCode,
    expiresAt: created.expiresAt,
  };
}
