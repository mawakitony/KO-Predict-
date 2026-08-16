import { NextResponse } from "next/server";
import { loadOwnLearnerReminders } from "@/lib/learner/reminders";

export const dynamic = "force-dynamic";

/** GET /api/me/reminders — rappels apprenant (automatiques / coach). */
export async function GET() {
  const result = await loadOwnLearnerReminders();
  if (result.error === "UNAUTHENTICATED") {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  if (result.error === "NO_STUDENT") {
    return NextResponse.json(
      { ok: false, error: "Profil apprenant introuvable." },
      { status: 404 },
    );
  }
  if (result.error === "UNAVAILABLE") {
    return NextResponse.json(
      { ok: false, error: "Rappels temporairement indisponibles." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    reminders: result.reminders,
    unreadCount: result.unreadCount,
  });
}
