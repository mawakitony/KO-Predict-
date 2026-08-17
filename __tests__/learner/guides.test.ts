import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNER_GUIDE_COPY,
  LEARNER_GUIDE_KEYS,
  LEARNER_GUIDE_PRIORITY,
  isGuideAutoBlocked,
  parseGuideAckBody,
  resolveGuideStudentId,
  selectLearnerAutoPopup,
  selectLearnerGuide,
  type LearnerGuideContext,
  type LearnerGuideState,
} from "@/lib/learner/guides";

const STUDENT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function ctx(
  overrides: Partial<LearnerGuideContext> = {},
): LearnerGuideContext {
  return {
    page: "dashboard",
    targetExamDate: "2026-10-01",
    issues: [],
    qcmAverage: 75,
    inactiveDays: 1,
    readinessScore: 72,
    collecting: false,
    ...overrides,
  };
}

function closed(
  key: string,
  action: "dismiss" | "complete" = "dismiss",
): LearnerGuideState {
  return {
    key,
    shownAt: "2026-08-17T08:00:00.000Z",
    dismissedAt: action === "dismiss" ? "2026-08-17T08:01:00.000Z" : null,
    completedAt: action === "complete" ? "2026-08-17T08:01:00.000Z" : null,
  };
}

function shownOnly(key: string): LearnerGuideState {
  return {
    key,
    shownAt: "2026-08-17T08:00:00.000Z",
    dismissedAt: null,
    completedAt: null,
  };
}

const allSituational: LearnerGuideContext = ctx({
  targetExamDate: null,
  issues: ["MISSING_TARGET_DATE", "INSUFFICIENT_QCM"],
  qcmAverage: null,
  inactiveDays: 10,
  readinessScore: 40,
  collecting: false,
});

describe("moteur de sélection des guides", () => {
  it("n’importe pas lib/learnworlds", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/learner/guides.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/lib\/learnworlds/);
    expect(src).not.toMatch(/@\/lib\/learnworlds/);
  });

  it("priorités exactes et une seule sélection", () => {
    expect([...LEARNER_GUIDE_PRIORITY]).toEqual([...LEARNER_GUIDE_KEYS]);
    const key = selectLearnerGuide(allSituational, {});
    expect(key).toBe("welcome_dashboard");
  });

  it("welcome_dashboard en tête sur le dashboard", () => {
    expect(selectLearnerGuide(allSituational, {})).toBe("welcome_dashboard");
    expect(
      selectLearnerGuide({ ...allSituational, page: "learning" }, {}),
    ).toBe("missing_exam_date");
  });

  it("date cible manquante après welcome fermé", () => {
    const states = { welcome_dashboard: closed("welcome_dashboard") };
    expect(selectLearnerGuide(allSituational, states)).toBe(
      "missing_exam_date",
    );
    expect(
      selectLearnerGuide(
        ctx({ targetExamDate: null, issues: [] }),
        states,
      ),
    ).toBe("missing_exam_date");
    expect(
      selectLearnerGuide(
        ctx({
          targetExamDate: "2026-10-01",
          issues: ["MISSING_TARGET_DATE"],
        }),
        states,
      ),
    ).toBe("missing_exam_date");
  });

  it("QCM absent / INSUFFICIENT_QCM", () => {
    const states = {
      welcome_dashboard: closed("welcome_dashboard"),
      missing_exam_date: closed("missing_exam_date"),
    };
    expect(
      selectLearnerGuide(
        ctx({ issues: ["INSUFFICIENT_QCM"], qcmAverage: 80 }),
        states,
      ),
    ).toBe("no_scored_qcm");
    expect(
      selectLearnerGuide(ctx({ issues: [], qcmAverage: null }), states),
    ).toBe("no_scored_qcm");
  });

  it("inactivity si inactiveDays >= 7", () => {
    const states = {
      welcome_dashboard: closed("welcome_dashboard"),
      missing_exam_date: closed("missing_exam_date"),
      no_scored_qcm: closed("no_scored_qcm"),
    };
    expect(
      selectLearnerGuide(ctx({ inactiveDays: 7, qcmAverage: 70 }), states),
    ).toBe("inactivity");
    expect(
      selectLearnerGuide(ctx({ inactiveDays: 6, qcmAverage: 70 }), states),
    ).not.toBe("inactivity");
    expect(
      selectLearnerGuide(ctx({ inactiveDays: null, qcmAverage: 70 }), states),
    ).not.toBe("inactivity");
  });

  it("low_readiness si score < 60 hors collecte", () => {
    const states = {
      welcome_dashboard: closed("welcome_dashboard"),
      missing_exam_date: closed("missing_exam_date"),
      no_scored_qcm: closed("no_scored_qcm"),
      inactivity: closed("inactivity"),
    };
    expect(
      selectLearnerGuide(
        ctx({ readinessScore: 59, collecting: false, qcmAverage: 70 }),
        states,
      ),
    ).toBe("low_readiness");
    expect(
      selectLearnerGuide(
        ctx({ readinessScore: 60, collecting: false, qcmAverage: 70 }),
        states,
      ),
    ).toBeNull();
    expect(
      selectLearnerGuide(
        ctx({ readinessScore: 40, collecting: true, qcmAverage: 70 }),
        states,
      ),
    ).toBeNull();
    expect(
      selectLearnerGuide(
        ctx({ readinessScore: null, collecting: false, qcmAverage: 70 }),
        states,
      ),
    ).toBeNull();
  });

  it("première visite learning / plan", () => {
    const quiet = ctx({
      page: "learning",
      qcmAverage: 70,
      inactiveDays: 1,
      readinessScore: 72,
      collecting: false,
    });
    expect(selectLearnerGuide(quiet, {})).toBe("first_visit_learning");
    expect(
      selectLearnerGuide({ ...quiet, page: "plan" }, {}),
    ).toBe("first_visit_plan");
    expect(selectLearnerGuide({ ...quiet, page: "dashboard" }, {})).toBe(
      "welcome_dashboard",
    );
  });

  it("dismissed et completed bloquent l’auto-affichage", () => {
    expect(isGuideAutoBlocked(closed("welcome_dashboard", "dismiss"))).toBe(
      true,
    );
    expect(isGuideAutoBlocked(closed("welcome_dashboard", "complete"))).toBe(
      true,
    );
    expect(isGuideAutoBlocked(shownOnly("welcome_dashboard"))).toBe(false);
    expect(
      selectLearnerGuide(ctx(), {
        welcome_dashboard: closed("welcome_dashboard", "complete"),
      }),
    ).toBeNull();
    expect(
      selectLearnerGuide(ctx(), {
        welcome_dashboard: shownOnly("welcome_dashboard"),
      }),
    ).toBe("welcome_dashboard");
  });

  it("popup estimation bloque les autres auto-guides", () => {
    const states = { welcome_dashboard: closed("welcome_dashboard") };
    expect(
      selectLearnerAutoPopup({
        ctx: allSituational,
        states,
        estimationEligible: true,
        estimationSeenThisSession: false,
      }),
    ).toEqual({ kind: "estimation" });
    expect(
      selectLearnerAutoPopup({
        ctx: allSituational,
        states,
        estimationEligible: true,
        estimationSeenThisSession: true,
      }),
    ).toEqual({ kind: "guide", key: "missing_exam_date" });
  });

  it("welcome bat l’estimation", () => {
    expect(
      selectLearnerAutoPopup({
        ctx: allSituational,
        states: {},
        estimationEligible: true,
        estimationSeenThisSession: false,
      }),
    ).toEqual({ kind: "guide", key: "welcome_dashboard" });
  });

  it("copy guides sans LearnWorlds", () => {
    for (const key of LEARNER_GUIDE_KEYS) {
      const copy = LEARNER_GUIDE_COPY[key];
      expect(`${copy.title} ${copy.body} ${copy.ctaLabel}`).not.toMatch(
        /LearnWorlds/i,
      );
    }
  });
});

describe("isolation student A / B", () => {
  it("studentId client ignoré — session uniquement", () => {
    expect(resolveGuideStudentId(STUDENT_A, STUDENT_B)).toBe(STUDENT_A);
    expect(
      parseGuideAckBody({
        key: "welcome_dashboard",
        action: "dismiss",
        studentId: STUDENT_B,
      }),
    ).toEqual({ key: "welcome_dashboard", action: "dismiss" });
  });

  it("RLS : own rows only, pas de lecture staff, pas de delete authenticated", () => {
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20260817100000_learner_guide_states.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("learner_guide_states_select_own");
    expect(sql).toContain("learner_guide_states_insert_own");
    expect(sql).toContain("learner_guide_states_update_own");
    expect(sql).toContain("s.profile_id = auth.uid()");
    expect(sql).toContain("unique (student_id, guide_key)");
    expect(sql).not.toContain("private.is_staff()");
    expect(sql).not.toMatch(/learner_guide_states_select_staff/);
    expect(sql).not.toMatch(/for delete/i);
    expect(sql).toContain(
      "grant select, insert, update on table public.learner_guide_states to authenticated",
    );
    expect(sql).toContain(
      "grant all on table public.learner_guide_states to service_role",
    );
  });

  it("store et ack filtrent toujours par student_id de session", () => {
    const store = fs.readFileSync(
      path.join(process.cwd(), "lib/learner/guides-store.ts"),
      "utf8",
    );
    const ack = fs.readFileSync(
      path.join(process.cwd(), "app/api/me/guides/ack/route.ts"),
      "utf8",
    );
    expect(store).toMatch(/\.eq\("student_id", studentId\)/);
    expect(store).toMatch(/\.eq\("student_id", options\.studentId\)/);
    expect(ack).toContain("resolveGuideStudentId");
    expect(ack).toContain("resolveSessionStudentIdentity");
    expect(ack).not.toMatch(/body\.studentId\s*[^=]/);
  });
});
