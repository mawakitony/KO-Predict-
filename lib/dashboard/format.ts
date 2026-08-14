import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { PaceStatus, RiskLevel } from "@/types/prediction";

export function formatDateFr(date: string | null | undefined): string {
  if (!date) return "Donnée insuffisante";
  try {
    return format(parseISO(date), "d MMMM yyyy", { locale: fr });
  } catch {
    return "Donnée insuffisante";
  }
}

export function formatDateShortFr(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return format(parseISO(date), "d MMMM", { locale: fr });
  } catch {
    return "—";
  }
}

export function formatDateTimeFr(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return "—";
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "Donnée insuffisante";
  return `${Math.round(value)} %`;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)}`;
}

export function formatPace(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return "Pas encore assez d'activité pour calculer votre rythme.";
  }
  return `${value} activités / semaine`;
}

export function riskLabel(level: RiskLevel | null): string {
  switch (level) {
    case "GREEN":
      return "Trajectoire maîtrisée";
    case "AMBER":
      return "À surveiller";
    case "RED":
      return "Risque élevé";
    case "CRITICAL":
      return "Risque élevé";
    default:
      return "Non évalué";
  }
}

export function paceStatusLabel(status: PaceStatus | null): string {
  switch (status) {
    case "ON_TRACK":
      return "Sur la bonne trajectoire";
    case "SLIGHTLY_BEHIND":
      return "Légèrement en retard";
    case "BEHIND":
      return "En retard";
    case "AHEAD":
      return "En avance";
    case "NO_ACTIVITY":
      return "Aucune activité";
    default:
      return "Statut indisponible";
  }
}

export function riskToneClasses(level: RiskLevel | null): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (level) {
    case "GREEN":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-200",
        badge: "bg-emerald-600 text-white",
      };
    case "AMBER":
      return {
        bg: "bg-amber-50",
        text: "text-amber-900",
        border: "border-amber-200",
        badge: "bg-amber-500 text-white",
      };
    case "RED":
      return {
        bg: "bg-red-50",
        text: "text-red-800",
        border: "border-red-200",
        badge: "bg-red-600 text-white",
      };
    case "CRITICAL":
      return {
        bg: "bg-red-950/10",
        text: "text-red-950",
        border: "border-red-900/30",
        badge: "bg-red-950 text-white",
      };
    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        badge: "bg-slate-600 text-white",
      };
  }
}
