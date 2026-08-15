import { NextResponse } from "next/server";
import {
  getLearnWorldsRosterPage,
  invalidateLearnWorldsRosterCache,
  type RosterSort,
} from "@/lib/admin/learnworlds-roster";
import {
  requirePermissionApi,
  requireLearnWorldsApi,
} from "@/lib/admin/require-admin-api";
import { canViewStudents } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const SORTS = new Set<RosterSort>([
  "name-asc",
  "name-desc",
  "date-asc",
  "date-desc",
]);

/**
 * GET /api/admin/learnworlds/users?page=1&status=ALL&q=&sort=name-asc&fresh=1
 */
export async function GET(request: Request) {
  const gate = await requirePermissionApi(
    canViewStudents,
    "Accès réservé à l’équipe WOLOYEM.",
  );
  if (!gate.ok) return gate.response;

  const lwGate = requireLearnWorldsApi();
  if (lwGate) return lwGate;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const status = searchParams.get("status") ?? "ALL";
  const q = searchParams.get("q") ?? "";
  const sortRaw = searchParams.get("sort") ?? "name-asc";
  const sort: RosterSort = SORTS.has(sortRaw as RosterSort)
    ? (sortRaw as RosterSort)
    : "name-asc";
  const fresh = searchParams.get("fresh") === "1";

  if (fresh) invalidateLearnWorldsRosterCache();

  try {
    const data = await getLearnWorldsRosterPage({
      page: Number.isFinite(page) ? page : 1,
      itemsPerPage: 10,
      statusFilter: status,
      query: q,
      sort,
    });
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur liste LearnWorlds.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
