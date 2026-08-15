import { NextResponse } from "next/server";
import {
  getAssessmentAttemptsForStudent,
  LearningHistoryError,
} from "@/lib/admin/learning-history/service";
import {
  requireLearnWorldsApi,
  requirePermissionApi,
} from "@/lib/admin/require-admin-api";
import { canViewStudents } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/students/[id]/learning-history/assessments/[assessmentId]/attempts?fresh=1
 * Un seul appel LW /responses pour cet assessment.
 */
export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string; assessmentId: string }>;
  },
) {
  const gate = await requirePermissionApi(
    canViewStudents,
    "Accès réservé à l’équipe WOLOYEM.",
  );
  if (!gate.ok) return gate.response;

  const lwGate = requireLearnWorldsApi();
  if (lwGate) return lwGate;

  const { id, assessmentId } = await context.params;
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";

  try {
    const result = await getAssessmentAttemptsForStudent(id, assessmentId, {
      fresh,
    });

    if (result.status === "unavailable") {
      return NextResponse.json({
        ok: true,
        unavailable: true,
        assessmentId: result.assessmentId,
        message: result.message,
        attempts: [],
      });
    }

    return NextResponse.json({
      ok: true,
      unavailable: false,
      assessmentId: result.assessmentId,
      attempts: result.attempts,
      bestGrade: result.bestGrade,
      lastGrade: result.lastGrade,
      lastSubmittedAt: result.lastSubmittedAt,
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
        error: "Détail des tentatives indisponible.",
      },
      { status: 500 },
    );
  }
}
