import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { InMemoryWorkPlanStore } from "@/lib/planning/work-plan/memory-store";
import {
  assertWorkPlanPayload,
  workPlanSnapshotSchema,
} from "@/lib/planning/work-plan/schema";
import type { WorkPlanBuildInput } from "@/lib/planning/work-plan/types";
import { resolveWorkPlanClosureStatus } from "@/lib/planning/work-plan/close";
import { refreshWorkPlanTasks } from "@/lib/planning/work-plan/progress";

const STUDENT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function catchUpInput(
  overrides: Partial<WorkPlanBuildInput> = {},
): WorkPlanBuildInput {
  return {
    completedActivities: 98,
    readinessScore: 54,
    paceStatus: "BEHIND",
    inactiveDays: 1,
    targetExamDate: "2026-10-01",
    requiredPace: 8.6,
    remainingActivities: 100,
    qcmAverage: 75,
    currentPace: 4,
    issues: [],
    riskLevel: "AMBER",
    ...overrides,
  };
}

describe("migration learner_work_plans SQL", () => {
  const sqlPath = path.join(
    process.cwd(),
    "supabase/migrations/20260815144045_learner_work_plans.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  it("index unique partiel un seul ACTIVE", () => {
    expect(sql).toContain("learner_work_plans_one_active_per_student");
    expect(sql).toMatch(/where status = 'ACTIVE'/i);
  });

  it("RLS : student own + staff select, pas d’écriture authenticated", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("learner_work_plans_select_own");
    expect(sql).toContain("learner_work_plans_select_staff");
    expect(sql).toContain("s.profile_id = auth.uid()");
    expect(sql).toContain("private.is_staff()");
    expect(sql).toContain("grant select on table public.learner_work_plans to authenticated");
    expect(sql).not.toMatch(
      /create policy.*"learner_work_plans_insert/i,
    );
    expect(sql).not.toMatch(
      /create policy.*"learner_work_plans_update/i,
    );
    expect(sql).not.toMatch(
      /create policy.*"learner_work_plans_delete/i,
    );
    expect(sql).toContain("grant all on table public.learner_work_plans to service_role");
  });
});

describe("zod snapshot/tasks avant écriture", () => {
  it("valide un payload issu du draft", () => {
    const store = new InMemoryWorkPlanStore();
    const plan = store.createActive(STUDENT_A, catchUpInput());
    expect(() =>
      assertWorkPlanPayload(plan.snapshot, plan.tasks),
    ).not.toThrow();
    expect(workPlanSnapshotSchema.parse(plan.snapshot).targetActivities).toBe(
      9,
    );
  });

  it("rejette un snapshot invalide", () => {
    expect(() =>
      assertWorkPlanPayload({ completedActivitiesStart: -1 }, []),
    ).toThrow();
  });
});

describe("cycle InMemoryWorkPlanStore", () => {
  it("création premier plan + lecture active", () => {
    const store = new InMemoryWorkPlanStore();
    const plan = store.createActive(STUDENT_A, catchUpInput());
    expect(plan.status).toBe("ACTIVE");
    expect(plan.planType).toBe("CATCH_UP");
    expect(store.getActive(STUDENT_A)?.id).toBe(plan.id);
  });

  it("double création → un seul ACTIVE", () => {
    const store = new InMemoryWorkPlanStore();
    const a = store.createActive(STUDENT_A, catchUpInput());
    const b = store.createActive(STUDENT_A, catchUpInput({ currentPace: 5 }));
    expect(a.id).toBe(b.id);
    expect(store.countActive(STUDENT_A)).toBe(1);
  });

  it("update progression 0 → 6 / 9", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT_A, catchUpInput({ completedActivities: 98 }));
    const updated = store.updateActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 104 }),
    );
    const activities = updated.tasks.find((t) => t.type === "ACTIVITIES");
    expect(activities?.progress).toBe(6);
    expect(activities?.status).toBe("IN_PROGRESS");
    expect(updated.status).toBe("ACTIVE");
  });

  it("COMPLETED quand 9/9", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT_A, catchUpInput({ completedActivities: 98 }));
    const done = store.updateActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 107 }),
    );
    expect(done.status).toBe("COMPLETED");
    expect(store.getActive(STUDENT_A)).toBeNull();
  });

  it("PARTIAL à l’expiration avec progression", () => {
    const store = new InMemoryWorkPlanStore();
    const start = new Date("2026-08-15T12:00:00.000Z");
    store.createActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 98 }),
      start,
    );
    store.updateActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 104 }),
      start,
    );
    const expiredAt = new Date("2026-08-22T12:00:00.000Z");
    const next = store.updateActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 104 }),
      expiredAt,
    );
    const previous = store.listPrevious(STUDENT_A);
    expect(previous[0]?.status).toBe("PARTIAL");
    expect(next.status).toBe("ACTIVE");
  });

  it("EXPIRED à l’expiration sans progression", () => {
    const store = new InMemoryWorkPlanStore();
    const start = new Date("2026-08-15T12:00:00.000Z");
    const plan = store.createActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 98 }),
      start,
    );
    const closure = resolveWorkPlanClosureStatus(plan.tasks);
    expect(closure.status).toBe("EXPIRED");
    const closed = store.expireActive(STUDENT_A);
    expect(closed?.status).toBe("EXPIRED");
    expect(store.getActive(STUDENT_A)).toBeNull();
  });

  it("SUPERSEDED + nouveau plan (date ajoutée)", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(
      STUDENT_A,
      catchUpInput({
        targetExamDate: null,
        requiredPace: null,
        readinessScore: null,
        paceStatus: null,
        currentPace: null,
        qcmAverage: null,
        issues: ["MISSING_TARGET_DATE", "INSUFFICIENT_QCM"],
      }),
    );
    expect(store.getActive(STUDENT_A)?.planType).toBe("STARTUP");

    const next = store.updateActive(
      STUDENT_A,
      catchUpInput({
        targetExamDate: "2026-11-01",
        requiredPace: 8.6,
        paceStatus: "BEHIND",
        currentPace: 4,
        readinessScore: 40,
        qcmAverage: 70,
        issues: [],
      }),
    );
    expect(next.status).toBe("ACTIVE");
    expect(next.planType).toBe("CATCH_UP");
    const prev = store.listPrevious(STUDENT_A);
    expect(prev.some((p) => p.status === "SUPERSEDED")).toBe(true);
    expect(store.countActive(STUDENT_A)).toBe(1);
  });

  it("création nouveau plan après clôture", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT_A, catchUpInput({ completedActivities: 98 }));
    store.updateActive(STUDENT_A, catchUpInput({ completedActivities: 107 }));
    expect(store.getActive(STUDENT_A)).toBeNull();
    const again = store.createActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 107 }),
    );
    expect(again.status).toBe("ACTIVE");
    expect(store.listPrevious(STUDENT_A).length).toBeGreaterThanOrEqual(1);
  });

  it("historique ordonné par ends_at desc", () => {
    const store = new InMemoryWorkPlanStore();
    const t0 = new Date("2026-08-01T12:00:00.000Z");
    store.createActive(STUDENT_A, catchUpInput(), t0);
    store.expireActive(STUDENT_A);
    const t1 = new Date("2026-08-08T12:00:00.000Z");
    store.createActive(STUDENT_A, catchUpInput(), t1);
    store.updateActive(STUDENT_A, catchUpInput({ completedActivities: 200 }), t1);
    const hist = store.listPrevious(STUDENT_A);
    expect(hist.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < hist.length; i++) {
      expect(new Date(hist[i - 1]!.endsAt).getTime()).toBeGreaterThanOrEqual(
        new Date(hist[i]!.endsAt).getTime(),
      );
    }
  });

  it("student A isolé de B (store)", () => {
    const store = new InMemoryWorkPlanStore();
    store.createActive(STUDENT_A, catchUpInput());
    store.createActive(STUDENT_B, catchUpInput({ completedActivities: 10 }));
    expect(store.getActive(STUDENT_A)?.studentId).toBe(STUDENT_A);
    expect(store.getActive(STUDENT_B)?.studentId).toBe(STUDENT_B);
    expect(store.allFor(STUDENT_A).every((p) => p.studentId === STUDENT_A)).toBe(
      true,
    );
  });
});

describe("permissions contrat Phase B", () => {
  it("écriture client interdite — documenté par absence de policies write", () => {
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260815144045_learner_work_plans.sql",
      ),
      "utf8",
    );
    const writePolicies = [
      ...sql.matchAll(/create policy\s+"([^"]+)"/gi),
    ].map((m) => m[1]);
    expect(writePolicies.every((p) => p?.includes("select"))).toBe(true);
  });

  it("coach/admin/super_admin lecture via is_staff", () => {
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260815144045_learner_work_plans.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("learner_work_plans_select_staff");
    expect(sql).toContain("using (private.is_staff())");
  });
});

describe("refresh clamp négatif", () => {
  it("delta négatif → 0", () => {
    const store = new InMemoryWorkPlanStore();
    const plan = store.createActive(
      STUDENT_A,
      catchUpInput({ completedActivities: 98 }),
    );
    const tasks = refreshWorkPlanTasks(plan.tasks, plan.snapshot, {
      completedActivities: 90,
      targetExamDate: "2026-10-01",
    });
    expect(tasks.find((t) => t.type === "ACTIVITIES")?.progress).toBe(0);
  });
});
