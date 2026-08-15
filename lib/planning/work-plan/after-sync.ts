import "server-only";

import type { SyncLearnerResult } from "@/lib/learnworlds/sync";
import { workPlanInputFromSyncResult } from "@/lib/planning/work-plan/from-sync";
import {
  createActiveWorkPlan,
  getActiveWorkPlan,
  updateActiveWorkPlan,
  type PersistedWorkPlan,
} from "@/lib/planning/work-plan/persistence";

export type WorkPlanAfterSyncResult =
  | { ok: true; plan: PersistedWorkPlan; created: boolean }
  | { ok: false; error: string };

/**
 * Après sync réussie : crée ou met à jour le plan actif.
 * Ne throw jamais vers le caller sync (échec plan ≠ échec sync).
 */
export async function applyWorkPlanAfterSuccessfulSync(
  result: SyncLearnerResult,
): Promise<WorkPlanAfterSyncResult> {
  try {
    const input = workPlanInputFromSyncResult(result);
    const before = await getActiveWorkPlan(result.studentId);
    let plan = await updateActiveWorkPlan(result.studentId, input);

    // Si le cycle a clôturé le plan (COMPLETED anticipé) sans en créer un nouveau.
    if (plan.status !== "ACTIVE") {
      const stillActive = await getActiveWorkPlan(result.studentId);
      if (!stillActive) {
        plan = await createActiveWorkPlan(result.studentId, input);
      } else {
        plan = stillActive;
      }
    }

    return {
      ok: true,
      plan,
      created: before == null || before.id !== plan.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur plan inconnue.";
    console.error(
      "[work-plan] update après sync échoué (sync conservée)",
      {
        studentId: result.studentId,
        message,
      },
    );
    return { ok: false, error: message };
  }
}
