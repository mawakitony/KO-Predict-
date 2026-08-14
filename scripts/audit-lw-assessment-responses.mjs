/**
 * Probe GET /v2/assessments/{id}/responses?users=
 * node scripts/audit-lw-assessment-responses.mjs
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

const userId = "6a1eb332c5eeabe7cc054638";
const assessmentIds = [
  "69de3d8f624b7f8852035145", // scored 80 completed
  "69ea0ffc137735f60204f393", // examen 72
  "69ea0c4dfc81e4773e026837", // mini 0
];

const tok = await getToken();
for (const id of assessmentIds) {
  const pathApi = `/v2/assessments/${id}/responses?users=${userId}&items_per_page=5`;
  const res = await fetch(`${restBase}${pathApi}`, {
    headers: {
      "Lw-Client": clientId,
      Authorization: `Bearer ${tok}`,
    },
  });
  const body = await res.json().catch(() => null);
  console.log(
    JSON.stringify(
      {
        path: pathApi,
        status: res.status,
        keys: body && typeof body === "object" ? Object.keys(body) : null,
        dataLen: Array.isArray(body?.data) ? body.data.length : null,
        sample: Array.isArray(body?.data) ? body.data[0] : body,
      },
      null,
      2,
    ),
  );
}
