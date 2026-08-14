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

  const { syncActiveLearnWorldsStudents } = await import(
    "../lib/cron/sync-learnworlds.ts"
  );
  const result = await syncActiveLearnWorldsStudents({ delayMs: 300 });
  console.log(
    JSON.stringify(
      {
        processed: result.processed,
        updated: result.updated,
        unchanged: result.unchanged,
        failed: result.failed,
        durationMs: result.durationMs,
        eliane: result.results.find(
          (r) => r.learnworldsUserId === "6a1eb332c5eeabe7cc054638",
        ),
        failures: result.results
          .filter((r) => !r.ok)
          .map((r) => ({
            studentId: r.studentId,
            learnworldsUserId: r.learnworldsUserId,
            error: r.error,
          })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
