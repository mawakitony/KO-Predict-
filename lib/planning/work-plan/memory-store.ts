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
import { assertWorkPlanPayload } from "@/lib/planning/work-plan/schema";
import type {
  WorkPlanBuildInput,
  WorkPlanSnapshot,
  WorkPlanStatus,
  WorkPlanTask,
  WorkPlanType,
} from "@/lib/planning/work-plan/types";
import { buildWeeklyPlan } from "@/lib/planning/weekly-plan";

export interface PersistedWorkPlan {
  id: string;
  studentId: string;
  planType: WorkPlanType;
  status: WorkPlanStatus;
  startsAt: string;
  endsAt: string;
  snapshot: WorkPlanSnapshot;
  tasks: WorkPlanTask[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export class WorkPlanCycleError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "NO_ACTIVE",
  ) {
    super(message);
    this.name = "WorkPlanCycleError";
  }
}

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Store mémoire — même sémantique que la table (1 ACTIVE / student).
 * Utilisé pour tests Phase B sans dépendre du cloud.
 */
export class InMemoryWorkPlanStore {
  private rows: PersistedWorkPlan[] = [];

  reset() {
    this.rows = [];
  }

  getActive(studentId: string): PersistedWorkPlan | null {
    return this.rows.find(
      (r) => r.studentId === studentId && r.status === "ACTIVE",
    ) ?? null;
  }

  listPrevious(studentId: string, limit = 12): PersistedWorkPlan[] {
    return this.rows
      .filter((r) => r.studentId === studentId && r.status !== "ACTIVE")
      .sort(
        (a, b) =>
          new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
      )
      .slice(0, limit);
  }

  createActive(
    studentId: string,
    input: WorkPlanBuildInput,
    now: Date = new Date(),
  ): PersistedWorkPlan {
    const existing = this.getActive(studentId);
    if (existing) return existing;

    const draft = buildWorkPlanDraft(input);
    const { snapshot, tasks } = assertWorkPlanPayload(
      draft.snapshot,
      draft.tasks,
    );
    const { startsAt, endsAt } = computeWorkPlanWindow(
      now,
      WORK_PLAN_DURATION_DAYS,
    );
    const iso = now.toISOString();
    const row: PersistedWorkPlan = {
      id: newId(),
      studentId,
      planType: draft.planType,
      status: "ACTIVE",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      snapshot,
      tasks,
      createdAt: iso,
      updatedAt: iso,
      completedAt: null,
    };

    // Simule l’index unique partiel
    if (this.getActive(studentId)) {
      return this.getActive(studentId)!;
    }
    this.rows.push(row);
    return row;
  }

  private write(
    planId: string,
    patch: Partial<
      Pick<PersistedWorkPlan, "status" | "tasks" | "snapshot" | "completedAt">
    >,
  ): PersistedWorkPlan {
    const idx = this.rows.findIndex((r) => r.id === planId);
    if (idx < 0) {
      throw new WorkPlanCycleError("Plan introuvable.", "NOT_FOUND");
    }
    const prev = this.rows[idx]!;
    if (patch.status === "ACTIVE" && prev.status !== "ACTIVE") {
      if (this.getActive(prev.studentId)) {
        throw new WorkPlanCycleError("Conflit ACTIVE.", "CONFLICT");
      }
    }
    const next: PersistedWorkPlan = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (patch.tasks) {
      next.tasks = assertWorkPlanPayload(next.snapshot, patch.tasks).tasks;
    }
    if (patch.snapshot) {
      next.snapshot = assertWorkPlanPayload(
        patch.snapshot,
        next.tasks,
      ).snapshot;
    }
    this.rows[idx] = next;
    return next;
  }

  close(
    planId: string,
    status: Extract<WorkPlanStatus, "COMPLETED" | "PARTIAL" | "EXPIRED">,
    tasks?: WorkPlanTask[],
  ): PersistedWorkPlan {
    return this.write(planId, {
      status,
      tasks,
      completedAt: new Date().toISOString(),
    });
  }

  expireActive(studentId: string): PersistedWorkPlan | null {
    const active = this.getActive(studentId);
    if (!active) return null;
    const closure = resolveWorkPlanClosureStatus(active.tasks);
    return this.close(active.id, closure.status, active.tasks);
  }

  supersede(
    studentId: string,
    nextInput: WorkPlanBuildInput,
    now: Date = new Date(),
  ): { previous: PersistedWorkPlan; next: PersistedWorkPlan } {
    const active = this.getActive(studentId);
    if (!active) {
      const next = this.createActive(studentId, nextInput, now);
      return { previous: next, next };
    }
    const previous = this.write(active.id, {
      status: "SUPERSEDED",
      completedAt: now.toISOString(),
    });
    const next = this.createActive(studentId, nextInput, now);
    return { previous, next };
  }

  updateActive(
    studentId: string,
    input: WorkPlanBuildInput,
    now: Date = new Date(),
  ): PersistedWorkPlan {
    let active = this.getActive(studentId);
    if (!active) {
      return this.createActive(studentId, input, now);
    }

    if (new Date(active.endsAt).getTime() <= now.getTime()) {
      const closure = resolveWorkPlanClosureStatus(active.tasks);
      this.close(active.id, closure.status, active.tasks);
      return this.createActive(studentId, input, now);
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
      return this.supersede(studentId, input, now).next;
    }

    const tasks = refreshWorkPlanTasks(active.tasks, active.snapshot, {
      completedActivities: input.completedActivities,
      targetExamDate: input.targetExamDate,
    });

    if (allMeasurableTasksCompleted(tasks)) {
      return this.close(active.id, "COMPLETED", tasks);
    }

    return this.write(active.id, { tasks });
  }

  /** Compte les ACTIVE (détecte doublons). */
  countActive(studentId: string): number {
    return this.rows.filter(
      (r) => r.studentId === studentId && r.status === "ACTIVE",
    ).length;
  }

  allFor(studentId: string): PersistedWorkPlan[] {
    return this.rows.filter((r) => r.studentId === studentId);
  }
}
