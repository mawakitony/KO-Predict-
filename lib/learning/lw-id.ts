import { LEARNER_DATA_UNAVAILABLE_MESSAGE } from "@/lib/learner/copy";

/**
 * Heuristique locale : IDs LearnWorlds réels observés = 24 hex (ObjectId-like).
 * Les placeholders seed (ex. lw_tony_test_demo) sont rejetés avant l’appel LW.
 */
export function isManifestlyInvalidLearnWorldsUserId(
  id: string | null | undefined,
): boolean {
  const trimmed = id?.trim() ?? "";
  if (!trimmed) return true;
  return !/^[a-f0-9]{24}$/i.test(trimmed);
}

export const LEARNER_HISTORY_UNAVAILABLE_MESSAGE =
  "Historique pédagogique indisponible pour ce compte.";

export const LEARNER_HISTORY_TEMPORARY_MESSAGE =
  LEARNER_DATA_UNAVAILABLE_MESSAGE;

/** Interprète une réponse activities pour l’UI apprenant. */
export function interpretActivitiesResponse(input: {
  httpOk: boolean;
  body: {
    ok?: boolean;
    message?: string;
    error?: string;
    code?: string;
    activities?: unknown;
    assessments?: unknown;
  } | null;
}): {
  ok: boolean;
  error: string | null;
  code: string | null;
} {
  if (!input.body) {
    return {
      ok: false,
      error: LEARNER_HISTORY_TEMPORARY_MESSAGE,
      code: "INVALID_JSON",
    };
  }
  if (!input.httpOk || !input.body.ok) {
    const code = input.body.code ?? "UNAVAILABLE";
    const error =
      input.body.message ??
      input.body.error ??
      (code === "INVALID_LW_ID" || code === "NO_LW_ID"
        ? LEARNER_HISTORY_UNAVAILABLE_MESSAGE
        : LEARNER_HISTORY_TEMPORARY_MESSAGE);
    return { ok: false, error, code };
  }
  return { ok: true, error: null, code: null };
}

/** Le fetch auto ne doit jamais se relancer après une première tentative. */
export function shouldAutoFetchOnMount(hasAttempted: boolean): boolean {
  return !hasAttempted;
}
