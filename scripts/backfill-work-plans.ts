/**
 * One-shot (NE PAS lancer sans validation produit) :
 * génère un plan ACTIVE pour chaque student ayant déjà metrics + prediction,
 * sans appeler LearnWorlds.
 *
 * Usage (après validation) :
 *   npx tsx scripts/backfill-work-plans.ts
 *   npx tsx scripts/backfill-work-plans.ts --dry-run
 */
import fs from "node:fs";
import "./shim-server-only.cjs";

type SkipReason =
  | "already_has_active_plan"
  | "missing_metrics"
  | "missing_prediction"
  | "missing_metrics_and_prediction"
  | "build_error";

async function main() {
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }

  const dryRun = process.argv.includes("--dry-run");
  const { createAdminClient } = await import("../lib/supabase/admin.ts");
  const { workPlanInputFromPredictionAndMetrics } = await import(
    "../lib/planning/work-plan/from-sync.ts"
  );
  const { getActiveWorkPlan, createActiveWorkPlan } = await import(
    "../lib/planning/work-plan/persistence.ts"
  );
  const { buildWorkPlanDraft } = await import(
    "../lib/planning/work-plan/build.ts"
  );
  const { calculatePrediction } = await import(
    "../lib/prediction/engine.ts"
  );

  const db = createAdminClient();
  const { data: students, error } = await db
    .from("students")
    .select("id, target_exam_date");
  if (error) throw error;

  const skipReasons: Record<SkipReason, number> = {
    already_has_active_plan: 0,
    missing_metrics: 0,
    missing_prediction: 0,
    missing_metrics_and_prediction: 0,
    build_error: 0,
  };
  const skipSamples: Partial<Record<SkipReason, string[]>> = {};
  const errors: Array<{ studentId: string; message: string }> = [];

  let totalStudents = 0;
  let withoutActivePlan = 0;
  let eligible = 0;
  let wouldCreate = 0;
  let created = 0;
  const byType = {
    STARTUP: 0,
    CATCH_UP: 0,
    CONSOLIDATION: 0,
  };

  function noteSkip(reason: SkipReason, studentId: string) {
    skipReasons[reason] += 1;
    const samples = skipSamples[reason] ?? [];
    if (samples.length < 5) {
      samples.push(studentId);
      skipSamples[reason] = samples;
    }
  }

  for (const s of students ?? []) {
    totalStudents += 1;

    let active;
    try {
      active = await getActiveWorkPlan(s.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ studentId: s.id, message: `getActive: ${message}` });
      noteSkip("build_error", s.id);
      continue;
    }

    if (active) {
      noteSkip("already_has_active_plan", s.id);
      continue;
    }

    withoutActivePlan += 1;

    const { data: metrics, error: metricsError } = await db
      .from("learning_metrics")
      .select(
        "completed_activities, total_activities, progress_percent, qcm_average, recent_qcm_average, inactive_days, last_activity_date",
      )
      .eq("student_id", s.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (metricsError) {
      errors.push({
        studentId: s.id,
        message: `metrics: ${metricsError.message}`,
      });
      noteSkip("build_error", s.id);
      continue;
    }

    const { data: pred, error: predError } = await db
      .from("predictions")
      .select("*")
      .eq("student_id", s.id)
      .maybeSingle();

    if (predError) {
      errors.push({
        studentId: s.id,
        message: `prediction: ${predError.message}`,
      });
      noteSkip("build_error", s.id);
      continue;
    }

    if (!metrics && !pred) {
      noteSkip("missing_metrics_and_prediction", s.id);
      continue;
    }
    if (!metrics) {
      noteSkip("missing_metrics", s.id);
      continue;
    }
    if (!pred) {
      noteSkip("missing_prediction", s.id);
      continue;
    }

    try {
      const prediction = calculatePrediction({
        completedActivities: metrics.completed_activities,
        totalActivities: Math.max(metrics.total_activities, 1),
        progressPercent:
          metrics.progress_percent == null
            ? null
            : Number(metrics.progress_percent),
        qcmAverage:
          metrics.qcm_average == null ? null : Number(metrics.qcm_average),
        recentQcmAverage:
          metrics.recent_qcm_average == null
            ? null
            : Number(metrics.recent_qcm_average),
        inactiveDays: metrics.inactive_days ?? 0,
        targetExamDate: s.target_exam_date,
        currentPace:
          pred.current_pace == null ? null : Number(pred.current_pace),
      });

      const input = workPlanInputFromPredictionAndMetrics({
        prediction,
        completedActivities: metrics.completed_activities,
        inactiveDays: metrics.inactive_days ?? 0,
        qcmAverage:
          metrics.qcm_average == null ? null : Number(metrics.qcm_average),
        targetExamDate: s.target_exam_date,
      });

      const draft = buildWorkPlanDraft(input);
      eligible += 1;
      wouldCreate += 1;
      byType[draft.planType] += 1;

      if (dryRun) {
        console.log(
          JSON.stringify({
            mode: "dry-run",
            studentId: s.id,
            planType: draft.planType,
            paceStatus: prediction.paceStatus,
            weeklyStatus: draft.snapshot.weeklyStatusStart,
          }),
        );
        continue;
      }

      await createActiveWorkPlan(s.id, input);
      created += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ studentId: s.id, message });
      noteSkip("build_error", s.id);
    }
  }

  const summary = {
    dryRun,
    dbWrites: dryRun ? 0 : created,
    totalStudents,
    withoutActivePlan,
    eligibleWouldReceivePlan: eligible,
    wouldCreateByType: byType,
    ignored: {
      total: Object.values(skipReasons).reduce((a, b) => a + b, 0),
      byReason: skipReasons,
      samples: skipSamples,
    },
    potentialErrors: {
      count: errors.length,
      items: errors.slice(0, 20),
    },
    note: dryRun
      ? "Aucun INSERT/UPDATE en base (dry-run)."
      : "Plans ACTIVE créés pour les éligibles.",
  };

  console.log("--- SUMMARY ---");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
