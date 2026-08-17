"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PaceActivityBars } from "@/components/admin/PaceActivityBars";
import { ReadinessHistoryChart } from "@/components/admin/ReadinessHistoryChart";
import { RingProgress, RingProgressRow } from "@/components/admin/RingProgress";
import { AdminAvatar } from "@/components/admin/AdminUi";
import {
  IconBook,
  IconCheck,
  IconMail,
  IconSpark,
} from "@/components/admin/AdminIcons";
import type { AdminStudentDetail } from "@/lib/admin/types";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import { AdminWorkPlanPanel } from "@/components/admin/AdminWorkPlanPanel";
import { StudentPasswordRecoveryAction } from "@/components/admin/StudentPasswordRecoveryAction";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDate, formatDateTime } from "@/lib/i18n/format-date";
import {
  accountStatusKey,
  paceKey,
  riskKey,
} from "@/lib/i18n/labels";
import {
  formatPercent,
  formatScore,
  riskToneClasses,
} from "@/lib/dashboard/format";

interface StudentProfileBoardProps {
  detail: AdminStudentDetail;
  email?: string | null;
  canManageStudents?: boolean;
  activeWorkPlan?: PersistedWorkPlan | null;
  previousWorkPlan?: PersistedWorkPlan | null;
}

function InsightCard({
  icon,
  title,
  subtitle,
  badge,
  tone,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  tone: "blue" | "sky" | "teal" | "amber" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-800",
    sky: "bg-sky-50 text-sky-800",
    teal: "bg-teal-50 text-teal-800",
    amber: "bg-amber-50 text-amber-900",
    rose: "bg-rose-50 text-rose-800",
  } as const;
  const badgeTone = {
    blue: "bg-blue-600 text-white",
    sky: "bg-sky-600 text-white",
    teal: "bg-teal-600 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-500 text-white",
  } as const;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ${tones[tone]}`}
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-current shadow-sm">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs opacity-80">{subtitle}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeTone[tone]}`}
      >
        {badge}
      </span>
    </div>
  );
}

export function StudentProfileBoard({
  detail,
  email,
  canManageStudents = false,
  activeWorkPlan = null,
  previousWorkPlan = null,
}: StudentProfileBoardProps) {
  const { t, locale } = useLanguage();
  const { student, metrics, prediction, history, dataSource, accountStatus } =
    detail;
  const tone = riskToneClasses(prediction.riskLevel);
  const targetExamLabel = student.targetExamDate
    ? formatDate(student.targetExamDate, locale)
    : t("admin.learners.dateMissing");

  const readiness = prediction.readinessScore;
  const probability = prediction.readinessProbability;
  const progress = prediction.progressPercent;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--admin-blue-hover)] hover:underline"
        >
          ← {t("admin.file.back")}
        </Link>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-blue-100">
          {t("admin.file.sourceLabel", {
            source:
              dataSource === "database"
                ? t("admin.file.sourceDb")
                : t("admin.file.sourceDemo"),
          })}
        </span>
      </div>

      <div className="grid w-full min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
          <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
            <div className="flex flex-col items-center text-center">
              <AdminAvatar name={student.fullName} size="lg" />
              <h1 className="ko-display mt-3 text-xl font-semibold text-slate-900">
                {student.fullName}
              </h1>
              {email ? (
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--admin-blue)]">
                  <IconMail className="ko-icon-sm" />
                  {email}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-500">
                {detail.formation.compactLabel}
              </p>
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}
              >
                {prediction.riskLevel
                  ? `${prediction.riskLevel} — ${t(riskKey(prediction.riskLevel))}`
                  : t(riskKey(null))}
              </span>
            </div>

            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5">
              {detail.formation.courses.length > 1 ? (
                <div className="text-sm">
                  <dt className="text-slate-400">{t("admin.file.formation")}</dt>
                  <dd className="mt-1 text-right font-semibold text-slate-800">
                    <p>{detail.formation.compactLabel}</p>
                    <ul className="mt-2 space-y-1 text-left font-medium text-slate-700">
                      {detail.formation.courses.map((course) => (
                        <li key={course.courseId}>{course.title}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : (
                <ProfileRow
                  label={t("admin.file.formation")}
                  value={detail.formation.compactLabel}
                />
              )}
              <ProfileRow
                label={t("admin.learners.colTargetDate")}
                value={targetExamLabel}
              />
              <ProfileRow
                label={t("admin.learners.colAccess")}
                value={t(accountStatusKey(accountStatus))}
              />
              {canManageStudents ? (
                <div className="pt-2">
                  <StudentPasswordRecoveryAction
                    studentId={student.studentId}
                    email={email}
                    fullName={student.fullName}
                    accountStatus={accountStatus}
                    canManage={canManageStudents}
                  />
                </div>
              ) : null}
              <ProfileRow
                label={t("admin.file.timezone")}
                value={student.timezone ?? "—"}
              />
              <ProfileRow
                label={t("admin.file.lastActivity")}
                value={formatDateTime(metrics.lastActivityDate, locale)}
              />
              <ProfileRow
                label={t("admin.file.lastLwSync")}
                value={
                  metrics.recordedAt
                    ? formatDateTime(metrics.recordedAt, locale)
                    : t("admin.file.neverSynced")
                }
              />
              <ProfileRow
                label={t("admin.file.inactivity")}
                value={t("admin.file.inactivityDays", {
                  days: metrics.inactiveDays,
                })}
              />
            </dl>
          </section>

          <div className="min-w-0 space-y-4 overflow-hidden">
            <section className="overflow-hidden rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="ko-display text-base font-semibold text-slate-900">
                  {t("admin.file.keyIndicators")}
                </h2>
                <span className="text-xs text-slate-400">
                  {t("admin.file.estimation")}
                </span>
              </div>
              <RingProgressRow>
                <RingProgress
                  value={readiness}
                  label={t("admin.file.preparation")}
                  tone="sky"
                />
                <RingProgress
                  value={probability}
                  label={t("admin.file.probability")}
                  tone="emerald"
                />
                <RingProgress
                  value={progress}
                  label={t("admin.file.progress")}
                  tone="amber"
                  striped
                />
              </RingProgressRow>
              <p className="mt-2 text-center text-sm text-slate-500">
                Readiness{" "}
                <span className="font-semibold text-slate-800">
                  {readiness != null
                    ? `${formatScore(readiness)} / 100`
                    : t("admin.file.preparing")}
                </span>
                {" · "}
                {t(paceKey(prediction.paceStatus))}
              </p>
            </section>

            <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="ko-display text-base font-semibold text-slate-900">
                  {t("admin.file.activityPace")}
                </h2>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>
                    {t("admin.file.currentPace")}{" "}
                    <strong className="text-slate-800">
                      {prediction.currentPace != null &&
                      prediction.currentPace > 0
                        ? t("admin.file.perWeek", {
                            value: prediction.currentPace,
                          })
                        : "—"}
                    </strong>
                  </span>
                  <span>
                    {t("admin.file.requiredPace")}{" "}
                    <strong className="text-[var(--admin-blue-hover)]">
                      {prediction.requiredPace != null
                        ? t("admin.file.perWeek", {
                            value: prediction.requiredPace,
                          })
                        : "—"}
                    </strong>
                  </span>
                </div>
              </div>
              <PaceActivityBars
                currentPace={prediction.currentPace}
                requiredPace={prediction.requiredPace}
              />
              <p className="mt-2 text-xs text-slate-400">
                {t("admin.file.paceHint")}
              </p>
            </section>

            <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="ko-display text-base font-semibold text-slate-900">
                  {t("admin.file.readinessHistory")}
                </h2>
                <span className="rounded-full bg-[var(--admin-blue-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-blue-hover)]">
                  {t("admin.file.history")}
                </span>
              </div>
              <ReadinessHistoryChart history={history} />
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MiniStat
                label={t("admin.file.activities")}
                value={`${metrics.completedActivities} / ${metrics.totalActivities}`}
              />
              <MiniStat
                label={t("admin.file.qcmAverage")}
                value={
                  metrics.qcmAverage != null
                    ? `${Math.round(metrics.qcmAverage)} %`
                    : "—"
                }
              />
              <MiniStat
                label={t("admin.file.recentQcm")}
                value={
                  metrics.recentQcmAverage != null
                    ? `${Math.round(metrics.recentQcmAverage)} %`
                    : "—"
                }
              />
              <MiniStat
                label={t("admin.file.studyTime")}
                value={t("admin.file.studyTimeMin", {
                  minutes: metrics.studyTimeMinutes,
                })}
              />
              <MiniStat
                label={t("admin.file.progress")}
                value={formatPercent(prediction.progressPercent)}
              />
              <MiniStat
                label={t("admin.file.probability")}
                value={
                  prediction.readinessProbability != null
                    ? `${Math.round(prediction.readinessProbability)} %`
                    : "—"
                }
              />
            </section>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 xl:max-w-sm">
          <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
            <h2 className="ko-display text-base font-semibold text-slate-900">
              {t("admin.file.keyDates")}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {t("admin.file.trajectory")}
            </p>
            <div className="mt-4 space-y-2.5">
              <InsightCard
                tone="blue"
                icon={<IconBook className="ko-icon" />}
                title={t("admin.file.examTarget")}
                subtitle={targetExamLabel}
                badge={t("admin.file.targetBadge")}
              />
              <InsightCard
                tone="sky"
                icon={<IconSpark className="ko-icon" />}
                title={t("admin.file.predictedEnd")}
                subtitle={
                  prediction.predictedCompletionDate
                    ? formatDate(prediction.predictedCompletionDate, locale)
                    : t("admin.file.pending")
                }
                badge={t("admin.file.endBadge")}
              />
              <InsightCard
                tone="teal"
                icon={<IconCheck className="ko-icon" />}
                title={t("admin.file.readyExam")}
                subtitle={
                  prediction.predictedReadinessDate
                    ? formatDate(prediction.predictedReadinessDate, locale)
                    : t("admin.file.pending")
                }
                badge={t("admin.file.readyBadge")}
              />
              <InsightCard
                tone={
                  prediction.riskLevel === "CRITICAL" ||
                  prediction.riskLevel === "RED"
                    ? "rose"
                    : prediction.riskLevel === "AMBER"
                      ? "amber"
                      : "blue"
                }
                icon={<IconSpark className="ko-icon" />}
                title={t("admin.file.riskLevel")}
                subtitle={t(riskKey(prediction.riskLevel))}
                badge={prediction.riskLevel ?? "N/A"}
              />
            </div>
          </section>

          <section className="rounded-[1.5rem] bg-[linear-gradient(160deg,#2563eb_0%,#1d4ed8_55%,#0f766e_100%)] p-5 text-white shadow-[0_12px_40px_-20px_rgba(37,99,235,0.65)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              {t("admin.file.recommended")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/95 sm:text-base">
              {prediction.recommendedAction ??
                t("admin.file.recommendedFallback")}
            </p>
          </section>

          <AdminWorkPlanPanel
            active={activeWorkPlan}
            previousLatest={previousWorkPlan}
          />
        </aside>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-[0_8px_28px_-20px_rgba(37,99,235,0.4)] ring-1 ring-blue-100/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="ko-display mt-2 text-lg font-semibold text-slate-900">
        {value}
      </p>
    </article>
  );
}
