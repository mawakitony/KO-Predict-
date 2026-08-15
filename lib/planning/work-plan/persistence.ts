import "server-only";

import {
  buildWorkPlanDraft,
  computeWorkPlanWindow,
  WORK_PLAN_DURATION_DAYS,
} from "@/lib/planning/work-plan/build";
import {
  allMeasurableTasksCompleted,
  resolveWorkPlanClosureStatus,
} from "@/lib/planning/work-plan/close";
import {
  detectMajorPlanEvents,
  shouldSupersedeForMajorEvents,
} from "@/lib/planning/work-plan/major-events";
import { refreshWorkPlanTasks } from "@/lib/planning/work-plan/progress";
import { assertWorkPlanPayload, assertWorkPlanSnapshotOnly, assertWorkPlanTasksOnly } from "@/lib/planning/work-plan/schema";
import type {
  WorkPlanBuildInput,
  WorkPlanSnapshot,
  WorkPlanStatus,
  WorkPlanTask,
  WorkPlanType,
} from "@/lib/planning/work-plan/types";
import { buildWeeklyPlan } from "@/lib/planning/weekly-plan";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";

export type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";

export class WorkPlanPersistenceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NOT_FOUND"
      | "VALIDATION"
      | "CONFLICT"
      | "DB"
      | "NO_ACTIVE",
  ) {
    super(message);
    this.name = "WorkPlanPersistenceError";
  }
}

type DbRow = {
  id: string;
  student_id: string;
  plan_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  snapshot: unknown;
  tasks: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function mapRow(row: DbRow): PersistedWorkPlan {
  const { snapshot, tasks } = assertWorkPlanPayload(row.snapshot, row.tasks);
  return {
    id: row.id,
    studentId: row.student_id,
    planType: row.plan_type as WorkPlanType,
    status: row.status as WorkPlanStatus,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    snapshot,
    tasks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "23505" ||
    Boolean(error.message?.toLowerCase().includes("duplicate")) ||
    Boolean(error.message?.includes("learner_work_plans_one_active"))
  );
}

/** Lecture du plan ACTIVE (service_role). */
export async function getActiveWorkPlan(
  studentId: string,
): Promise<PersistedWorkPlan | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("learner_work_plans")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) {
    throw new WorkPlanPersistenceError(error.message, "DB");
  }
  if (!data) return null;
  return mapRow(data as DbRow);
}

/** Historique hors ACTIVE, plus récent d’abord. */
export async function listPreviousWorkPlans(
  studentId: string,
  limit = 12,
): Promise<PersistedWorkPlan[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("learner_work_plans")
    .select("*")
    .eq("student_id", studentId)
    .neq("status", "ACTIVE")
    .order("ends_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new WorkPlanPersistenceError(error.message, "DB");
  }
  return (data as DbRow[] | null)?.map(mapRow) ?? [];
}

/**
 * Crée un plan ACTIVE depuis les métriques courantes.
 * Si un ACTIVE existe déjà (double appel / course), retourne l’existant.
 */
export async function createActiveWorkPlan(
  studentId: string,
  input: WorkPlanBuildInput,
  options: { now?: Date } = {},
): Promise<PersistedWorkPlan> {
  const existing = await getActiveWorkPlan(studentId);
  if (existing) return existing;

  const draft = buildWorkPlanDraft(input);
  const { snapshot, tasks } = assertWorkPlanPayload(
    draft.snapshot,
    draft.tasks,
  );
  const now = options.now ?? new Date();
  const { startsAt, endsAt } = computeWorkPlanWindow(
    now,
    WORK_PLAN_DURATION_DAYS,
  );

  const db = createAdminClient();
  const { data, error } = await db
    .from("learner_work_plans")
    .insert({
      student_id: studentId,
      plan_type: draft.planType,
      status: "ACTIVE",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      snapshot,
      tasks,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      const raced = await getActiveWorkPlan(studentId);
      if (raced) return raced;
      throw new WorkPlanPersistenceError(
        "Conflit de plan actif.",
        "CONFLICT",
      );
    }
    throw new WorkPlanPersistenceError(error.message, "DB");
  }
  if (!data) {
    throw new WorkPlanPersistenceError("Insertion plan échouée.", "DB");
  }
  return mapRow(data as DbRow);
}

async function writePlanUpdate(
  planId: string,
  patch: {
    status?: WorkPlanStatus;
    tasks?: WorkPlanTask[];
    snapshot?: WorkPlanSnapshot;
    completed_at?: string | null;
  },
): Promise<PersistedWorkPlan> {
  const db = createAdminClient();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status != null) payload.status = patch.status;
  if (patch.tasks != null) {
    payload.tasks = assertWorkPlanTasksOnly(patch.tasks);
  }
  if (patch.snapshot != null) {
    payload.snapshot = assertWorkPlanSnapshotOnly(patch.snapshot);
  }
  if (patch.completed_at !== undefined) {
    payload.completed_at = patch.completed_at;
  }

  const { data, error } = await db
    .from("learner_work_plans")
    .update(payload)
    .eq("id", planId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new WorkPlanPersistenceError(error.message, "DB");
  }
  if (!data) {
    throw new WorkPlanPersistenceError("Plan introuvable.", "NOT_FOUND");
  }
  return mapRow(data as DbRow);
}

/** Clôture explicite (COMPLETED / PARTIAL / EXPIRED). */
export async function closeWorkPlan(
  planId: string,
  status: Extract<WorkPlanStatus, "COMPLETED" | "PARTIAL" | "EXPIRED">,
  tasks?: WorkPlanTask[],
): Promise<PersistedWorkPlan> {
  return writePlanUpdate(planId, {
    status,
    tasks,
    completed_at: new Date().toISOString(),
  });
}

/** Expire un plan ACTIVE selon la règle de clôture V1. */
export async function expireActiveWorkPlan(
  studentId: string,
): Promise<PersistedWorkPlan | null> {
  const active = await getActiveWorkPlan(studentId);
  if (!active) return null;
  const closure = resolveWorkPlanClosureStatus(active.tasks);
  return closeWorkPlan(active.id, closure.status, active.tasks);
}

/**
 * SUPERSEDED puis création du plan suivant (événement majeur).
 * Anti-doublon : createActiveWorkPlan gère la concurrence.
 */
export async function supersedeActiveWorkPlan(
  studentId: string,
  nextInput: WorkPlanBuildInput,
  options: { now?: Date } = {},
): Promise<{ previous: PersistedWorkPlan; next: PersistedWorkPlan }> {
  const active = await getActiveWorkPlan(studentId);
  if (!active) {
    const next = await createActiveWorkPlan(studentId, nextInput, options);
    return { previous: next, next };
  }

  const previous = await writePlanUpdate(active.id, {
    status: "SUPERSEDED",
    completed_at: new Date().toISOString(),
  });
  const next = await createActiveWorkPlan(studentId, nextInput, options);
  return { previous, next };
}

/**
 * Met à jour la progression du plan ACTIVE (pas de recréation).
 * - refresh tâches
 * - COMPLETED anticipé si toutes mesurables faites
 * - expiration si ends_at dépassé
 * - SUPERSEDE uniquement sur événement majeur V1
 */
export async function updateActiveWorkPlan(
  studentId: string,
  input: WorkPlanBuildInput,
  options: { now?: Date } = {},
): Promise<PersistedWorkPlan> {
  const now = options.now ?? new Date();
  let active = await getActiveWorkPlan(studentId);
  if (!active) {
    return createActiveWorkPlan(studentId, input, { now });
  }

  // Expiration naturelle
  if (new Date(active.endsAt).getTime() <= now.getTime()) {
    const closure = resolveWorkPlanClosureStatus(active.tasks);
    await closeWorkPlan(active.id, closure.status, active.tasks);
    return createActiveWorkPlan(studentId, input, { now });
  }

  const weeklyNow = buildWeeklyPlan({
    readinessScore: input.readinessScore,
    currentPace: input.currentPace,
    requiredPace: input.requiredPace,
    paceStatus: input.paceStatus,
    remainingActivities: input.remainingActivities,
    inactiveDays: input.inactiveDays,
    qcmAverage: input.qcmAverage,
    riskLevel: input.riskLevel,
    issues: input.issues,
  });

  const events = detectMajorPlanEvents({
    snapshot: active.snapshot,
    now: input,
    weeklyStatusAtStart: active.snapshot.weeklyStatusStart,
    weeklyStatusNow: weeklyNow.status,
  });

  if (shouldSupersedeForMajorEvents(events)) {
    const { next } = await supersedeActiveWorkPlan(studentId, input, { now });
    return next;
  }

  const tasks = refreshWorkPlanTasks(active.tasks, active.snapshot, {
    completedActivities: input.completedActivities,
    targetExamDate: input.targetExamDate,
  });

  // NO_ACTIVITY : s’assurer qu’une tâche RESUME existe (sans SUPERSEDE)
  // — Phase B : on ne reconstruit pas toute la liste ; refresh suffit.
  // Si le plan n’avait pas RESUME, on laisse tel quel jusqu’au prochain cycle.

  if (allMeasurableTasksCompleted(tasks)) {
    return closeWorkPlan(active.id, "COMPLETED", tasks);
  }

  return writePlanUpdate(active.id, { tasks });
}

/** Assure un plan actif : create si absent, sinon update. */
export async function ensureActiveWorkPlan(
  studentId: string,
  input: WorkPlanBuildInput,
  options: { now?: Date } = {},
): Promise<PersistedWorkPlan> {
  return updateActiveWorkPlan(studentId, input, options);
}
