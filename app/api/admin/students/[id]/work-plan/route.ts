import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canViewStudents } from "@/lib/auth/permissions";
import {
  getActiveWorkPlan,
  listPreviousWorkPlans,
} from "@/lib/planning/work-plan/persistence";
import {
  buildPreviousPlanRow,
  buildWorkPlanSummaryView,
} from "@/lib/planning/work-plan/presentation";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/students/[id]/work-plan
 * Lecture seule coach/admin/super_admin — aucune écriture.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requirePermissionApi(
    canViewStudents,
    "Accès réservé à l’équipe WOLOYEM.",
  );
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Apprenant introuvable." },
      { status: 404 },
    );
  }

  try {
    const [active, previous] = await Promise.all([
      getActiveWorkPlan(id),
      listPreviousWorkPlans(id, 1),
    ]);
    const previousLatest = previous[0] ?? null;

    return NextResponse.json({
      ok: true,
      studentId: id,
      active: active
        ? {
            plan: active,
            summary: buildWorkPlanSummaryView(active),
          }
        : null,
      previousLatest: previousLatest
        ? {
            plan: previousLatest,
            row: buildPreviousPlanRow(previousLatest),
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Plan temporairement indisponible." },
      { status: 503 },
    );
  }
}
