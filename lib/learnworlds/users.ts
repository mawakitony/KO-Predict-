import "server-only";

import {
  createLearnWorldsClient,
  type LearnWorldsClient,
} from "@/lib/learnworlds/client";
import { LEARNWORLDS_PATHS, lwPath } from "@/lib/learnworlds/config";
import { LearnWorldsApiError } from "@/lib/learnworlds/errors";
import {
  asRecord,
  asString,
  mapLearnWorldsUserRole,
  parseTargetExamDateFromCustomFields,
  unixToIso,
} from "@/lib/learnworlds/mappers";
import type { LearnWorldsUser } from "@/types/learnworlds";

function mapRawUser(raw: unknown): LearnWorldsUser {
  const row = asRecord(raw);
  const fieldsRaw = asRecord(row.fields ?? row.custom_fields ?? {});
  const customFields: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(fieldsRaw)) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      customFields[key] = value;
    } else if (value != null) {
      customFields[key] = String(value);
    }
  }

  return {
    id: String(row.id),
    email: asString(row.email),
    username: asString(row.username),
    firstName: asString(row.first_name),
    lastName: asString(row.last_name),
    tags: Array.isArray(row.tags)
      ? row.tags.map((t) => String(t)).filter(Boolean)
      : [],
    customFields,
    role: mapLearnWorldsUserRole(raw),
    createdAt: unixToIso(row.created),
    lastLoginAt: unixToIso(row.last_login),
    raw,
  };
}

export interface LearnWorldsUsersPageMeta {
  page: number;
  itemsPerPage: number;
  totalItems: number | null;
  totalPages: number | null;
}

function parseUsersMeta(
  meta: Record<string, unknown>,
  page: number,
  itemsPerPage: number,
  pageCount: number,
): LearnWorldsUsersPageMeta {
  const totalItems =
    typeof meta.totalItems === "number"
      ? meta.totalItems
      : typeof meta.total === "number"
        ? meta.total
        : null;
  const totalPages =
    typeof meta.totalPages === "number"
      ? meta.totalPages
      : totalItems != null
        ? Math.max(1, Math.ceil(totalItems / itemsPerPage))
        : pageCount < itemsPerPage
          ? page
          : null;

  return {
    page: typeof meta.page === "number" ? meta.page : page,
    itemsPerPage:
      typeof meta.itemsPerPage === "number" ? meta.itemsPerPage : itemsPerPage,
    totalItems,
    totalPages,
  };
}

/**
 * GET /v2/users/{id} — id LearnWorlds ou email.
 * Confirmé live sur école WOLOYEM.
 */
export async function getLearnWorldsUserById(
  userIdOrEmail: string,
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsUser> {
  const path = lwPath(LEARNWORLDS_PATHS.userById, { id: userIdOrEmail });
  const raw = await client.request<unknown>(path);
  return mapRawUser(raw);
}

export async function getLearnWorldsUserByEmail(
  email: string,
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsUser | null> {
  try {
    return await getLearnWorldsUserById(email, client);
  } catch (error) {
    if (error instanceof LearnWorldsApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function listLearnWorldsUsers(
  options: { page?: number; itemsPerPage?: number } = {},
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<{ users: LearnWorldsUser[]; meta: LearnWorldsUsersPageMeta }> {
  const page = options.page ?? 1;
  const itemsPerPage = options.itemsPerPage ?? 50;
  const path = `${LEARNWORLDS_PATHS.users}?page=${page}&items_per_page=${itemsPerPage}`;
  const raw = await client.request<unknown>(path);
  const body = asRecord(raw);
  const data = Array.isArray(body.data) ? body.data : [];
  const users = data.map(mapRawUser);
  return {
    users,
    meta: parseUsersMeta(asRecord(body.meta), page, itemsPerPage, users.length),
  };
}

export function extractTargetExamDate(user: LearnWorldsUser): string | null {
  return parseTargetExamDateFromCustomFields(user.customFields);
}
