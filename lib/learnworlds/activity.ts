import "server-only";

import {
  createLearnWorldsClient,
  type LearnWorldsClient,
} from "@/lib/learnworlds/client";
import { LEARNWORLDS_PATHS } from "@/lib/learnworlds/config";
import { LearnWorldsEndpointPendingError } from "@/lib/learnworlds/errors";
import type { LearnWorldsActivityEvent } from "@/types/learnworlds";

export {
  getLastActivityDate,
  calculateInactiveDays,
} from "@/lib/learnworlds/aggregations";

/**
 * Activité / dernière activité utilisateur.
 * À confirmer avec la documentation API LearnWorlds.
 */
export async function listUserActivity(
  userId: string,
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsActivityEvent[]> {
  void userId;
  void client;
  throw new LearnWorldsEndpointPendingError(
    "listUserActivity",
    `À confirmer avec la documentation API LearnWorlds. path=${LEARNWORLDS_PATHS.userActivity}`,
  );
}
