/**
 * Sync réel un apprenant (service role + LW).
 * node scripts/audit-sync-learner.mjs <lwUserIdOrEmail>
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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

const target = process.argv[2] || "6a1eb332c5eeabe7cc054638";

const { syncLearnWorldsLearner } = await import(
  pathToFileURL(
    path.join(process.cwd(), "lib/learnworlds/sync.ts"),
  ).href
).catch(async () => {
  // ts via tsx if available
  const { register } = await import("node:module");
  void register;
  throw new Error("Use npx tsx");
});

const result = await syncLearnWorldsLearner({
  learnworldsUserIdOrEmail: target,
});
console.log(JSON.stringify(result, null, 2));
