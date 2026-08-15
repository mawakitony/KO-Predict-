/**
 * Helpers présentation apprenant (progression pédagogique).
 */

export function formatSyncRelativeFr(iso: string | null | undefined): string {
  if (!iso) return "Dernière synchronisation indisponible";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "Dernière synchronisation indisponible";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "Dernière synchronisation LearnWorlds : à l’instant";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Dernière synchronisation LearnWorlds : à l’instant";
  if (mins === 1) return "Dernière synchronisation LearnWorlds : il y a 1 minute";
  if (mins < 60)
    return `Dernière synchronisation LearnWorlds : il y a ${mins} minutes`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "Dernière synchronisation LearnWorlds : il y a 1 heure";
  if (hours < 48)
    return `Dernière synchronisation LearnWorlds : il y a ${hours} heures`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Dernière synchronisation LearnWorlds : il y a 1 jour";
  return `Dernière synchronisation LearnWorlds : il y a ${days} jours`;
}

export function formatPercentOrDash(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value))} %`;
}
