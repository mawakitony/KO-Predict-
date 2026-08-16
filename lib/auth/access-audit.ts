import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AccessAuditEventType =
  | "activation_created"
  | "activation_code_regenerated"
  | "activation_used"
  | "activation_expired"
  | "account_activated"
  | "account_disabled"
  | "account_reactivated"
  | "TEAM_MEMBER_CREATED"
  | "TEAM_MEMBER_DISABLED"
  | "TEAM_MEMBER_REACTIVATED"
  | "TEAM_ROLE_CHANGED"
  | "team_activation_created"
  | "team_activation_used"
  | "team_activation_expired"
  | "INTERVENTION_CONTACTED"
  | "INTERVENTION_FOLLOW_UP"
  | "INTERVENTION_RESOLVED"
  | "SUPER_ADMIN_ROLE_CHANGE_BLOCKED"
  | "STAFF_ROLE_CHANGE_BLOCKED"
  | "SUPER_ADMIN_PROMOTED"
  | "SUPER_ADMIN_PROMOTION_BLOCKED"
  | "MFA_ENROLLED"
  | "MFA_FACTOR_ADDED"
  | "MFA_FACTOR_REMOVED"
  | "LEARNWORLDS_COACH_CREATED"
  | "LEARNWORLDS_COACH_PROMOTION_BLOCKED"
  | "LEARNWORLDS_COACH_ROLE_CONFLICT"
  | "LEARNWORLDS_SUPER_ADMIN_AUTHORIZED"
  | "LEARNWORLDS_SUPER_ADMIN_AUTHORIZATION_REVOKED"
  | "PASSWORD_RECOVERY_SENT";

/** Audit minimal — jamais de mot de passe, code clair, hash, ni secrets. */
export async function recordAccessAudit(options: {
  eventType: AccessAuditEventType;
  studentId?: string | null;
  authUserId?: string | null;
  actorId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("access_audit_events").insert({
      event_type: options.eventType,
      student_id: options.studentId ?? null,
      auth_user_id: options.authUserId ?? null,
      actor_id: options.actorId ?? null,
      meta: options.meta ?? {},
    });
  } catch (error) {
    console.error(
      "[access-audit]",
      error instanceof Error ? error.message : "échec",
    );
  }
}
