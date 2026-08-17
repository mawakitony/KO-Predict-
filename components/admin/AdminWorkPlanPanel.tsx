"use client";

import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import {
  buildPreviousPlanRow,
  buildWorkPlanSummaryView,
  formatActivitiesProgress,
} from "@/lib/planning/work-plan/presentation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateShort } from "@/lib/i18n/format-date";
import type { Locale } from "@/lib/i18n/storage";
import {
  planStatusKey,
  planTaskStatusKey,
  planTaskTitleKey,
  planTypeKey,
} from "@/lib/i18n/labels";

function formatPlanPeriod(
  startsAt: string,
  endsAt: string,
  locale: Locale,
): string {
  const start = formatDateShort(startsAt.slice(0, 10), locale);
  const end = formatDateShort(endsAt.slice(0, 10), locale);
  if (start === "—" || end === "—") return "—";
  return `${start} → ${end}`;
}

/**
 * Lecture seule coach/admin — données persistées, aucun recalcul métier.
 */
export function AdminWorkPlanPanel({
  active,
  previousLatest,
}: {
  active: PersistedWorkPlan | null;
  previousLatest: PersistedWorkPlan | null;
}) {
  const { t, locale } = useLanguage();

  if (!active) {
    return (
      <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
        <h2 className="ko-display text-base font-semibold text-slate-900">
          {t("admin.plan.current")}
        </h2>
        <p className="mt-3 text-sm text-slate-600">{t("admin.plan.none")}</p>
        {previousLatest ? (
          <PreviousCompact plan={previousLatest} locale={locale} />
        ) : null}
      </section>
    );
  }

  const summary = buildWorkPlanSummaryView(active);

  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {t("admin.plan.readonly")}
          </p>
          <h2 className="ko-display mt-1 text-base font-semibold text-slate-900">
            {t("admin.plan.current")}
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {t(planStatusKey(active.status))}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("admin.plan.type")}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {t(planTypeKey(active.planType))}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("admin.plan.period")}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {formatPlanPeriod(active.startsAt, active.endsAt, locale)}
          </dd>
        </div>
        {summary.activitiesLabel ? (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t("admin.plan.activities")}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">
              {summary.activitiesLabel}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("admin.plan.reevaluation")}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {formatDateShort(active.endsAt.slice(0, 10), locale)}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-slate-600">{summary.primaryObjective}</p>

      <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {t("admin.plan.mainTasks")}
      </h3>
      <ul className="mt-2 space-y-2">
        {active.tasks.map((task) => {
          const progress =
            task.type === "ACTIVITIES"
              ? formatActivitiesProgress(task)
              : null;
          return (
            <li
              key={task.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {t(planTaskTitleKey(task.type))}
                </p>
                {!task.measurable ? (
                  <p className="text-xs text-slate-500">
                    {t("admin.plan.orientation")}
                  </p>
                ) : null}
              </div>
              <div className="text-right text-xs font-semibold text-slate-600">
                {progress ? <p>{progress}</p> : null}
                <p>{t(planTaskStatusKey(task.status))}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {previousLatest ? (
        <PreviousCompact plan={previousLatest} locale={locale} />
      ) : null}
    </section>
  );
}

function PreviousCompact({
  plan,
  locale,
}: {
  plan: PersistedWorkPlan;
  locale: Locale;
}) {
  const { t } = useLanguage();
  const row = buildPreviousPlanRow(plan);
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {t("admin.plan.previousPlan")}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <div>
          <p className="font-semibold text-slate-800">
            {t(planTypeKey(plan.planType))}
          </p>
          <p className="text-xs text-slate-500">
            {formatPlanPeriod(plan.startsAt, plan.endsAt, locale)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium text-slate-700">
            {t(planStatusKey(plan.status))}
          </p>
          {row.activitiesLabel ? (
            <p className="text-xs text-slate-500">
              {t("admin.plan.activities")} {row.activitiesLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
