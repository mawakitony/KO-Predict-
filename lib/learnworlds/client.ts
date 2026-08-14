import "server-only";

import {
  assertLearnWorldsConfigured,
  getLearnWorldsConfig,
  resolveLearnWorldsRestBase,
  resolveLearnWorldsTokenUrl,
  type LearnWorldsConfig,
} from "@/lib/learnworlds/config";
import {
  LearnWorldsApiError,
  LearnWorldsEndpointPendingError,
} from "@/lib/learnworlds/errors";
import type { LearnWorldsAuthToken } from "@/types/learnworlds";

/**
 * Client HTTP LearnWorlds (serveur uniquement).
 *
 * Auth documentée :
 * - Header `Lw-Client: {client_id}`
 * - Header `Authorization: Bearer {access_token}`
 * - Token via OAuth2 client_credentials
 *
 * Réf. : https://www.learnworlds.dev/docs/api/b6b6c2d4906e9-authentication
 */
type GlobalLwCache = {
  token: LearnWorldsAuthToken | null;
  client: LearnWorldsClient | null;
};

function globalLwCache(): GlobalLwCache {
  const g = globalThis as typeof globalThis & {
    __koPredictLwCache?: GlobalLwCache;
  };
  if (!g.__koPredictLwCache) {
    g.__koPredictLwCache = { token: null, client: null };
  }
  return g.__koPredictLwCache;
}

export class LearnWorldsClient {
  private readonly restBase: string;
  private readonly tokenUrl: string;

  constructor(private readonly config: LearnWorldsConfig = getLearnWorldsConfig()) {
    assertLearnWorldsConfigured(this.config);
    this.restBase = resolveLearnWorldsRestBase(this.config.apiUrl);
    this.tokenUrl = resolveLearnWorldsTokenUrl(this.config.apiUrl);
  }

  get baseUrl(): string {
    return this.restBase;
  }

  get clientId(): string {
    return this.config.clientId;
  }

  async getAccessToken(): Promise<string> {
    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    const cache = globalLwCache();
    if (
      cache.token &&
      cache.token.expiresIn &&
      Date.now() <
        new Date(cache.token.obtainedAt).getTime() +
          (cache.token.expiresIn - 60) * 1000
    ) {
      return cache.token.accessToken;
    }

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Lw-Client": this.config.clientId,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
      cache: "no-store",
    });

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new LearnWorldsApiError(
        "Échec de l'obtention du token LearnWorlds.",
        response.status,
        body,
      );
    }

    const record = body as Record<string, unknown>;
    const tokenData =
      record.tokenData && typeof record.tokenData === "object"
        ? (record.tokenData as Record<string, unknown>)
        : record;

    const accessToken = String(tokenData.access_token ?? "");
    if (!accessToken) {
      throw new LearnWorldsApiError(
        "Réponse token LearnWorlds sans access_token.",
        response.status,
        body,
      );
    }

    cache.token = {
      accessToken,
      tokenType: String(tokenData.token_type ?? "Bearer"),
      expiresIn:
        typeof tokenData.expires_in === "number"
          ? tokenData.expires_in
          : undefined,
      obtainedAt: new Date().toISOString(),
    };

    return accessToken;
  }

  async request<T = unknown>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    if (!path || path === "PENDING_CONFIRMATION") {
      throw new LearnWorldsEndpointPendingError(
        `request(${path || "empty"})`,
      );
    }

    const maxAttempts = 4;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      attempt += 1;
      const token = await this.getAccessToken();
      const url = path.startsWith("http")
        ? path
        : `${this.restBase}${path.startsWith("/") ? path : `/${path}`}`;

      const headers = new Headers(init.headers);
      headers.set("Lw-Client", this.config.clientId);
      headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(url, {
        ...init,
        headers,
        cache: "no-store",
      });

      const body: unknown = await response.json().catch(() => null);

      if (response.ok) {
        return body as T;
      }

      lastError = new LearnWorldsApiError(
        `LearnWorlds HTTP ${response.status} sur ${path}`,
        response.status,
        body,
      );

      if (response.status !== 429 || attempt >= maxAttempts) {
        throw lastError;
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader
        ? Number(retryAfterHeader)
        : NaN;
      const backoffMs = Number.isFinite(retryAfterSec)
        ? Math.max(1000, retryAfterSec * 1000)
        : 1000 * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, backoffMs));
    }

    throw lastError instanceof Error
      ? lastError
      : new LearnWorldsApiError(`LearnWorlds échec sur ${path}`);
  }
}

/** Réutilise le client (et le token) dans le process Node / serveur. */
export function createLearnWorldsClient(
  config?: LearnWorldsConfig,
): LearnWorldsClient {
  if (config) {
    return new LearnWorldsClient(config);
  }
  const cache = globalLwCache();
  if (!cache.client) {
    cache.client = new LearnWorldsClient(getLearnWorldsConfig());
  }
  return cache.client;
}
