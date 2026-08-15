import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import {
  getActiveWorkPlan,
  listPreviousWorkPlans,
  type PersistedWorkPlan,
} from "@/lib/planning/work-plan/persistence";

export type SessionStudentIdentity =
  | { ok: true; userId: string; studentId: string }
  | { ok: false; reason: "UNAUTHENTICATED" | "NO_STUDENT" | "UNAVAILABLE" };

/**
 * Identité apprenant via session — sans exiger learnworlds_user_id
 * (le plan de progression s’appuie sur metrics / prédiction).
 */
export async function resolveSessionStudentIdentity(): Promise<SessionStudentIdentity> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, reason: "UNAVAILABLE" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };

  const { data: student, error } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) return { ok: false, reason: "UNAVAILABLE" };
  if (!student) return { ok: false, reason: "NO_STUDENT" };

  return { ok: true, userId: user.id, studentId: student.id };
}

export async function loadOwnWorkPlans(options?: {
  previousLimit?: number;
}): Promise<{
  active: PersistedWorkPlan | null;
  previous: PersistedWorkPlan[];
  studentId: string | null;
  error: "UNAUTHENTICATED" | "NO_STUDENT" | "UNAVAILABLE" | null;
}> {
  const identity = await resolveSessionStudentIdentity();
  if (!identity.ok) {
    return {
      active: null,
      previous: [],
      studentId: null,
      error: identity.reason,
    };
  }

  try {
    const active = await getActiveWorkPlan(identity.studentId);
    const previous =
      (options?.previousLimit ?? 8) > 0
        ? await listPreviousWorkPlans(
            identity.studentId,
            options?.previousLimit ?? 8,
          )
        : [];
    return {
      active,
      previous,
      studentId: identity.studentId,
      error: null,
    };
  } catch {
    return {
      active: null,
      previous: [],
      studentId: identity.studentId,
      error: "UNAVAILABLE",
    };
  }
}
