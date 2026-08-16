import { format, isValid, parse, parseISO } from "date-fns";
import {
  LEARNWORLDS_TARGET_EXAM_FIELD_KEY,
  LW_CUSTOM_FIELD_TARGET_EXAM_DATE,
  type LearnWorldsNormalizedLearnerSnapshot,
  type LearnWorldsUser,
  type LearnWorldsUserRoleInfo,
} from "@/types/learnworlds";

export type { LearnWorldsUserRoleInfo };

/**
 * Parse la date cible depuis les custom fields LearnWorlds.
 * Clé principale (API live) : cf_ko_target_exam_date
 * Fallbacks : ko_target_exam_date, label « Target date of the exam »
 */
export function parseTargetExamDateFromCustomFields(
  customFields: Record<string, string | number | boolean | null> | null | undefined,
): string | null {
  if (!customFields) return null;

  const raw =
    customFields[LEARNWORLDS_TARGET_EXAM_FIELD_KEY] ??
    customFields[LW_CUSTOM_FIELD_TARGET_EXAM_DATE] ??
    customFields["Target date of the exam"] ??
    null;

  if (raw == null || raw === "") return null;

  const value = String(raw).trim();
  if (!value) return null;

  const iso = parseISO(value);
  if (isValid(iso) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return format(iso, "yyyy-MM-dd");
  }

  for (const pattern of ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "yyyy/MM/dd"]) {
    const parsed = parse(value, pattern, new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }

  return null;
}

/**
 * LearnWorlds = source de vérité pour `students.target_exam_date`.
 * Écrit toujours la valeur mappée (date ou null) — ne conserve jamais
 * une ancienne date Supabase si LW a vidé / omis le champ.
 */
export function resolvePersistedTargetExamDate(
  mappedTargetExamDate: string | null,
  _previousSupabaseDate?: string | null,
): string | null {
  return mappedTargetExamDate;
}

export function mapLearnWorldsUserToStudentFields(user: LearnWorldsUser): {
  learnworldsUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  targetExamDate: string | null;
} {
  return {
    learnworldsUserId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    targetExamDate: parseTargetExamDateFromCustomFields(user.customFields),
  };
}

export function emptyNormalizedSnapshot(
  userId: string,
): LearnWorldsNormalizedLearnerSnapshot {
  return {
    learnworldsUserId: userId,
    email: null,
    firstName: null,
    lastName: null,
    targetExamDate: null,
    progressPercent: null,
    completedActivities: null,
    totalActivities: null,
    studyTimeMinutes: null,
    qcmAverage: null,
    recentQcmAverage: null,
    lastActivityDate: null,
    courses: [],
  };
}

export function unixToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  // LearnWorlds envoie souvent des timestamps en secondes (parfois float).
  const ms = value > 1e12 ? value : value * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Extrait le rôle LW depuis un user brut API.
 * Éligibilité coach : se baser sur `role.level`, jamais sur `role.name` seul.
 */
export function mapLearnWorldsUserRole(raw: unknown): LearnWorldsUserRoleInfo {
  const row = asRecord(raw);
  const role = asRecord(row.role);
  return {
    level: asString(role.level),
    name: asString(role.name),
    isInstructor: row.is_instructor === true,
    isAdmin: row.is_admin === true,
  };
}
