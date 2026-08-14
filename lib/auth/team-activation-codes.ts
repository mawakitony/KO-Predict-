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

export interface IssuedTeamActivationCode {
  codePlaintext: string;
  expiresAt: string;
  activationCodeId: string;
}

async function revokePendingTeamCodes(profileId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("team_activation_codes")
    .update({
      status: "REVOKED",
      updated_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId)
    .eq("status", "PENDING");
}

/**
 * Invalide les PENDING existants, crée un nouveau code équipe.
 * Retourne le clair **une seule fois** — ne jamais logger.
 */
export async function issueTeamActivationCode(options: {
  profileId: string;
  authUserId: string;
  email: string;
  createdBy?: string | null;
}): Promise<IssuedTeamActivationCode> {
  const email = normalizeEmail(options.email);
  if (!email) throw new Error("Email invalide pour le code d’activation.");

  await revokePendingTeamCodes(options.profileId);

  const plaintext = generateActivationCodePlaintext();
  const codeHash = hashActivationCode(plaintext);
  const expiresAt = new Date(
    Date.now() + ACTIVATION_CODE_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_activation_codes")
    .insert({
      profile_id: options.profileId,
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
      `Team activation code insert: ${error?.message ?? "inconnu"}`,
    );
  }

  await recordAccessAudit({
    eventType: "team_activation_created",
    authUserId: options.authUserId,
    actorId: options.createdBy ?? null,
    meta: { expires_at: expiresAt, profile_id: options.profileId },
  });

  return {
    codePlaintext: plaintext,
    expiresAt,
    activationCodeId: data.id,
  };
}

export type VerifyTeamActivationResult =
  | {
      ok: true;
      activationCodeId: string;
      authUserId: string;
      profileId: string;
      email: string;
    }
  | { ok: false; reason: "generic" | "expired" };

export async function verifyTeamActivationEmailAndCode(options: {
  email: string;
  activationCode: string;
}): Promise<VerifyTeamActivationResult> {
  const email = normalizeEmail(options.email);
  if (!email || !options.activationCode?.trim()) {
    return { ok: false, reason: "generic" };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, account_status, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (!profile || profile.account_status !== "PENDING_ACTIVATION") {
    return { ok: false, reason: "generic" };
  }

  if (
    profile.role !== "coach" &&
    profile.role !== "admin" &&
    profile.role !== "super_admin"
  ) {
    return { ok: false, reason: "generic" };
  }

  const { data: codeRow } = await admin
    .from("team_activation_codes")
    .select(
      "id, auth_user_id, code_hash, status, expires_at, attempt_count, locked_until, email",
    )
    .eq("profile_id", profile.id)
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
      .from("team_activation_codes")
      .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
      .eq("id", codeRow.id);
    await recordAccessAudit({
      eventType: "team_activation_expired",
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
    await admin
      .from("team_activation_codes")
      .update(patch)
      .eq("id", codeRow.id);
    return { ok: false, reason: "generic" };
  }

  return {
    ok: true,
    activationCodeId: codeRow.id,
    authUserId: codeRow.auth_user_id ?? profile.id,
    profileId: profile.id,
    email,
  };
}

export async function markTeamActivationCodeUsed(options: {
  activationCodeId: string;
  profileId: string;
  authUserId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("team_activation_codes")
    .update({
      status: "USED",
      used_at: now,
      updated_at: now,
    })
    .eq("id", options.activationCodeId)
    .eq("status", "PENDING");

  await admin
    .from("team_activation_codes")
    .update({ status: "REVOKED", updated_at: now })
    .eq("profile_id", options.profileId)
    .eq("status", "PENDING")
    .neq("id", options.activationCodeId);

  await recordAccessAudit({
    eventType: "team_activation_used",
    authUserId: options.authUserId,
    meta: {
      activation_code_id: options.activationCodeId,
      profile_id: options.profileId,
    },
  });
}
