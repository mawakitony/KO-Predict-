import { NextResponse } from "next/server";
import { loadOwnWorkPlans } from "@/lib/planning/work-plan/load-own";
import {
  buildPreviousPlanRow,
  buildWorkPlanSummaryView,
} from "@/lib/planning/work-plan/presentation";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/work-plan
 * Identité = session uniquement (pas de studentId client).
 */
export async function GET() {
  const result = await loadOwnWorkPlans({ previousLimit: 12 });

  if (result.error === "UNAUTHENTICATED") {
    return NextResponse.json(
      { ok: false, error: "Non authentifié." },
      { status: 401 },
    );
  }
  if (result.error === "NO_STUDENT") {
    return NextResponse.json(
      { ok: false, error: "Aucun profil apprenant associé à ce compte." },
      { status: 403 },
    );
  }
  if (result.error === "UNAVAILABLE") {
    return NextResponse.json(
      {
        ok: false,
        error: "Plan temporairement indisponible.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    studentId: result.studentId,
    active: result.active
      ? {
          plan: result.active,
          summary: buildWorkPlanSummaryView(result.active),
        }
      : null,
    previous: result.previous.map((p) => ({
      plan: p,
      row: buildPreviousPlanRow(p),
    })),
  });
}
