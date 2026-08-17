import "server-only";

import { isLearnerDashboardCollecting } from "@/lib/dashboard/learner-presentation";
import { buildEstimationPopupContent } from "@/lib/dashboard/estimation-popup";
import {
  DashboardDataError,
  getStudentDashboardData,
} from "@/lib/dashboard/get-student-dashboard";
import {
  isLearnerGuideKey,
  learnerGuideContent,
  selectLearnerAutoPopup,
  type LearnerGuideKey,
  type LearnerGuidePage,
  type LearnerGuideState,
} from "@/lib/learner/guides";
import { resolveSessionStudentIdentity } from "@/lib/planning/work-plan/load-own";
import { createClient } from "@/lib/supabase/server";
import type { PredictionDataIssue } from "@/types/prediction";

type GuideRow = {
  guide_key: string;
  shown_at: string | null;
  dismissed_at: string | null;
  completed_at: string | null;
};

function mapState(row: GuideRow): LearnerGuideState {
  return {
    key: row.guide_key,
    shownAt: row.shown_at,
    dismissedAt: row.dismissed_at,
    completedAt: row.completed_at,
  };
}

export async function listOwnGuideStates(
  studentId: string,
): Promise<Record<string, LearnerGuideState>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learner_guide_states")
    .select("guide_key, shown_at, dismissed_at, completed_at")
    .eq("student_id", studentId);

  if (error || !data) return {};
  const states: Record<string, LearnerGuideState> = {};
  for (const row of data as GuideRow[]) {
    states[row.guide_key] = mapState(row);
  }
  return states;
}

export async function markOwnGuideShown(
  studentId: string,
  key: LearnerGuideKey,
): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("learner_guide_states")
    .select("id, shown_at")
    .eq("student_id", studentId)
    .eq("guide_key", key)
    .maybeSingle();

  if (existing?.id) {
    if (existing.shown_at) return;
    await supabase
      .from("learner_guide_states")
      .update({ shown_at: now })
      .eq("id", existing.id)
      .eq("student_id", studentId);
    return;
  }

  await supabase.from("learner_guide_states").insert({
    student_id: studentId,
    guide_key: key,
    shown_at: now,
  });
}

export async function ackOwnGuide(options: {
  studentId: string;
  key: LearnerGuideKey;
  action: "dismiss" | "complete";
}): Promise<{ ok: true } | { ok: false; error: "UNAVAILABLE" }> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const patch =
    options.action === "dismiss"
      ? { dismissed_at: now, shown_at: now }
      : { completed_at: now, shown_at: now };

  const { data: existing, error: readError } = await supabase
    .from("learner_guide_states")
    .select("id, shown_at")
    .eq("student_id", options.studentId)
    .eq("guide_key", options.key)
    .maybeSingle();

  if (readError) return { ok: false, error: "UNAVAILABLE" };

  if (existing?.id) {
    const update: Record<string, string> = {
      ...(options.action === "dismiss"
        ? { dismissed_at: now }
        : { completed_at: now }),
    };
    if (!existing.shown_at) update.shown_at = now;
    const { error } = await supabase
      .from("learner_guide_states")
      .update(update)
      .eq("id", existing.id)
      .eq("student_id", options.studentId);
    if (error) return { ok: false, error: "UNAVAILABLE" };
    return { ok: true };
  }

  const { error } = await supabase.from("learner_guide_states").insert({
    student_id: options.studentId,
    guide_key: options.key,
    ...patch,
  });
  if (error) return { ok: false, error: "UNAVAILABLE" };
  return { ok: true };
}

async function loadGuideContext(page: LearnerGuidePage) {
  try {
    const data = await getStudentDashboardData();
    return {
      page,
      targetExamDate: data.student.targetExamDate,
      issues: data.prediction.issues,
      qcmAverage: data.metrics.qcmAverage,
      inactiveDays: data.metrics.inactiveDays,
      readinessScore: data.prediction.readinessScore,
      collecting: isLearnerDashboardCollecting(data.prediction),
      estimationEligible: buildEstimationPopupContent(data.prediction).show,
    };
  } catch (err) {
    if (err instanceof DashboardDataError && err.code === "NO_METRICS") {
      const supabase = await createClient();
      const identity = await resolveSessionStudentIdentity();
      if (!identity.ok) {
        throw err;
      }
      const { data: student } = await supabase
        .from("students")
        .select("target_exam_date")
        .eq("id", identity.studentId)
        .maybeSingle();
      const targetExamDate = student?.target_exam_date ?? null;
      const issues: PredictionDataIssue[] = targetExamDate
        ? ["INCOMPLETE_METRICS"]
        : ["MISSING_TARGET_DATE", "INCOMPLETE_METRICS"];
      const prediction = {
        readinessScore: null,
        riskLevel: null,
        issues,
        recommendedAction: null,
      };
      return {
        page,
        targetExamDate,
        issues,
        qcmAverage: null,
        inactiveDays: null,
        readinessScore: null,
        collecting: true,
        estimationEligible: buildEstimationPopupContent(prediction).show,
      };
    }
    throw err;
  }
}

export async function loadOwnLearnerGuide(options: {
  page: LearnerGuidePage;
  estimationSeenThisSession: boolean;
}): Promise<
  | {
      ok: true;
      auto: "guide" | "estimation" | "none";
      guide: ReturnType<typeof learnerGuideContent> | null;
      estimationEligible: boolean;
    }
  | {
      ok: false;
      error: "UNAUTHENTICATED" | "NO_STUDENT" | "UNAVAILABLE";
    }
> {
  const identity = await resolveSessionStudentIdentity();
  if (!identity.ok) {
    return { ok: false, error: identity.reason };
  }

  try {
    const [ctx, states] = await Promise.all([
      loadGuideContext(options.page),
      listOwnGuideStates(identity.studentId),
    ]);
    const auto = selectLearnerAutoPopup({
      ctx,
      states,
      estimationEligible: ctx.estimationEligible,
      estimationSeenThisSession: options.estimationSeenThisSession,
    });

    if (auto.kind === "guide") {
      await markOwnGuideShown(identity.studentId, auto.key);
      return {
        ok: true,
        auto: "guide",
        guide: learnerGuideContent(auto.key),
        estimationEligible: ctx.estimationEligible,
      };
    }

    return {
      ok: true,
      auto: auto.kind,
      guide: null,
      estimationEligible: ctx.estimationEligible,
    };
  } catch (err) {
    if (err instanceof DashboardDataError) {
      if (err.code === "UNAUTHORIZED") {
        return { ok: false, error: "UNAUTHENTICATED" };
      }
      if (err.code === "NO_STUDENT") {
        return { ok: false, error: "NO_STUDENT" };
      }
    }
    return { ok: false, error: "UNAVAILABLE" };
  }
}
