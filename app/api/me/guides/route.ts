import { NextResponse } from "next/server";
import { loadOwnLearnerGuide } from "@/lib/learner/guides-store";
import { pageFromLearnerPathname } from "@/lib/learner/guides";

export const dynamic = "force-dynamic";

function parsePage(raw: string | null) {
  if (
    raw === "dashboard" ||
    raw === "learning" ||
    raw === "plan" ||
    raw === "other"
  ) {
    return raw;
  }
  return pageFromLearnerPathname(raw);
}

/** GET /api/me/guides?page=dashboard&estimationSeen=1 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));
  const estimationSeenThisSession =
    url.searchParams.get("estimationSeen") === "1";

  const result = await loadOwnLearnerGuide({
    page,
    estimationSeenThisSession,
  });

  if (!result.ok) {
    if (result.error === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: "Non authentifié." },
        { status: 401 },
      );
    }
    if (result.error === "NO_STUDENT") {
      return NextResponse.json(
        { ok: false, error: "Profil apprenant introuvable." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Guides temporairement indisponibles." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    auto: result.auto,
    guide: result.guide,
    estimationEligible: result.estimationEligible,
  });
}
