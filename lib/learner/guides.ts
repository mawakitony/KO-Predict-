import { translate } from "@/lib/i18n/translate";
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
    title: translate("fr", "learner.guide.welcome_dashboard.title"),
    body: translate("fr", "learner.guide.welcome_dashboard.body"),
    ctaLabel: translate("fr", "learner.guide.welcome_dashboard.cta"),
    href: null,
  },
  missing_exam_date: {
    key: "missing_exam_date",
    title: translate("fr", "learner.guide.missing_exam_date.title"),
    body: translate("fr", "learner.guide.missing_exam_date.body"),
    ctaLabel: translate("fr", "learner.guide.missing_exam_date.cta"),
    href: LEARNER_DATES_HREF,
  },
  no_scored_qcm: {
    key: "no_scored_qcm",
    title: translate("fr", "learner.guide.no_scored_qcm.title"),
    body: translate("fr", "learner.guide.no_scored_qcm.body"),
    ctaLabel: translate("fr", "learner.guide.no_scored_qcm.cta"),
    href: "/learning",
  },
  inactivity: {
    key: "inactivity",
    title: translate("fr", "learner.guide.inactivity.title"),
    body: translate("fr", "learner.guide.inactivity.body"),
    ctaLabel: translate("fr", "learner.guide.inactivity.cta"),
    href: "/plan",
  },
  low_readiness: {
    key: "low_readiness",
    title: translate("fr", "learner.guide.low_readiness.title"),
    body: translate("fr", "learner.guide.low_readiness.body"),
    ctaLabel: translate("fr", "learner.guide.low_readiness.cta"),
    href: "/plan",
  },
  first_visit_learning: {
    key: "first_visit_learning",
    title: translate("fr", "learner.guide.first_visit_learning.title"),
    body: translate("fr", "learner.guide.first_visit_learning.body"),
    ctaLabel: translate("fr", "learner.guide.first_visit_learning.cta"),
    href: null,
  },
  first_visit_plan: {
    key: "first_visit_plan",
    title: translate("fr", "learner.guide.first_visit_plan.title"),
    body: translate("fr", "learner.guide.first_visit_plan.body"),
    ctaLabel: translate("fr", "learner.guide.first_visit_plan.cta"),
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
