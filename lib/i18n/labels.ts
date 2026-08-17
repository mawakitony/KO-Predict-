import type { KoPredictAccountStatus } from "@/lib/admin/types";
import type {
  InterventionReasonCode,
  InterventionStatus,
} from "@/lib/admin/interventions/types";
import type { LwCoachLookupEligibilityStatus } from "@/lib/admin/learnworlds-coach-ui";
import type { MessageKey } from "@/lib/i18n/translate";
import type {
  LearningActivityStatus,
  LearningActivityType,
} from "@/types/learning-history";
import type {
  WorkPlanStatus,
  WorkPlanTaskStatus,
  WorkPlanTaskType,
  WorkPlanType,
} from "@/lib/planning/work-plan/types";
import type { PaceStatus, PredictionDataIssue, RiskLevel } from "@/types/prediction";
import type { LearnerGuideKey } from "@/lib/learner/guides";
import type { UserRole } from "@/types/student";

export function accountStatusKey(
  status: string | null | undefined,
): MessageKey {
  switch (status) {
    case "ACTIVE":
      return "status.active";
    case "PENDING_ACTIVATION":
      return "status.pending";
    case "DISABLED":
      return "status.disabled";
    case "NOT_ACTIVATED":
      return "status.notActivated";
    case "ERROR":
      return "status.error";
    default:
      return "status.unknown";
  }
}

export function accountStatusTabKey(value: string): MessageKey {
  switch (value) {
    case "ACTIVE":
      return "status.activePlural";
    case "PENDING_ACTIVATION":
      return "status.pending";
    case "NOT_ACTIVATED":
      return "status.notActivatedPlural";
    case "DISABLED":
      return "status.disabledPlural";
    case "ERROR":
      return "status.errorPlural";
    default:
      return "common.all";
  }
}

export function roleKey(role: UserRole): MessageKey {
  switch (role) {
    case "student":
      return "role.student";
    case "coach":
      return "role.coach";
    case "admin":
      return "role.admin";
    case "super_admin":
      return "role.superAdmin";
    default:
      return "role.student";
  }
}

export function riskKey(level: RiskLevel | null | undefined): MessageKey {
  switch (level) {
    case "GREEN":
      return "risk.green";
    case "AMBER":
      return "risk.amber";
    case "RED":
      return "risk.red";
    case "CRITICAL":
      return "risk.critical";
    default:
      return "risk.unevaluated";
  }
}

export function paceKey(status: PaceStatus | null | undefined): MessageKey {
  switch (status) {
    case "ON_TRACK":
      return "pace.onTrack";
    case "SLIGHTLY_BEHIND":
      return "pace.slightlyBehind";
    case "BEHIND":
      return "pace.behind";
    case "AHEAD":
      return "pace.ahead";
    case "NO_ACTIVITY":
      return "pace.noActivity";
    default:
      return "pace.unavailable";
  }
}

export function planTypeKey(type: WorkPlanType): MessageKey {
  switch (type) {
    case "STARTUP":
      return "plan.type.startup";
    case "CATCH_UP":
      return "plan.type.catchUp";
    case "CONSOLIDATION":
      return "plan.type.consolidation";
    default:
      return "plan.type.startup";
  }
}

export function planStatusKey(status: WorkPlanStatus): MessageKey {
  switch (status) {
    case "ACTIVE":
      return "plan.status.active";
    case "COMPLETED":
      return "plan.status.completed";
    case "PARTIAL":
      return "plan.status.partial";
    case "EXPIRED":
      return "plan.status.expired";
    case "SUPERSEDED":
      return "plan.status.superseded";
    default:
      return "plan.status.active";
  }
}

export function planTaskStatusKey(status: WorkPlanTaskStatus): MessageKey {
  switch (status) {
    case "TODO":
      return "plan.taskStatus.todo";
    case "IN_PROGRESS":
      return "plan.taskStatus.inProgress";
    case "COMPLETED":
      return "plan.taskStatus.completed";
    case "NOT_APPLICABLE":
      return "plan.taskStatus.notApplicable";
    default:
      return "plan.taskStatus.todo";
  }
}

export function planTaskTitleKey(type: WorkPlanTaskType): MessageKey {
  switch (type) {
    case "ACTIVITIES":
      return "plan.taskTitle.activities";
    case "TARGET_DATE":
      return "plan.taskTitle.targetDate";
    case "RESUME_ACTIVITY":
      return "plan.taskTitle.resumeActivity";
    case "QCM_PRACTICE":
      return "plan.taskTitle.qcmPractice";
    case "MAINTAIN_PACE":
      return "plan.taskTitle.maintainPace";
    default:
      return "plan.taskTitle.activities";
  }
}

export function interventionStatusKey(
  status: InterventionStatus,
): MessageKey {
  switch (status) {
    case "OPEN":
      return "admin.interventions.open";
    case "CONTACTED":
      return "admin.interventions.contacted";
    case "FOLLOW_UP":
      return "admin.interventions.followUp";
    case "RESOLVED":
      return "admin.interventions.resolved";
    default:
      return "admin.interventions.open";
  }
}

export function interventionReasonKey(
  code: InterventionReasonCode,
): MessageKey {
  switch (code) {
    case "RISK_CRITICAL":
      return "admin.interventions.reasonCritical";
    case "RISK_RED":
      return "admin.interventions.reasonRed";
    case "RISK_AMBER":
      return "admin.interventions.reasonAmber";
    case "INACTIVE_7_DAYS":
      return "admin.interventions.reasonInactive";
    case "PACE_BEHIND":
      return "admin.interventions.reasonPace";
    case "EXAM_SOON":
      return "admin.interventions.reasonExamSoon";
    case "ZERO_CURRENT_PACE":
      return "admin.interventions.reasonNoPace";
    default:
      return "admin.interventions.reasonUnknown";
  }
}

export function activityTypeKey(type: LearningActivityType): MessageKey {
  switch (type) {
    case "video":
      return "admin.history.typeVideo";
    case "youtube":
      return "admin.history.typeYoutube";
    case "pdf":
      return "admin.history.typePdf";
    case "url":
      return "admin.history.typeUrl";
    case "embed":
      return "admin.history.typeEmbed";
    case "scorm":
      return "admin.history.typeScorm";
    case "assessmentV2":
      return "admin.history.typeQuiz";
    case "newSurvey":
      return "admin.history.typeSurvey";
    default:
      return "admin.history.typeOther";
  }
}

export function activityStatusKey(status: LearningActivityStatus): MessageKey {
  switch (status) {
    case "completed":
      return "admin.history.statusDone";
    case "not_completed":
      return "admin.history.statusTodo";
    default:
      return "admin.history.statusUnknown";
  }
}

export function lwCoachEligibilityKey(
  status: LwCoachLookupEligibilityStatus,
): MessageKey {
  switch (status) {
    case "ELIGIBLE_INSTRUCTOR":
      return "admin.team.lwEligible";
    case "ELIGIBLE_ADMIN_OVERRIDE":
      return "admin.team.lwAdminOverride";
    case "NOT_ELIGIBLE":
      return "admin.team.lwNotEligible";
    case "NOT_FOUND":
      return "admin.team.lwNotFound";
    default:
      return "admin.team.lwNotFound";
  }
}

export function predictionIssueKey(issue: PredictionDataIssue): MessageKey {
  switch (issue) {
    case "INSUFFICIENT_QCM":
      return "learner.issue.insufficientQcm";
    case "ZERO_CURRENT_PACE":
      return "learner.issue.zeroPace";
    case "INSUFFICIENT_ACTIVITY_FOR_PACE":
      return "learner.issue.insufficientActivity";
    case "INCOMPLETE_METRICS":
      return "learner.issue.incompleteMetrics";
    case "MISSING_TARGET_DATE":
      return "learner.issue.missingDate";
    case "TARGET_DATE_PASSED":
      return "learner.issue.targetPassed";
    case "NO_REMAINING_WORK":
      return "learner.issue.noRemainingWork";
    default:
      return "learner.issue.incompleteMetrics";
  }
}

export function learnerGuideTitleKey(key: LearnerGuideKey): MessageKey {
  switch (key) {
    case "welcome_dashboard":
      return "learner.guide.welcome_dashboard.title";
    case "missing_exam_date":
      return "learner.guide.missing_exam_date.title";
    case "no_scored_qcm":
      return "learner.guide.no_scored_qcm.title";
    case "inactivity":
      return "learner.guide.inactivity.title";
    case "low_readiness":
      return "learner.guide.low_readiness.title";
    case "first_visit_learning":
      return "learner.guide.first_visit_learning.title";
    case "first_visit_plan":
      return "learner.guide.first_visit_plan.title";
    default:
      return "learner.guide.welcome_dashboard.title";
  }
}

export function learnerGuideBodyKey(key: LearnerGuideKey): MessageKey {
  switch (key) {
    case "welcome_dashboard":
      return "learner.guide.welcome_dashboard.body";
    case "missing_exam_date":
      return "learner.guide.missing_exam_date.body";
    case "no_scored_qcm":
      return "learner.guide.no_scored_qcm.body";
    case "inactivity":
      return "learner.guide.inactivity.body";
    case "low_readiness":
      return "learner.guide.low_readiness.body";
    case "first_visit_learning":
      return "learner.guide.first_visit_learning.body";
    case "first_visit_plan":
      return "learner.guide.first_visit_plan.body";
    default:
      return "learner.guide.welcome_dashboard.body";
  }
}

export function learnerGuideCtaKey(key: LearnerGuideKey): MessageKey {
  switch (key) {
    case "welcome_dashboard":
      return "learner.guide.welcome_dashboard.cta";
    case "missing_exam_date":
      return "learner.guide.missing_exam_date.cta";
    case "no_scored_qcm":
      return "learner.guide.no_scored_qcm.cta";
    case "inactivity":
      return "learner.guide.inactivity.cta";
    case "low_readiness":
      return "learner.guide.low_readiness.cta";
    case "first_visit_learning":
      return "learner.guide.first_visit_learning.cta";
    case "first_visit_plan":
      return "learner.guide.first_visit_plan.cta";
    default:
      return "learner.guide.welcome_dashboard.cta";
  }
}

export const ACCOUNT_STATUS_CODES: readonly KoPredictAccountStatus[] = [
  "NOT_ACTIVATED",
  "PENDING_ACTIVATION",
  "ACTIVE",
  "DISABLED",
  "ERROR",
];
