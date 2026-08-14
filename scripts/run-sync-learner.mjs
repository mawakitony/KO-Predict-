/**
 * Sync QCM-aware standalone (évite server-only).
 * node scripts/run-sync-learner.mjs <lwUserId>
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const apiUrl = (process.env.LEARNWORLDS_API_URL || "").replace(/\/$/, "");
const restBase = apiUrl.endsWith("/admin/api")
  ? apiUrl
  : `${apiUrl}/admin/api`;
const clientId = process.env.LEARNWORLDS_CLIENT_ID;
const clientSecret = process.env.LEARNWORLDS_CLIENT_SECRET;
const staticToken = process.env.LEARNWORLDS_ACCESS_TOKEN || null;

async function getToken() {
  if (staticToken) return staticToken;
  const res = await fetch(`${restBase}/oauth2/access_token`, {
    method: "POST",
    headers: {
      "Lw-Client": clientId,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const body = await res.json();
  const td = body.tokenData || body;
  if (!res.ok || !td.access_token) throw new Error(`token fail ${res.status}`);
  return td.access_token;
}

async function lwGet(tok, p) {
  const res = await fetch(`${restBase}${p}`, {
    headers: {
      "Lw-Client": clientId,
      Authorization: `Bearer ${tok}`,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`LW ${res.status} ${p}`);
  return body;
}

function extractScores(progressData, userId) {
  const scores = [];
  for (const course of progressData) {
    const sections = Array.isArray(course.progress_per_section_unit)
      ? course.progress_per_section_unit
      : [];
    for (const section of sections) {
      for (const u of section.units || []) {
        if (u.unit_type !== "assessmentV2") continue;
        if (u.score_on_unit == null || u.score_on_unit === "") continue;
        const scorePercent = Number(u.score_on_unit);
        if (!Number.isFinite(scorePercent)) continue;
        scores.push(scorePercent);
      }
    }
  }
  if (scores.length === 0) return { qcmAverage: null, recentQcmAverage: null, n: 0 };
  const qcmAverage = scores.reduce((a, b) => a + b, 0) / scores.length;
  const recent = scores.slice(-5);
  const recentQcmAverage = recent.reduce((a, b) => a + b, 0) / recent.length;
  return { qcmAverage, recentQcmAverage, n: scores.length };
}

const userId = process.argv[2] || "6a1eb332c5eeabe7cc054638";
const tok = await getToken();
const user = await lwGet(tok, `/v2/users/${userId}`);
const progressBody = await lwGet(tok, `/v2/users/${userId}/progress`);
const progressData = Array.isArray(progressBody.data) ? progressBody.data : [];

let completed = 0;
let total = 0;
let studySec = 0;
for (const c of progressData) {
  completed += Number(c.completed_units || 0);
  total += Number(c.total_units || 0);
  studySec += Number(c.time_on_course || 0);
}
const progressPercent = total > 0 ? (completed / total) * 100 : null;
const qcm = extractScores(progressData, userId);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: student } = await supabase
  .from("students")
  .select("id")
  .eq("learnworlds_user_id", userId)
  .maybeSingle();

if (!student) throw new Error("student introuvable");

const { error: metricsError } = await supabase.from("learning_metrics").insert({
  student_id: student.id,
  progress_percent: progressPercent ?? 0,
  completed_activities: completed,
  total_activities: Math.max(total, 1),
  study_time_minutes: Math.round(studySec / 60),
  qcm_average: qcm.qcmAverage,
  recent_qcm_average: qcm.recentQcmAverage,
  last_activity_date: user.last_login
    ? new Date(
        (user.last_login > 1e12 ? user.last_login : user.last_login * 1000),
      ).toISOString()
    : null,
  inactive_days: 0,
  recorded_at: new Date().toISOString(),
  source: "learnworlds",
});
if (metricsError) throw new Error(metricsError.message);

// Recalcul via moteur app
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || "";
const { calculatePrediction } = await import("../lib/prediction/engine.ts").catch(
  () => ({ calculatePrediction: null }),
);

let prediction = null;
if (calculatePrediction) {
  prediction = calculatePrediction({
    completedActivities: completed,
    totalActivities: Math.max(total, 1),
    progressPercent,
    qcmAverage: qcm.qcmAverage,
    recentQcmAverage: qcm.recentQcmAverage,
    inactiveDays: 0,
    targetExamDate: "2026-09-26",
    currentPace: completed > 0 ? 4 : 0,
  });

  await supabase.from("predictions").upsert(
    {
      student_id: student.id,
      current_pace: prediction.currentPace,
      required_pace: prediction.requiredPace,
      remaining_activities: prediction.remainingActivities,
      readiness_score: prediction.readinessScore,
      readiness_probability: prediction.readinessProbability,
      predicted_completion_date: prediction.predictedCompletionDate,
      predicted_readiness_date: prediction.predictedReadinessDate,
      risk_level: prediction.riskLevel,
      recommended_action: prediction.recommendedAction,
      pace_status: prediction.paceStatus,
      calculated_at: prediction.calculatedAt,
    },
    { onConflict: "student_id" },
  );
}

console.log(
  JSON.stringify(
    {
      email: user.email,
      studentId: student.id,
      qcm,
      progressPercent,
      completed,
      total,
      studyMinutes: Math.round(studySec / 60),
      prediction: prediction
        ? {
            readinessScore: prediction.readinessScore,
            readinessProbability: prediction.readinessProbability,
            riskLevel: prediction.riskLevel,
            currentPace: prediction.currentPace,
            requiredPace: prediction.requiredPace,
            issues: prediction.issues,
            recommendedAction: prediction.recommendedAction,
          }
        : null,
    },
    null,
    2,
  ),
);
