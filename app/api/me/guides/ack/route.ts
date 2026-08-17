import { NextResponse } from "next/server";
import { ackOwnGuide } from "@/lib/learner/guides-store";
import {
  parseGuideAckBody,
  resolveGuideStudentId,
} from "@/lib/learner/guides";
import { resolveSessionStudentIdentity } from "@/lib/planning/work-plan/load-own";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/guides/ack
 * Body : { key, action: "dismiss" | "complete" }
 * Identité = session uniquement (studentId client ignoré).
 */
export async function POST(request: Request) {
  const identity = await resolveSessionStudentIdentity();
  if (!identity.ok) {
    if (identity.reason === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: "Non authentifié." },
        { status: 401 },
      );
    }
    if (identity.reason === "NO_STUDENT") {
      return NextResponse.json(
        { ok: false, error: "Profil apprenant introuvable." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Impossible d'enregistrer le guide." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseGuideAckBody(body);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 },
    );
  }

  const studentId = resolveGuideStudentId(
    identity.studentId,
    body && typeof body === "object"
      ? (body as { studentId?: unknown }).studentId
      : undefined,
  );

  const result = await ackOwnGuide({
    studentId,
    key: parsed.key,
    action: parsed.action,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Impossible d'enregistrer le guide." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, key: parsed.key, action: parsed.action });
}
