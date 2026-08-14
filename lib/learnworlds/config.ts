import { LearnWorldsConfigError } from "@/lib/learnworlds/errors";

export interface LearnWorldsConfig {
  /**
   * Base API LearnWorlds.
   * Accepte :
   * - https://ecole.learnworlds.com
   * - https://ecole.learnworlds.com/admin/api
   */
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  accessToken: string | null;
  webhookSecret: string | null;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function normalizeLearnWorldsApiUrl(raw: string): string {
  return stripTrailingSlash(raw.trim());
}

export function resolveLearnWorldsTokenUrl(apiUrl: string): string {
  const base = normalizeLearnWorldsApiUrl(apiUrl);
  if (base.endsWith("/admin/api")) {
    return `${base}/oauth2/access_token`;
  }
  return `${base}/admin/api/oauth2/access_token`;
}

export function resolveLearnWorldsRestBase(apiUrl: string): string {
  const base = normalizeLearnWorldsApiUrl(apiUrl);
  if (base.endsWith("/admin/api")) {
    return base;
  }
  return `${base}/admin/api`;
}

export function getLearnWorldsConfig(): LearnWorldsConfig {
  const apiUrl = normalizeLearnWorldsApiUrl(
    process.env.LEARNWORLDS_API_URL ?? "",
  );
  const clientId = process.env.LEARNWORLDS_CLIENT_ID ?? "";
  const clientSecret = process.env.LEARNWORLDS_CLIENT_SECRET ?? "";
  const accessToken = process.env.LEARNWORLDS_ACCESS_TOKEN || null;
  const webhookSecret = process.env.LEARNWORLDS_WEBHOOK_SECRET || null;

  return {
    apiUrl,
    clientId,
    clientSecret,
    accessToken,
    webhookSecret,
  };
}

export function assertLearnWorldsConfigured(
  config: LearnWorldsConfig = getLearnWorldsConfig(),
): LearnWorldsConfig {
  if (!config.apiUrl) {
    throw new LearnWorldsConfigError(
      "LEARNWORLDS_API_URL manquant (URL de l'école LearnWorlds).",
    );
  }
  if (!config.clientId) {
    throw new LearnWorldsConfigError("LEARNWORLDS_CLIENT_ID manquant.");
  }
  if (!config.accessToken && !config.clientSecret) {
    throw new LearnWorldsConfigError(
      "Fournissez LEARNWORLDS_ACCESS_TOKEN ou LEARNWORLDS_CLIENT_SECRET.",
    );
  }
  return config;
}

export function isLearnWorldsConfigured(): boolean {
  try {
    assertLearnWorldsConfigured();
    return true;
  } catch {
    return false;
  }
}

/**
 * Chemins relatifs à .../admin/api
 * Confirmés via appels live WOLOYEM + OpenAPI community alignée sur learnworlds.dev
 */
export const LEARNWORLDS_PATHS = {
  oauthToken: "/oauth2/access_token",
  users: "/v2/users",
  userById: "/v2/users/{id}",
  userEnrollments: "/v2/users/{id}/enrollments",
  userProgress: "/v2/users/{id}/progress",
  courses: "/v2/courses",
  /**
   * Scores QCM : extraits de GET /v2/users/{id}/progress
   * (unit_type=assessmentV2, score_on_unit).
   * Endpoint dédié GET /v2/assessments/{id}/responses confirmé live
   * mais N+1 — non branché en V1 sync.
   */
  userAssessments: "/v2/assessments/{id}/responses",
  userActivity: "PENDING_CONFIRMATION",
} as const;

export function lwPath(
  template: string,
  params: Record<string, string>,
): string {
  let path = template;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`{${key}}`, encodeURIComponent(value));
  }
  return path;
}
