import { NextResponse } from "next/server";
import { issueStudentPasswordResetCode } from "@/lib/admin/issue-password-reset-code";
import { requirePermissionApi } from "@/lib/admin/require-admin-api";
import { canIssueStudentPasswordResetCode } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/students/issue-password-reset-code
 * Body: { studentId: string }
 * Cible : apprenant student + ACTIVE uniquement.
 * Retourne le plaintext une seule fois (réponse HTTP) — ne pas logger.
 */
export async function POST(request: Request) {
  const gate = await requirePermissionApi(
    canIssueStudentPasswordResetCode,
    "Réinitialisation réservée aux administrateurs.",
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

  const result = await issueStudentPasswordResetCode(studentId, {
    actorId: gate.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
