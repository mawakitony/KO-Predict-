export class LearnWorldsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearnWorldsConfigError";
  }
}

/**
 * Levée tant qu'un endpoint métier n'est pas confirmé dans la doc officielle.
 * Ne pas inventer de chemins API.
 */
export class LearnWorldsEndpointPendingError extends Error {
  constructor(
    readonly operation: string,
    readonly note: string = "À confirmer avec la documentation API LearnWorlds (https://www.learnworlds.dev/).",
  ) {
    super(`[LearnWorlds] ${operation} — ${note}`);
    this.name = "LearnWorldsEndpointPendingError";
  }
}

export class LearnWorldsApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "LearnWorldsApiError";
  }
}
