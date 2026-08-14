import "server-only";

import { listLearnWorldsUsers } from "@/lib/learnworlds/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { matchesRosterSearch } from "@/lib/admin/roster-search";
import {
  deriveAccountStatus,
  isFullyLinkedAccount,
  normalizeEmail,
} from "@/lib/admin/status";
import type {
  InvitationDbStatus,
  LearnWorldsRosterPage,
  LearnWorldsRosterRow,
} from "@/lib/admin/types";
import type { LearnWorldsUser } from "@/types/learnworlds";

interface StudentMatchRow {
  id: string;
  profile_id: string;
  learnworlds_user_id: string | null;
  profiles: {
    id: string;
    email: string | null;
    account_status?: string | null;
  } | null;
}

interface InvitationRow {
  learnworlds_user_id: string;
  email: string;
  status: InvitationDbStatus;
  error_message: string | null;
  auth_user_id: string | null;
}

const MAX_SCAN_PAGES = 45;
const SCAN_PAGE_SIZE = 100;
const SCAN_CONCURRENCY = 5;
const ROSTER_CACHE_TTL_MS = 45_000;

type RosterCacheStore = {
  users: { data: LearnWorldsUser[]; at: number } | null;
  enriched: { data: LearnWorldsRosterRow[]; at: number } | null;
};

function rosterCache(): RosterCacheStore {
  const g = globalThis as typeof globalThis & {
    __koPredictRosterCache?: RosterCacheStore;
  };
  if (!g.__koPredictRosterCache) {
    g.__koPredictRosterCache = { users: null, enriched: null };
  }
  return g.__koPredictRosterCache;
}

/** Invalide le cache roster après activation / disable. */
export function invalidateLearnWorldsRosterCache() {
  const cache = rosterCache();
  cache.users = null;
  cache.enriched = null;
}

function userSearchFields(user: LearnWorldsUser) {
  const email = normalizeEmail(user.email);
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email ||
    user.id;
  return {
    fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    tags: user.tags,
  };
}

function paginateRows(
  rows: LearnWorldsRosterRow[],
  page: number,
  itemsPerPage: number,
): LearnWorldsRosterPage {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * itemsPerPage;
  return {
    rows: rows.slice(start, start + itemsPerPage),
    page: safePage,
    itemsPerPage,
    totalItems,
    totalPages,
  };
}

async function enrichUsersToRows(
  users: LearnWorldsUser[],
): Promise<LearnWorldsRosterRow[]> {
  if (users.length === 0) return [];

  const CHUNK = 120;
  if (users.length <= CHUNK) {
    return enrichUsersToRowsChunk(users);
  }

  const chunks: LearnWorldsUser[][] = [];
  for (let i = 0; i < users.length; i += CHUNK) {
    chunks.push(users.slice(i, i + CHUNK));
  }

  // Enrichit les chunks en parallèle (limité).
  const out: LearnWorldsRosterRow[] = [];
  for (let i = 0; i < chunks.length; i += 3) {
    const batch = await Promise.all(
      chunks.slice(i, i + 3).map((chunk) => enrichUsersToRowsChunk(chunk)),
    );
    for (const rows of batch) out.push(...rows);
  }
  return out;
}

async function enrichUsersToRowsChunk(
  users: LearnWorldsUser[],
): Promise<LearnWorldsRosterRow[]> {
  if (users.length === 0) return [];

  const admin = createAdminClient();
  const lwIds = users.map((u) => u.id);
  const emails = [
    ...new Set(
      users
        .map((u) => normalizeEmail(u.email))
        .filter((e): e is string => Boolean(e)),
    ),
  ];

  const studentsByLwPromise = lwIds.length
    ? admin
        .from("students")
        .select(
          "id, profile_id, learnworlds_user_id, profiles(id, email, account_status)",
        )
        .in("learnworlds_user_id", lwIds)
    : Promise.resolve({ data: [] as StudentMatchRow[] });

  const invitationsPromise = lwIds.length
    ? admin
        .from("invitations")
        .select(
          "learnworlds_user_id, email, status, error_message, auth_user_id",
        )
        .in("learnworlds_user_id", lwIds)
    : Promise.resolve({ data: [] as InvitationRow[] });

  const [{ data: studentsByLw }, { data: invitationsRaw }] = await Promise.all([
    studentsByLwPromise,
    invitationsPromise,
  ]);

  const students: StudentMatchRow[] = [
    ...((studentsByLw ?? []) as unknown as StudentMatchRow[]),
  ];

  if (emails.length) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("email", emails);
    const profileIds = (profiles ?? []).map((p) => p.id);
    if (profileIds.length) {
      const { data } = await admin
        .from("students")
        .select(
          "id, profile_id, learnworlds_user_id, profiles(id, email, account_status)",
        )
        .in("profile_id", profileIds);
      students.push(...((data ?? []) as unknown as StudentMatchRow[]));
    }
  }

  const invitations = (invitationsRaw ?? []) as InvitationRow[];

  const studentByLwId = new Map<string, StudentMatchRow>();
  const studentByEmail = new Map<string, StudentMatchRow>();
  for (const s of students) {
    if (s.learnworlds_user_id) studentByLwId.set(s.learnworlds_user_id, s);
    const em = normalizeEmail(s.profiles?.email);
    if (em) studentByEmail.set(em, s);
  }

  const invitationByLwId = new Map(
    invitations.map((i) => [i.learnworlds_user_id, i]),
  );

  const linkFixes: Array<{ id: string; learnworldsUserId: string }> = [];
  const rows: LearnWorldsRosterRow[] = [];

  for (const user of users) {
    const email = normalizeEmail(user.email);
    let matched =
      studentByLwId.get(user.id) ??
      (email ? studentByEmail.get(email) : undefined);

    if (
      matched &&
      matched.learnworlds_user_id !== user.id &&
      email &&
      studentByEmail.get(email)?.id === matched.id
    ) {
      linkFixes.push({ id: matched.id, learnworldsUserId: user.id });
      matched = { ...matched, learnworlds_user_id: user.id };
      studentByLwId.set(user.id, matched);
    }

    const invitation = invitationByLwId.get(user.id) ?? null;

    const linked = isFullyLinkedAccount({
      authUserId: matched?.profile_id ?? invitation?.auth_user_id ?? null,
      profileId: matched?.profile_id ?? null,
      studentId: matched?.id ?? null,
      learnworldsUserIdOnStudent: matched?.learnworlds_user_id ?? null,
      expectedLearnworldsUserId: user.id,
    });

    const rawStatus = matched?.profiles?.account_status;
    const profileAccountStatus =
      rawStatus === "DISABLED" ||
      rawStatus === "PENDING_ACTIVATION" ||
      rawStatus === "ACTIVE"
        ? rawStatus
        : matched
          ? "ACTIVE"
          : null;

    const accountStatus = deriveAccountStatus({
      isFullyLinked: linked,
      invitationStatus: invitation?.status ?? null,
      profileAccountStatus,
    });

    const fields = userSearchFields(user);

    rows.push({
      learnworldsUserId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: fields.fullName,
      email: user.email,
      tags: user.tags,
      createdAt: user.createdAt,
      accountStatus,
      invitationStatus: invitation?.status ?? null,
      studentId: matched?.id ?? null,
      profileId: matched?.profile_id ?? null,
      invitationError: invitation?.error_message ?? null,
    });
  }

  // Liens LW ↔ student en arrière-plan (ne bloque pas la réponse).
  if (linkFixes.length) {
    const now = new Date().toISOString();
    void Promise.all(
      linkFixes.map((fix) =>
        admin
          .from("students")
          .update({
            learnworlds_user_id: fix.learnworldsUserId,
            updated_at: now,
          })
          .eq("id", fix.id),
      ),
    ).catch(() => undefined);
  }

  return rows;
}

async function scanAllLearnWorldsUsers(): Promise<LearnWorldsUser[]> {
  const first = await listLearnWorldsUsers({
    page: 1,
    itemsPerPage: SCAN_PAGE_SIZE,
  });

  const collected = [...first.users];
  const totalPages = Math.min(
    first.meta.totalPages ?? MAX_SCAN_PAGES,
    MAX_SCAN_PAGES,
  );

  if (first.users.length < SCAN_PAGE_SIZE || totalPages <= 1) {
    return collected;
  }

  for (let start = 2; start <= totalPages; start += SCAN_CONCURRENCY) {
    const pages = Array.from(
      { length: Math.min(SCAN_CONCURRENCY, totalPages - start + 1) },
      (_, i) => start + i,
    );
    const batch = await Promise.all(
      pages.map((pageNum) =>
        listLearnWorldsUsers({ page: pageNum, itemsPerPage: SCAN_PAGE_SIZE }),
      ),
    );
    for (const { users } of batch) {
      collected.push(...users);
      if (users.length < SCAN_PAGE_SIZE) {
        return collected;
      }
    }
  }

  return collected;
}

async function getAllUsersCached(): Promise<LearnWorldsUser[]> {
  const cache = rosterCache();
  if (
    cache.users &&
    Date.now() - cache.users.at < ROSTER_CACHE_TTL_MS
  ) {
    return cache.users.data;
  }
  const data = await scanAllLearnWorldsUsers();
  cache.users = { data, at: Date.now() };
  return data;
}

async function getAllEnrichedCached(): Promise<LearnWorldsRosterRow[]> {
  const cache = rosterCache();
  if (
    cache.enriched &&
    Date.now() - cache.enriched.at < ROSTER_CACHE_TTL_MS
  ) {
    return cache.enriched.data;
  }
  const users = await getAllUsersCached();
  const data = await enrichUsersToRows(users);
  cache.enriched = { data, at: Date.now() };
  return data;
}

export type RosterSort = "name-asc" | "name-desc" | "date-asc" | "date-desc";

function compareText(a: string, b: string) {
  return a.localeCompare(b, "fr", { sensitivity: "base" });
}

function sortUsers(users: LearnWorldsUser[], sort: RosterSort) {
  const copy = [...users];
  copy.sort((a, b) => {
    if (sort === "date-asc" || sort === "date-desc") {
      const da = a.createdAt ?? "";
      const db = b.createdAt ?? "";
      const cmp = da.localeCompare(db);
      return sort === "date-asc" ? cmp : -cmp;
    }
    const na = userSearchFields(a).fullName;
    const nb = userSearchFields(b).fullName;
    const cmp = compareText(na, nb);
    return sort === "name-asc" ? cmp : -cmp;
  });
  return copy;
}

function sortRows(rows: LearnWorldsRosterRow[], sort: RosterSort) {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "date-asc" || sort === "date-desc") {
      const da = a.createdAt ?? "";
      const db = b.createdAt ?? "";
      const cmp = da.localeCompare(db);
      return sort === "date-asc" ? cmp : -cmp;
    }
    const cmp = compareText(a.fullName, b.fullName);
    return sort === "name-asc" ? cmp : -cmp;
  });
  return copy;
}

export async function getLearnWorldsRosterPage(options: {
  page?: number;
  itemsPerPage?: number;
  statusFilter?: string;
  query?: string;
  sort?: RosterSort;
}): Promise<LearnWorldsRosterPage> {
  const page = Math.max(1, options.page ?? 1);
  const itemsPerPage = options.itemsPerPage ?? 5;
  const query = options.query?.trim() ?? "";
  const sort = options.sort ?? "name-asc";
  const statusFilter =
    options.statusFilter && options.statusFilter !== "ALL"
      ? options.statusFilter
      : null;

  // Chemin rapide : pagination native LearnWorlds (ordre API, sans scan).
  if (!query && !statusFilter && sort === "name-asc") {
    const { users, meta } = await listLearnWorldsUsers({ page, itemsPerPage });
    const rows = await enrichUsersToRows(users);
    return {
      rows,
      page: meta.page,
      itemsPerPage: meta.itemsPerPage,
      totalItems: meta.totalItems,
      totalPages: meta.totalPages,
    };
  }

  // Recherche et/ou tri personnalisé (sans filtre statut) : scan + tri, enrich page.
  if (!statusFilter) {
    const users = await getAllUsersCached();
    const matched = sortUsers(
      query
        ? users.filter((user) =>
            matchesRosterSearch(userSearchFields(user), query),
          )
        : users,
      sort,
    );
    const totalItems = matched.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * itemsPerPage;
    const slice = matched.slice(start, start + itemsPerPage);
    const rows = await enrichUsersToRows(slice);
    return {
      rows,
      page: safePage,
      itemsPerPage,
      totalItems,
      totalPages,
    };
  }

  // Filtre statut (± recherche) : roster enrichi mis en cache.
  let rows = await getAllEnrichedCached();
  if (query) {
    rows = rows.filter((r) =>
      matchesRosterSearch(
        {
          fullName: r.fullName,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          tags: r.tags,
        },
        query,
      ),
    );
  }
  rows = rows.filter((r) => r.accountStatus === statusFilter);
  rows = sortRows(rows, sort);

  return paginateRows(rows, page, itemsPerPage);
}
