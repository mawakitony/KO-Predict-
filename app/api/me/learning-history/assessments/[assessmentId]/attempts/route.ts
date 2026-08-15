import { NextResponse } from "next/server";
import { getAssessmentAttemptsForStudent } from "@/lib/admin/learning-history/service";
import {
  learningHistoryErrorResponse,
  requireSessionStudentApi,
} from "@/lib/learning/require-session-student";
import { isLearnWorldsConfigured } from "@/lib/learnworlds/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/learning-history/assessments/[assessmentId]/attempts?fresh=1
 * Uniquement les tentatives de l’apprenant connecté.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ assessmentId: string }> },
) {
  const gate = await requireSessionStudentApi();
  if (!gate.ok) return gate.response;

  if (!isLearnWorldsConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Vos données LearnWorlds sont temporairement indisponibles.",
      },
      { status: 503 },
    );
  }

  const { assessmentId } = await context.params;
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";

  try {
    const result = await getAssessmentAttemptsForStudent(
      gate.studentId,
      assessmentId,
      { fresh },
    );

    if (result.status === "unavailable") {
      return NextResponse.json({
        ok: true,
        unavailable: true,
        assessmentId: result.assessmentId,
        message: "Détail des tentatives indisponible pour le moment.",
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
    return learningHistoryErrorResponse(error);
  }
}
