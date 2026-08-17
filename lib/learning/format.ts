import {
  LEARNER_LAST_SYNC_LABEL,
  LEARNER_LAST_SYNC_UNAVAILABLE,
} from "@/lib/learner/copy";

/**
 * Helpers présentation apprenant (progression pédagogique).
 */

export function formatSyncRelativeFr(iso: string | null | undefined): string {
  if (!iso) return LEARNER_LAST_SYNC_UNAVAILABLE;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return LEARNER_LAST_SYNC_UNAVAILABLE;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return `${LEARNER_LAST_SYNC_LABEL} : à l’instant`;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return `${LEARNER_LAST_SYNC_LABEL} : à l’instant`;
  if (mins === 1) return `${LEARNER_LAST_SYNC_LABEL} : il y a 1 minute`;
  if (mins < 60)
    return `${LEARNER_LAST_SYNC_LABEL} : il y a ${mins} minutes`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return `${LEARNER_LAST_SYNC_LABEL} : il y a 1 heure`;
  if (hours < 48)
    return `${LEARNER_LAST_SYNC_LABEL} : il y a ${hours} heures`;
  const days = Math.floor(hours / 24);
  if (days === 1) return `${LEARNER_LAST_SYNC_LABEL} : il y a 1 jour`;
  return `${LEARNER_LAST_SYNC_LABEL} : il y a ${days} jours`;
}

export function formatPercentOrDash(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value))} %`;
}
