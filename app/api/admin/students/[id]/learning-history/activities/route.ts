import { NextResponse } from "next/server";
import {
  getLearnerLearningHistory,
  LearningHistoryError,
} from "@/lib/admin/learning-history/service";
import {
  requireLearnWorldsApi,
  requirePermissionApi,
} from "@/lib/admin/require-admin-api";
import { canViewStudents } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/students/[id]/learning-history/activities?fresh=1
 * Un seul appel LW /progress (cache TTL 10 min).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requirePermissionApi(
    canViewStudents,
    "Accès réservé à l’équipe WOLOYEM.",
  );
  if (!gate.ok) return gate.response;

  const lwGate = requireLearnWorldsApi();
  if (lwGate) return lwGate;

  const { id } = await context.params;
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";

  try {
    const history = await getLearnerLearningHistory(id, { fresh });
    return NextResponse.json({
      ok: true,
      learnworldsUserId: history.learnworldsUserId,
      activities: history.activities,
      assessments: history.assessments,
      completedCount: history.completedCount,
      totalCount: history.totalCount,
    });
  } catch (error) {
    if (error instanceof LearningHistoryError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "Historique temporairement indisponible.",
      },
      { status: 500 },
    );
  }
}
