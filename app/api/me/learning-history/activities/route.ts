import { NextResponse } from "next/server";
import { getLearnerLearningHistory } from "@/lib/admin/learning-history/service";
import {
  learningHistoryErrorResponse,
  requireSessionStudentApi,
} from "@/lib/learning/require-session-student";
import { isLearnWorldsConfigured } from "@/lib/learnworlds/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/learning-history/activities?fresh=1
 * Identité = session uniquement (pas de studentId client).
 */
export async function GET(request: Request) {
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

  const fresh = new URL(request.url).searchParams.get("fresh") === "1";

  try {
    const history = await getLearnerLearningHistory(gate.studentId, { fresh });
    return NextResponse.json({
      ok: true,
      activities: history.activities,
      assessments: history.assessments,
      completedCount: history.completedCount,
      totalCount: history.totalCount,
    });
  } catch (error) {
    return learningHistoryErrorResponse(error);
  }
}
