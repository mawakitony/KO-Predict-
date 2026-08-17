import "server-only";

import { issuePasswordResetCode } from "@/lib/auth/password-reset-codes";
import { createAdminClient } from "@/lib/supabase/admin";

export type IssueStudentPasswordResetCodeResult =
  | {
      ok: true;
      resetCode: string;
      resetExpiresAt: string;
      passwordResetCodeId: string;
      fullName: string;
      email: string;
    }
  | { ok: false; error: string };

type NameProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

function unwrapProfile(
  raw: NameProfile | NameProfile[] | null | undefined,
): NameProfile | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

/**
 * Émission admin d’un code reset (ACTIVE + student uniquement).
 * Délègue à issuePasswordResetCode — ne change ni role, ni account_status,
 * ni password, ni students, ni LearnWorlds.
 */
export async function issueStudentPasswordResetCode(
  studentId: string,
  options?: { actorId?: string | null },
): Promise<IssueStudentPasswordResetCodeResult> {
  const result = await issuePasswordResetCode({
    studentId,
    createdBy: options?.actorId ?? null,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("students")
    .select("profiles(first_name, last_name, email)")
    .eq("id", studentId)
    .maybeSingle();

  const profile = unwrapProfile(
    student?.profiles as NameProfile | NameProfile[] | null,
  );
  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    result.email;

  return {
    ok: true,
    resetCode: result.issued.codePlaintext,
    resetExpiresAt: result.issued.expiresAt,
    passwordResetCodeId: result.issued.passwordResetCodeId,
    fullName,
    email: result.email,
  };
}
