import { LEARNER_PLATFORM } from "@/lib/learner/copy";
import type { PredictionDataIssue } from "@/types/prediction";

export const LEARNER_GUIDE_KEYS = [
  "welcome_dashboard",
  "missing_exam_date",
  "no_scored_qcm",
  "inactivity",
  "low_readiness",
  "first_visit_learning",
  "first_visit_plan",
] as const;

export type LearnerGuideKey = (typeof LEARNER_GUIDE_KEYS)[number];

/** Une seule popup auto à la fois — ordre strict. */
export const LEARNER_GUIDE_PRIORITY: readonly LearnerGuideKey[] =
  LEARNER_GUIDE_KEYS;

export const LEARNER_DATES_ANCHOR = "learner-dates";
export const LEARNER_DATES_HREF = `/dashboard#${LEARNER_DATES_ANCHOR}`;

export type LearnerGuidePage = "dashboard" | "learning" | "plan" | "other";

export type LearnerGuideState = {
  key: string;
  shownAt: string | null;
  dismissedAt: string | null;
  completedAt: string | null;
};

export type LearnerGuideContent = {
  key: LearnerGuideKey;
  title: string;
  body: string;
  ctaLabel: string;
  href: string | null;
};

export type LearnerGuideContext = {
  page: LearnerGuidePage;
  targetExamDate: string | null;
  issues: readonly PredictionDataIssue[] | readonly string[];
  qcmAverage: number | null;
  inactiveDays: number | null;
  readinessScore: number | null;
  collecting: boolean;
};

export type LearnerAutoPopup =
  | { kind: "guide"; key: LearnerGuideKey }
  | { kind: "estimation" }
  | { kind: "none" };

export const LEARNER_GUIDE_COPY: Record<LearnerGuideKey, LearnerGuideContent> = {
  welcome_dashboard: {
    key: "welcome_dashboard",
    title: "Bienvenue dans votre espace de préparation",
    body: "KO Predict™ analyse votre progression pour vous aider à savoir où vous en êtes et sur quoi concentrer vos efforts.",
    ctaLabel: "Découvrir mon tableau de bord",
    href: null,
  },
  missing_exam_date: {
    key: "missing_exam_date",
    title: "Avez-vous déjà une date d’examen ?",
    body: "Ajouter votre date cible permet d’adapter plus précisément votre rythme de préparation.",
    ctaLabel: "Ajouter ma date",
    href: LEARNER_DATES_HREF,
  },
  no_scored_qcm: {
    key: "no_scored_qcm",
    title: "Commencez à mesurer votre niveau",
    body: `Les QCM permettent à KO Predict™ de mieux évaluer votre préparation. Réalisez quelques évaluations sur la ${LEARNER_PLATFORM} pour enrichir votre suivi.`,
    ctaLabel: "Voir mes activités",
    href: "/learning",
  },
  inactivity: {
    key: "inactivity",
    title: "Reprenez votre préparation",
    body: "Votre activité récente est faible. Reprendre quelques activités cette semaine peut vous aider à retrouver votre rythme.",
    ctaLabel: "Voir mon plan",
    href: "/plan",
  },
  low_readiness: {
    key: "low_readiness",
    title: "Votre niveau peut encore progresser",
    body: "Votre niveau actuel indique qu’un travail régulier peut améliorer votre préparation. Consultez votre plan pour savoir quoi faire cette semaine.",
    ctaLabel: "Voir mon plan",
    href: "/plan",
  },
  first_visit_learning: {
    key: "first_visit_learning",
    title: "Suivez votre activité pédagogique",
    body: "Vous pouvez ici consulter vos activités terminées, celles qu’il vous reste à faire, vos quiz et vos tentatives.",
    ctaLabel: "Compris",
    href: null,
  },
  first_visit_plan: {
    key: "first_visit_plan",
    title: "Votre plan s’adapte à votre progression",
    body: "Ce plan vous propose les actions prioritaires à réaliser sur votre cycle actuel. Il sera réévalué à partir de votre progression.",
    ctaLabel: "Compris",
    href: null,
  },
};

export function isLearnerGuideKey(value: unknown): value is LearnerGuideKey {
  return (
    typeof value === "string" &&
    (LEARNER_GUIDE_KEYS as readonly string[]).includes(value)
  );
}

export function pageFromLearnerPathname(pathname: string | null): LearnerGuidePage {
  if (!pathname) return "other";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "dashboard";
  }
  if (pathname === "/learning" || pathname.startsWith("/learning/")) {
    return "learning";
  }
  if (pathname === "/plan" || pathname.startsWith("/plan/")) {
    return "plan";
  }
  return "other";
}

export function isGuideAutoBlocked(
  state: LearnerGuideState | null | undefined,
): boolean {
  return Boolean(state?.dismissedAt || state?.completedAt);
}

function hasIssue(
  issues: LearnerGuideContext["issues"],
  code: PredictionDataIssue,
): boolean {
  return issues.some((issue) => issue === code);
}

export function isLearnerGuideEligible(
  key: LearnerGuideKey,
  ctx: LearnerGuideContext,
  states: Record<string, LearnerGuideState | undefined>,
): boolean {
  const state = states[key];
  if (isGuideAutoBlocked(state)) return false;

  switch (key) {
    case "welcome_dashboard":
      return ctx.page === "dashboard";
    case "missing_exam_date":
      return (
        ctx.targetExamDate == null ||
        String(ctx.targetExamDate).trim() === "" ||
        hasIssue(ctx.issues, "MISSING_TARGET_DATE")
      );
    case "no_scored_qcm":
      return hasIssue(ctx.issues, "INSUFFICIENT_QCM") || ctx.qcmAverage == null;
    case "inactivity":
      return ctx.inactiveDays != null && ctx.inactiveDays >= 7;
    case "low_readiness":
      if (ctx.collecting) return false;
      return ctx.readinessScore != null && ctx.readinessScore < 60;
    case "first_visit_learning":
      return ctx.page === "learning";
    case "first_visit_plan":
      return ctx.page === "plan";
  }
}

export function selectLearnerGuide(
  ctx: LearnerGuideContext,
  states: Record<string, LearnerGuideState | undefined>,
): LearnerGuideKey | null {
  for (const key of LEARNER_GUIDE_PRIORITY) {
    if (isLearnerGuideEligible(key, ctx, states)) return key;
  }
  return null;
}

/**
 * File unique : welcome d’abord, puis popup estimation s’il est éligible,
 * puis les autres guides. Une seule popup auto à la fois.
 */
export function selectLearnerAutoPopup(input: {
  ctx: LearnerGuideContext;
  states: Record<string, LearnerGuideState | undefined>;
  estimationEligible: boolean;
  estimationSeenThisSession: boolean;
}): LearnerAutoPopup {
  const { ctx, states, estimationEligible, estimationSeenThisSession } = input;
  const welcomeEligible = isLearnerGuideEligible(
    "welcome_dashboard",
    ctx,
    states,
  );
  if (welcomeEligible) {
    return { kind: "guide", key: "welcome_dashboard" };
  }
  if (estimationEligible && !estimationSeenThisSession) {
    return { kind: "estimation" };
  }
  const key = selectLearnerGuide(ctx, states);
  if (!key) return { kind: "none" };
  return { kind: "guide", key };
}

export function learnerGuideContent(key: LearnerGuideKey): LearnerGuideContent {
  return LEARNER_GUIDE_COPY[key];
}

/** L’identité student vient uniquement de la session — jamais d’un studentId client. */
export function resolveGuideStudentId(
  sessionStudentId: string,
  _clientStudentId?: unknown,
): string {
  return sessionStudentId;
}

export function parseGuideAckBody(body: unknown): {
  key: LearnerGuideKey;
  action: "dismiss" | "complete";
} | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (!isLearnerGuideKey(record.key)) return null;
  if (record.action !== "dismiss" && record.action !== "complete") return null;
  return { key: record.key, action: record.action };
}
