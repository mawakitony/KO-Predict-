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
  const { calculatePrediction } = await import(
    "../lib/prediction/engine.ts"
  );

  const db = createAdminClient();
  const { data: students, error } = await db
    .from("students")
    .select("id, target_exam_date");
  if (error) throw error;

  let created = 0;
  let skipped = 0;

  for (const s of students ?? []) {
    const active = await getActiveWorkPlan(s.id);
    if (active) {
      skipped += 1;
      continue;
    }

    const { data: metrics } = await db
      .from("learning_metrics")
      .select(
        "completed_activities, total_activities, progress_percent, qcm_average, recent_qcm_average, inactive_days, last_activity_date",
      )
      .eq("student_id", s.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: pred } = await db
      .from("predictions")
      .select("*")
      .eq("student_id", s.id)
      .maybeSingle();

    if (!metrics || !pred) {
      skipped += 1;
      continue;
    }

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

    if (dryRun) {
      console.log("[dry-run] would create", s.id, prediction.paceStatus);
      created += 1;
      continue;
    }

    await createActiveWorkPlan(s.id, input);
    created += 1;
  }

  console.log(JSON.stringify({ dryRun, created, skipped }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
