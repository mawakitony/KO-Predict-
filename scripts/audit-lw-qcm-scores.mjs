/**
 * Analyse scores QCM dans progress (units) pour un user LW.
 * node scripts/audit-lw-qcm-scores.mjs [userId]
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i).trim(), v];
    }),
);

const apiUrl = (env.LEARNWORLDS_API_URL || "").replace(/\/$/, "");
const restBase = apiUrl.endsWith("/admin/api")
  ? apiUrl
  : `${apiUrl}/admin/api`;
const clientId = env.LEARNWORLDS_CLIENT_ID;
const clientSecret = env.LEARNWORLDS_CLIENT_SECRET;
const staticToken = env.LEARNWORLDS_ACCESS_TOKEN || null;

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

const userId = process.argv[2] || "6a1eb332c5eeabe7cc054638";
const tok = await getToken();
const res = await fetch(`${restBase}/v2/users/${userId}/progress`, {
  headers: {
    "Lw-Client": clientId,
    Authorization: `Bearer ${tok}`,
  },
});
const body = await res.json();
if (!res.ok) {
  console.error("progress fail", res.status, body);
  process.exit(1);
}

const courses = Array.isArray(body.data) ? body.data : [];
const typeCounts = {};
const scoredUnits = [];
const assessmentLikeCompleted = [];
const completedByType = {};

for (const course of courses) {
  const sections = Array.isArray(course.progress_per_section_unit)
    ? course.progress_per_section_unit
    : [];
  for (const section of sections) {
    const units = Array.isArray(section.units) ? section.units : [];
    for (const u of units) {
      const t = u.unit_type || "unknown";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
      if (u.unit_status === "completed") {
        completedByType[t] = (completedByType[t] || 0) + 1;
      }
      const score = u.score_on_unit;
      const isAssessmentLike =
        /assessment|quiz|exam|test|pbq|question|survey|scorm|ebookInteractive/i.test(
          String(t),
        ) ||
        /qcm|quiz|examen|assessment|test|évaluation/i.test(
          String(u.unit_name || ""),
        );

      if (score != null && Number.isFinite(Number(score))) {
        scoredUnits.push({
          courseId: course.course_id,
          unitId: u.unit_id,
          unitName: u.unit_name,
          unitType: t,
          unitStatus: u.unit_status,
          scoreOnUnit: Number(score),
          progress: u.unit_progress_rate,
        });
      }

      if (isAssessmentLike && u.unit_status === "completed") {
        assessmentLikeCompleted.push({
          courseId: course.course_id,
          unitId: u.unit_id,
          unitName: u.unit_name,
          unitType: t,
          scoreOnUnit: score,
        });
      }
    }
  }
}

console.log(
  JSON.stringify(
    {
      userId,
      courses: courses.map((c) => ({
        course_id: c.course_id,
        status: c.status,
        progress_rate: c.progress_rate,
        average_score_rate: c.average_score_rate,
        completed_units: c.completed_units,
        total_units: c.total_units,
        time_on_course_sec: c.time_on_course,
      })),
      unitTypeCounts: typeCounts,
      completedByType,
      scoredUnitsCount: scoredUnits.length,
      scoredUnitsSample: scoredUnits.slice(0, 30),
      assessmentLikeCompletedCount: assessmentLikeCompleted.length,
      assessmentLikeCompletedSample: assessmentLikeCompleted.slice(0, 40),
      averageOfScored:
        scoredUnits.length === 0
          ? null
          : scoredUnits.reduce((s, u) => s + u.scoreOnUnit, 0) /
            scoredUnits.length,
    },
    null,
    2,
  ),
);
