import { z } from "zod";
import type {
  WorkPlanSnapshot,
  WorkPlanTask,
} from "@/lib/planning/work-plan/types";

const paceStatusSchema = z.enum([
  "ON_TRACK",
  "SLIGHTLY_BEHIND",
  "BEHIND",
  "AHEAD",
  "NO_ACTIVITY",
]);

const weeklyStatusSchema = z.enum([
  "INSUFFICIENT_DATA",
  "NO_ACTIVITY",
  "BEHIND",
  "SLIGHTLY_BEHIND",
  "ON_TRACK",
  "AHEAD",
  "COMPLETE",
]);

export const workPlanSnapshotSchema = z.object({
  completedActivitiesStart: z.number().finite().nonnegative(),
  readinessStart: z.number().finite().nullable(),
  paceStatusStart: paceStatusSchema.nullable(),
  inactiveDaysStart: z.number().finite().nullable(),
  targetExamDateStart: z.string().nullable(),
  requiredPaceStart: z.number().finite().nullable(),
  targetActivities: z.number().int().positive().nullable(),
  qcmAverageStart: z.number().finite().nullable(),
  weeklyStatusStart: weeklyStatusSchema,
  primaryObjective: z.string().min(1),
  reason: z.string().min(1),
});

export const workPlanTaskSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "ACTIVITIES",
    "TARGET_DATE",
    "RESUME_ACTIVITY",
    "QCM_PRACTICE",
    "MAINTAIN_PACE",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  target: z.number().finite().nullable(),
  progress: z.number().finite().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "NOT_APPLICABLE"]),
  reason: z.string().min(1),
  measurable: z.boolean(),
});

export const workPlanTasksSchema = z.array(workPlanTaskSchema).min(1).max(5);

export function parseWorkPlanSnapshot(raw: unknown): WorkPlanSnapshot {
  return workPlanSnapshotSchema.parse(raw);
}

export function parseWorkPlanTasks(raw: unknown): WorkPlanTask[] {
  return workPlanTasksSchema.parse(raw);
}

export function assertWorkPlanPayload(snapshot: unknown, tasks: unknown): {
  snapshot: WorkPlanSnapshot;
  tasks: WorkPlanTask[];
} {
  return {
    snapshot: parseWorkPlanSnapshot(snapshot),
    tasks: parseWorkPlanTasks(tasks),
  };
}

export function assertWorkPlanSnapshotOnly(snapshot: unknown): WorkPlanSnapshot {
  return parseWorkPlanSnapshot(snapshot);
}

export function assertWorkPlanTasksOnly(tasks: unknown): WorkPlanTask[] {
  return parseWorkPlanTasks(tasks);
}
