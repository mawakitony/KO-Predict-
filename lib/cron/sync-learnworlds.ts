import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { syncLearnWorldsLearner } from "@/lib/learnworlds/sync";
import {
  filterSyncableStudents,
  LW_SYNC_DELAY_MS,
  LW_SYNC_MAX_STUDENTS,
  sleep,
  type SyncableStudentRow,
} from "@/lib/cron/sync-learnworlds-helpers";

export interface SyncLearnWorldsCronStudentResult {
  studentId: string;
  learnworldsUserId: string;
  email: string | null;
  ok: boolean;
  changed?: boolean;
  historyWritten?: boolean;
  error?: string;
}

export interface SyncLearnWorldsCronResult {
  ok: true;
  processed: number;
  updated: number;
  unchanged: number;
  failed: number;
  durationMs: number;
  results: SyncLearnWorldsCronStudentResult[];
  calculatedAt: string;
}

/**
 * Resync LearnWorlds → metrics → prediction pour les apprenants ACTIVE uniquement.
 * Pas de roster LW complet. Pas d'appels /assessments/{id}/responses.
 */
export async function syncActiveLearnWorldsStudents(
  options: { limit?: number; delayMs?: number } = {},
): Promise<SyncLearnWorldsCronResult> {
  const started = Date.now();
  const limit = Math.min(
    options.limit ?? LW_SYNC_MAX_STUDENTS,
    LW_SYNC_MAX_STUDENTS,
  );
  const delayMs = options.delayMs ?? LW_SYNC_DELAY_MS;
  const db = createAdminClient();

  const { data, error } = await db
    .from("students")
    .select(
      "id, learnworlds_user_id, profiles!inner(email, account_status, role)",
    )
    .not("learnworlds_user_id", "is", null)
    .limit(500);

  if (error) {
    throw new Error(`Liste students sync: ${error.message}`);
  }

  const candidates: SyncableStudentRow[] = (data ?? []).map((row) => {
    const profileRaw = row.profiles as
      | { email: string | null; account_status: string; role: string }
      | { email: string | null; account_status: string; role: string }[]
      | null;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    return {
      studentId: row.id as string,
      learnworldsUserId: String(row.learnworlds_user_id),
      email: profile?.email ?? null,
      accountStatus: profile?.account_status ?? "",
      role: profile?.role ?? "",
    };
  });

  const syncable = filterSyncableStudents(candidates).slice(0, limit);
  const results: SyncLearnWorldsCronStudentResult[] = [];

  for (let i = 0; i < syncable.length; i += 1) {
    const student = syncable[i]!;
    try {
      const sync = await syncLearnWorldsLearner(
        { learnworldsUserIdOrEmail: student.learnworldsUserId },
        db,
      );
      results.push({
        studentId: sync.studentId,
        learnworldsUserId: sync.learnworldsUserId,
        email: sync.email,
        ok: true,
        changed: sync.changed,
        historyWritten: sync.historyWritten,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Échec synchronisation.";
      console.error(
        "[cron/sync-learnworlds]",
        student.studentId,
        student.learnworldsUserId,
        message,
      );
      results.push({
        studentId: student.studentId,
        learnworldsUserId: student.learnworldsUserId,
        email: student.email,
        ok: false,
        error: message,
      });
    }

    if (i < syncable.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const updated = results.filter((r) => r.ok && r.changed).length;
  const unchanged = results.filter((r) => r.ok && !r.changed).length;
  const failed = results.filter((r) => !r.ok).length;

  return {
    ok: true,
    processed: results.length,
    updated,
    unchanged,
    failed,
    durationMs: Date.now() - started,
    results,
    calculatedAt: new Date().toISOString(),
  };
}
