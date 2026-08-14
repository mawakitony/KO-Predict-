/**
 * Audit probe LearnWorlds — n'affiche jamais de token.
 * Usage: node scripts/audit-lw-qcm-probe.mjs
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
  if (!res.ok || !td.access_token) {
    throw new Error(`token fail ${res.status}`);
  }
  return td.access_token;
}

async function probe(tok, p) {
  const url = `${restBase}${p}`;
  const res = await fetch(url, {
    headers: {
      "Lw-Client": clientId,
      Authorization: `Bearer ${tok}`,
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const summary = { path: p, status: res.status };
  if (body && typeof body === "object") {
    summary.keys = Object.keys(body).slice(0, 30);
    if (Array.isArray(body.data)) summary.dataLen = body.data.length;
    if (body.error) summary.error = body.error;
    if (body.message) summary.message = String(body.message).slice(0, 160);
    if (body.errors) summary.errors = body.errors;
  }
  return { summary, body };
}

const userId = process.argv[2] || "6a1eb332c5eeabe7cc054638";

const tok = await getToken();

const paths = [
  `/v2/users/${userId}/progress`,
  `/v2/users/${userId}/enrollments`,
  `/v2/users/${userId}`,
  `/v2/assessments`,
  `/v2/assessments?page=1&items_per_page=20`,
  `/v2/users/${userId}/assessments`,
  `/v2/users/${userId}/assessment-responses`,
  `/v2/users/${userId}/grades`,
  `/v2/users/${userId}/gradebook`,
  `/v2/users/${userId}/quiz-scores`,
  `/v2/users/${userId}/scores`,
  `/v2/users/${userId}/activity`,
  `/v2/users/${userId}/activities`,
  `/v2/gradebook`,
  `/v2/reports/assessments`,
  `/v2/courses?page=1&items_per_page=5`,
];

const results = [];
for (const p of paths) {
  const { summary, body } = await probe(tok, p);
  results.push(summary);

  if (p.includes("/progress") && body) {
    const data = Array.isArray(body.data) ? body.data : [];
    console.log("PROGRESS_COURSES", data.length);
    const first = data[0] || null;
    if (first) {
      console.log("PROGRESS_SAMPLE_KEYS", Object.keys(first));
      console.log("PROGRESS_SAMPLE", JSON.stringify(first, null, 2).slice(0, 5000));
      for (const k of Object.keys(first)) {
        const v = first[k];
        if (Array.isArray(v) && v[0] && typeof v[0] === "object") {
          console.log("NESTED_ARRAY", k, "len", v.length, "itemKeys", Object.keys(v[0]));
          console.log("NESTED_SAMPLE", JSON.stringify(v[0], null, 2).slice(0, 2000));
        }
      }
    }
  }

  if (p.startsWith("/v2/assessments") && summary.status === 200 && body) {
    console.log("ASSESSMENTS_BODY", JSON.stringify(body, null, 2).slice(0, 4000));
  }
}

console.log("ENDPOINT_RESULTS", JSON.stringify(results, null, 2));
