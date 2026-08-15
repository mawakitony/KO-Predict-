import Link from "next/link";
import { redirect } from "next/navigation";
import { AvailableMetricsStrip } from "@/components/dashboard/AvailableMetricsStrip";
import { CollectionExamCard } from "@/components/dashboard/CollectionExamCard";
import { CollectionHero } from "@/components/dashboard/CollectionHero";
import { LearnerHubLayout } from "@/components/dashboard/LearnerHubLayout";
import { LearnerAnalyticsPanel } from "@/components/dashboard/LearnerAnalyticsPanel";
import { LearnerGlanceCards } from "@/components/dashboard/LearnerGlanceCards";
import { LearnerProgressSummary } from "@/components/dashboard/LearnerProgressSummary";
import { LearnerStatRings } from "@/components/dashboard/LearnerStatRings";
import { LearnerDatesPanel } from "@/components/dashboard/LearnerDatesPanel";
import { PredictionHistoryNote } from "@/components/dashboard/PredictionHistoryNote";
import { RecommendationCard } from "@/components/dashboard/RecommendationCard";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { TrajectoryAlert } from "@/components/dashboard/TrajectoryAlert";
import { WorkPlanSummaryCard } from "@/components/dashboard/WorkPlanSummaryCard";
import { WhyReadinessPanel } from "@/components/dashboard/WhyReadinessPanel";
import { getCurrentProfile } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { formatDateFr } from "@/lib/dashboard/format";
import {
  getLearnerIssueExplanations,
  isLearnerDashboardCollecting,
  resolveLearnerPredictionUiState,
  resolveLearnerRecommendedAction,
} from "@/lib/dashboard/learner-presentation";
import {
  DashboardDataError,
  getStudentDashboardData,
} from "@/lib/dashboard/get-student-dashboard";
import { loadOwnWorkPlans } from "@/lib/planning/work-plan/load-own";
import { buildReadinessExplanation } from "@/lib/prediction/explanation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const showAdmin = canAccessAdmin(profile?.role);

  let data;
  try {
    data = await getStudentDashboardData();
  } catch (error) {
    const isNoStudent =
      error instanceof DashboardDataError && error.code === "NO_STUDENT";

    // Staff sans profil apprenant → vue école dans le shell admin (sidebar stable).
    if (isNoStudent && showAdmin) {
      redirect("/admin/ecole");
    }

    const message =
      error instanceof DashboardDataError
        ? error.message
        : "Impossible de charger le tableau de bord.";

    return (
      <LearnerHubLayout
        email={profile?.email}
        firstName={profile?.firstName ?? undefined}
        lastName={profile?.lastName}
        displayName={profile?.displayName}
        avatarUrl={profile?.avatarUrl}
        title="Tableau de bord indisponible"
        subtitle={message}
        showAdminLink={showAdmin}
      >
        <div className="ko-dash-card p-6">
          <p className="text-slate-600">
            Réessayez plus tard ou contactez WOLOYEM si le problème persiste.
          </p>
          {showAdmin ? (
            <Link
              href="/admin"
              className="mt-4 inline-flex font-semibold text-blue-700 hover:underline"
            >
              Aller à l&apos;administration
            </Link>
          ) : null}
        </div>
      </LearnerHubLayout>
    );
  }

  const { student, metrics, prediction, trajectory, dataSource } = data;
  const uiState = resolveLearnerPredictionUiState(prediction);
  const collecting = isLearnerDashboardCollecting(prediction);
  const issueExplanations = getLearnerIssueExplanations(prediction.issues);
  const recommendedAction = resolveLearnerRecommendedAction(prediction);
  const todayLabel = formatDateFr(new Date().toISOString().slice(0, 10));
  const { active: activeWorkPlan } = await loadOwnWorkPlans({
    previousLimit: 0,
  });
  const readinessExplanation = buildReadinessExplanation({
    readinessScore: prediction.readinessScore,
    progressPercent: prediction.progressPercent ?? metrics.progressPercent,
    qcmAverage:
      metrics.qcmAverage == null ? null : Number(metrics.qcmAverage),
    recentQcmAverage:
      metrics.recentQcmAverage == null
        ? null
        : Number(metrics.recentQcmAverage),
    inactiveDays: metrics.inactiveDays ?? 0,
    currentPace: prediction.currentPace,
    requiredPace: prediction.requiredPace,
    issues: prediction.issues,
  });

  return (
    <LearnerHubLayout
      email={profile?.email}
      firstName={profile?.firstName ?? student.firstName}
      lastName={profile?.lastName ?? student.lastName}
      displayName={profile?.displayName}
      avatarUrl={profile?.avatarUrl}
      title="Rapport de parcours"
      subtitle={`${student.certification}${
        student.targetExamDate
          ? ` · Examen le ${formatDateFr(student.targetExamDate)}`
          : ""
      }${collecting ? "" : ` · ${todayLabel}`}`}
      showAdminLink={showAdmin}
    >
      {collecting ? (
        <div className="space-y-2.5 sm:space-y-3">
          <CollectionHero explanations={issueExplanations} />

          <WhyReadinessPanel explanation={readinessExplanation} />

          <WorkPlanSummaryCard plan={activeWorkPlan} compact />

          <CollectionExamCard
            targetExamDate={student.targetExamDate}
            certification={student.certification}
          />

          <AvailableMetricsStrip
            progressPercent={
              prediction.progressPercent ?? metrics.progressPercent
            }
            completedActivities={metrics.completedActivities}
            totalActivities={metrics.totalActivities}
            studyTimeMinutes={metrics.studyTimeMinutes}
            qcmAverage={metrics.qcmAverage}
            inactiveDays={metrics.inactiveDays}
          />

          <LearnerProgressSummary
            progressPercent={
              prediction.progressPercent ?? metrics.progressPercent
            }
            completedActivities={metrics.completedActivities}
            totalActivities={metrics.totalActivities}
            qcmAverage={
              metrics.qcmAverage == null ? null : Number(metrics.qcmAverage)
            }
            recentQcmAverage={
              metrics.recentQcmAverage == null
                ? null
                : Number(metrics.recentQcmAverage)
            }
            recordedAt={metrics.recordedAt}
            collecting
          />

          <p className="px-1 pb-0.5 text-center text-[11px] leading-snug text-slate-400 sm:text-xs">
            Les analyses avancées apparaîtront automatiquement après les
            premières données exploitables.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-5">
              <LearnerGlanceCards
                readiness={prediction.readinessScore}
                probability={prediction.readinessProbability}
                progress={prediction.progressPercent}
                currentPace={prediction.currentPace}
                requiredPace={prediction.requiredPace}
              />
            </div>
            <div className="min-w-0 lg:col-span-7">
              <LearnerStatRings
                readiness={prediction.readinessScore}
                probability={prediction.readinessProbability}
                progress={prediction.progressPercent}
                currentPace={prediction.currentPace}
                requiredPace={prediction.requiredPace}
              />
            </div>
          </div>

          <WhyReadinessPanel explanation={readinessExplanation} />

          <WorkPlanSummaryCard plan={activeWorkPlan} />

          {trajectory ? (
            <TrajectoryAlert
              headline={trajectory.headline}
              paceHint={trajectory.paceHint}
              postponed={trajectory.postponed}
              advanced={trajectory.advanced}
              readinessDaysDelta={trajectory.readinessDaysDelta}
              currentPace={prediction.currentPace}
              requiredPace={prediction.requiredPace}
            />
          ) : null}

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-8">
              <LearnerAnalyticsPanel
                readiness={prediction.readinessScore}
                progress={prediction.progressPercent}
                probability={prediction.readinessProbability}
                currentPace={prediction.currentPace}
                requiredPace={prediction.requiredPace}
                studyTimeMinutes={metrics.studyTimeMinutes}
                completedActivities={metrics.completedActivities}
                totalActivities={metrics.totalActivities}
                qcmAverage={
                  metrics.qcmAverage == null
                    ? null
                    : Number(metrics.qcmAverage)
                }
                inactiveDays={metrics.inactiveDays}
                certification={student.certification}
              />
            </div>
            <div className="min-w-0 lg:col-span-4">
              <LearnerDatesPanel
                targetExamDate={student.targetExamDate}
                predictedCompletionDate={prediction.predictedCompletionDate}
                predictedReadinessDate={prediction.predictedReadinessDate}
                updatedAt={metrics.recordedAt ?? prediction.calculatedAt}
                dataSource={dataSource}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            <div className="min-w-0">
              <StatusBanner
                paceStatus={prediction.paceStatus}
                riskLevel={prediction.riskLevel}
                uiState={uiState}
              />
            </div>
            <div className="min-w-0">
              <RecommendationCard action={recommendedAction} />
            </div>
          </div>

          <PredictionHistoryNote hasHistory={Boolean(trajectory)} />

          <LearnerProgressSummary
            progressPercent={
              prediction.progressPercent ?? metrics.progressPercent
            }
            completedActivities={metrics.completedActivities}
            totalActivities={metrics.totalActivities}
            qcmAverage={
              metrics.qcmAverage == null ? null : Number(metrics.qcmAverage)
            }
            recentQcmAverage={
              metrics.recentQcmAverage == null
                ? null
                : Number(metrics.recentQcmAverage)
            }
            recordedAt={metrics.recordedAt}
          />

          <p className="text-center text-sm text-slate-500">
            Estimations KO Predict™ — sans garantie de réussite. Une donnée
            manquante n&apos;est jamais un mauvais résultat.
          </p>
        </>
      )}
    </LearnerHubLayout>
  );
}
