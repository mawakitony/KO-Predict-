import { NextResponse } from "next/server";
import { regenerateActivationCodeForStudent } from "@/lib/admin/activate-learner";
import { invalidateLearnWorldsRosterCache } from "@/lib/admin/learnworlds-roster";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canRegenerateActivationCode } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/students/regenerate-activation-code
 * Body: { studentId: string }
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canRegenerateActivationCode,
    "Régénération réservée aux administrateurs.",
  );
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => null)) as {
    studentId?: string;
  } | null;

  const studentId = body?.studentId?.trim();
  if (!studentId) {
    return NextResponse.json(
      { ok: false, error: "studentId requis." },
      { status: 400 },
    );
  }

  const result = await regenerateActivationCodeForStudent(studentId, {
    actorId: gate.userId,
  });

  if (result.ok) invalidateLearnWorldsRosterCache();

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
