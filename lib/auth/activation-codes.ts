import "server-only";

import {
  ACTIVATION_CODE_LOCK_MINUTES,
  ACTIVATION_CODE_MAX_ATTEMPTS,
  ACTIVATION_CODE_TTL_HOURS,
} from "@/lib/auth/activation-constants";
import {
  activationCodesMatch,
  generateActivationCodePlaintext,
  hashActivationCode,
} from "@/lib/auth/activation-code-crypto";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { normalizeEmail } from "@/lib/admin/status";
import { createAdminClient } from "@/lib/supabase/admin";

export interface IssuedActivationCode {
  codePlaintext: string;
  expiresAt: string;
  activationCodeId: string;
}

async function revokePendingCodes(studentId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("activation_codes")
    .update({
      status: "REVOKED",
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", studentId)
    .eq("status", "PENDING");
}

/**
 * Invalide les PENDING existants, crée un nouveau code.
 * Retourne le clair **une seule fois** — ne jamais logger.
 */
export async function issueActivationCode(options: {
  studentId: string;
  authUserId: string;
  email: string;
  createdBy?: string | null;
  auditEvent?: "activation_created" | "activation_code_regenerated";
}): Promise<IssuedActivationCode> {
  const email = normalizeEmail(options.email);
  if (!email) throw new Error("Email invalide pour le code d’activation.");

  await revokePendingCodes(options.studentId);

  const plaintext = generateActivationCodePlaintext();
  const codeHash = hashActivationCode(plaintext);
  const expiresAt = new Date(
    Date.now() + ACTIVATION_CODE_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("activation_codes")
    .insert({
      student_id: options.studentId,
      auth_user_id: options.authUserId,
      email,
      code_hash: codeHash,
      status: "PENDING",
      expires_at: expiresAt,
      attempt_count: 0,
      locked_until: null,
      created_by: options.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Activation code insert: ${error?.message ?? "inconnu"}`,
    );
  }

  await recordAccessAudit({
    eventType: options.auditEvent ?? "activation_created",
    studentId: options.studentId,
    authUserId: options.authUserId,
    actorId: options.createdBy ?? null,
    meta: { expires_at: expiresAt },
  });

  return {
    codePlaintext: plaintext,
    expiresAt,
    activationCodeId: data.id,
  };
}

export type VerifyActivationResult =
  | {
      ok: true;
      activationCodeId: string;
      authUserId: string;
      studentId: string;
      email: string;
    }
  | { ok: false; reason: "generic" | "expired" };

/**
 * Vérifie email + code. Messages d’échec non discriminants sauf expiration.
 */
export async function verifyActivationEmailAndCode(options: {
  email: string;
  activationCode: string;
}): Promise<VerifyActivationResult> {
  const email = normalizeEmail(options.email);
  if (!email || !options.activationCode?.trim()) {
    return { ok: false, reason: "generic" };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, account_status, email")
    .ilike("email", email)
    .maybeSingle();

  if (!profile || profile.account_status !== "PENDING_ACTIVATION") {
    return { ok: false, reason: "generic" };
  }

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!student) {
    return { ok: false, reason: "generic" };
  }

  const { data: codeRow } = await admin
    .from("activation_codes")
    .select(
      "id, auth_user_id, code_hash, status, expires_at, attempt_count, locked_until, email",
    )
    .eq("student_id", student.id)
    .eq("status", "PENDING")
    .maybeSingle();

  if (!codeRow) {
    return { ok: false, reason: "generic" };
  }

  const now = Date.now();
  if (codeRow.locked_until && new Date(codeRow.locked_until).getTime() > now) {
    return { ok: false, reason: "generic" };
  }

  if (new Date(codeRow.expires_at).getTime() <= now) {
    await admin
      .from("activation_codes")
      .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
      .eq("id", codeRow.id);
    await recordAccessAudit({
      eventType: "activation_expired",
      studentId: student.id,
      authUserId: profile.id,
      meta: { activation_code_id: codeRow.id },
    });
    return { ok: false, reason: "expired" };
  }

  const match = activationCodesMatch(options.activationCode, codeRow.code_hash);
  if (!match) {
    const nextAttempts = (codeRow.attempt_count ?? 0) + 1;
    const patch: Record<string, unknown> = {
      attempt_count: nextAttempts,
      updated_at: new Date().toISOString(),
    };
    if (nextAttempts >= ACTIVATION_CODE_MAX_ATTEMPTS) {
      patch.locked_until = new Date(
        now + ACTIVATION_CODE_LOCK_MINUTES * 60_000,
      ).toISOString();
      patch.attempt_count = 0;
    }
    await admin.from("activation_codes").update(patch).eq("id", codeRow.id);
    return { ok: false, reason: "generic" };
  }

  return {
    ok: true,
    activationCodeId: codeRow.id,
    authUserId: codeRow.auth_user_id ?? profile.id,
    studentId: student.id,
    email,
  };
}

export async function markActivationCodeUsed(options: {
  activationCodeId: string;
  studentId: string;
  authUserId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("activation_codes")
    .update({
      status: "USED",
      used_at: now,
      updated_at: now,
    })
    .eq("id", options.activationCodeId)
    .eq("status", "PENDING");

  await admin
    .from("activation_codes")
    .update({ status: "REVOKED", updated_at: now })
    .eq("student_id", options.studentId)
    .eq("status", "PENDING")
    .neq("id", options.activationCodeId);

  await recordAccessAudit({
    eventType: "activation_used",
    studentId: options.studentId,
    authUserId: options.authUserId,
    meta: { activation_code_id: options.activationCodeId },
  });
}
