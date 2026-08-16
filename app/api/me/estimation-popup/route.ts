import { NextResponse } from "next/server";
import { loadOwnEstimationPopup } from "@/lib/dashboard/load-estimation-popup";

export const dynamic = "force-dynamic";

/** GET /api/me/estimation-popup — contenu du popup « estimation indisponible ». */
export async function GET() {
  const result = await loadOwnEstimationPopup();
  if (result.error === "UNAUTHENTICATED") {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  if (result.error === "NO_STUDENT") {
    return NextResponse.json(
      { ok: false, error: "Profil apprenant introuvable." },
      { status: 404 },
    );
  }
  if (result.error === "UNAVAILABLE" || !result.content) {
    return NextResponse.json(
      { ok: false, error: "Statut temporairement indisponible." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, popup: result.content });
}
