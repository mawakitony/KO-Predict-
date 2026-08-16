import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { sendStudentPasswordRecovery } from "@/lib/admin/send-password-recovery";
import { canSendStudentPasswordRecovery } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/students/send-password-recovery
 * Body: { studentId: string }
 * Cible : apprenant ACTIVE uniquement.
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canSendStudentPasswordRecovery,
    "Récupération réservée aux administrateurs.",
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

  const result = await sendStudentPasswordRecovery(studentId, {
    actorId: gate.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
