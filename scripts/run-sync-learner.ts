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

  const { syncLearnWorldsLearner } = await import("../lib/learnworlds/sync.ts");
  const target = process.argv[2] || "6a1eb332c5eeabe7cc054638";
  const result = await syncLearnWorldsLearner({
    learnworldsUserIdOrEmail: target,
  });

  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        studentId: result.studentId,
        email: result.email,
        targetExamDate: result.targetExamDate,
        metrics: result.metrics,
        prediction: {
          readinessScore: result.prediction.readinessScore,
          readinessProbability: result.prediction.readinessProbability,
          riskLevel: result.prediction.riskLevel,
          currentPace: result.prediction.currentPace,
          requiredPace: result.prediction.requiredPace,
          recommendedAction: result.prediction.recommendedAction,
          issues: result.prediction.issues,
          paceStatus: result.prediction.paceStatus,
        },
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
