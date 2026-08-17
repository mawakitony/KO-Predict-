"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminStudentFocusSync } from "@/components/admin/AdminLearnersHeaderTabs";
import { StudentCoachFollowUp } from "@/components/admin/StudentCoachFollowUp";
import { StudentLearningActivities } from "@/components/admin/learning-history/StudentLearningActivities";
import { StudentLearningQuizzes } from "@/components/admin/learning-history/StudentLearningQuizzes";
import { StudentProfileBoard } from "@/components/admin/StudentProfileBoard";
import {
  Icon3dActivities,
  Icon3dCoach,
  Icon3dOverview,
  Icon3dQuiz,
} from "@/components/learning/Learning3dIcons";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { CoachInterventionRecord } from "@/lib/admin/interventions/types";
import type { AdminStudentDetail } from "@/lib/admin/types";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import type {
  LearningAssessmentSummary,
  LearningHistoryActivity,
} from "@/types/learning-history";

type DetailTab = "overview" | "activities" | "quizzes" | "coach";

interface HistoryPayload {
  activities: LearningHistoryActivity[];
  assessments: LearningAssessmentSummary[];
  completedCount: number;
  totalCount: number;
}

export function StudentDetailTabs({
  detail,
  interventions,
  activeWorkPlan = null,
  previousWorkPlan = null,
  canManageStudents = false,
}: {
  detail: AdminStudentDetail;
  interventions: CoachInterventionRecord[];
  activeWorkPlan?: PersistedWorkPlan | null;
  previousWorkPlan?: PersistedWorkPlan | null;
  canManageStudents?: boolean;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = useCallback(
    async (fresh = false) => {
      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const qs = fresh ? "?fresh=1" : "";
        const res = await fetch(
          `/api/admin/students/${detail.student.studentId}/learning-history/activities${qs}`,
        );
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          activities?: LearningHistoryActivity[];
          assessments?: LearningAssessmentSummary[];
          completedCount?: number;
          totalCount?: number;
        } | null;
        if (!res.ok || !body?.ok) {
          setHistory(null);
          setHistoryError(
            body?.error ?? t("admin.file.historyUnavailable"),
          );
          return;
        }
        setHistory({
          activities: body.activities ?? [],
          assessments: body.assessments ?? [],
          completedCount: body.completedCount ?? 0,
          totalCount: body.totalCount ?? 0,
        });
        setHistoryLoaded(true);
      } catch {
        setHistory(null);
        setHistoryError(t("admin.file.historyUnavailable"));
      } finally {
        setLoadingHistory(false);
      }
    },
    [detail.student.studentId, t],
  );

  useEffect(() => {
    if (
      (tab === "activities" || tab === "quizzes") &&
      !historyLoaded &&
      !loadingHistory
    ) {
      void loadHistory(false);
    }
  }, [tab, historyLoaded, loadingHistory, loadHistory]);

  const tabs = useMemo(
    () =>
      [
        {
          id: "overview" as const,
          label: t("admin.file.overview"),
          Icon: Icon3dOverview,
        },
        {
          id: "activities" as const,
          label: t("admin.file.activities"),
          Icon: Icon3dActivities,
        },
        {
          id: "quizzes" as const,
          label: t("admin.file.quizzes"),
          Icon: Icon3dQuiz,
        },
        {
          id: "coach" as const,
          label: t("admin.file.coachFollow"),
          Icon: Icon3dCoach,
        },
      ] as const,
    [t],
  );

  return (
    <div className="ko-learn-board space-y-4 sm:space-y-5">
      <AdminStudentFocusSync
        fullName={detail.student.fullName}
        formationTitle={detail.formation.headerTitle}
      />
      <div
        className="ko-learn-toolbar"
        role="tablist"
        aria-label={t("admin.file.sections")}
      >
        <div className="ko-learn-tabs">
          {tabs.map((item) => {
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`ko-learn-tab${tab === item.id ? " is-active" : ""}`}
              >
                <Icon className="ko-learn-3d is-xs" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "overview" ? (
        <StudentProfileBoard
          detail={detail}
          email={detail.email}
          canManageStudents={canManageStudents}
          activeWorkPlan={activeWorkPlan}
          previousWorkPlan={previousWorkPlan}
        />
      ) : null}

      {tab === "activities" ? (
        <StudentLearningActivities
          loading={loadingHistory}
          error={historyError}
          activities={history?.activities ?? []}
          completedCount={history?.completedCount ?? 0}
          totalCount={history?.totalCount ?? 0}
          onRefresh={() => void loadHistory(true)}
        />
      ) : null}

      {tab === "quizzes" ? (
        <StudentLearningQuizzes
          studentId={detail.student.studentId}
          loading={loadingHistory}
          error={historyError}
          assessments={history?.assessments ?? []}
          qcmAverage={detail.metrics.qcmAverage}
          recentQcmAverage={detail.metrics.recentQcmAverage}
          onRefresh={() => void loadHistory(true)}
        />
      ) : null}

      {tab === "coach" ? (
        <StudentCoachFollowUp interventions={interventions} />
      ) : null}
    </div>
  );
}
