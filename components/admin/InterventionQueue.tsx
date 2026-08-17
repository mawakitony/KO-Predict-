"use client";

import Link from "next/link";
import type { AdminStudentRow } from "@/lib/admin/types";
import { formatPercent, riskToneClasses } from "@/lib/dashboard/format";
import { AdminAvatar } from "@/components/admin/AdminUi";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateShort } from "@/lib/i18n/format-date";
import { riskKey } from "@/lib/i18n/labels";

interface InterventionQueueProps {
  rows: AdminStudentRow[];
}

export function InterventionQueue({ rows }: InterventionQueueProps) {
  const { t, locale } = useLanguage();

  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-slate-50/70 p-5 sm:p-6"
      aria-labelledby="interventions-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="interventions-title"
            className="ko-display text-lg font-semibold text-slate-900"
          >
            {t("admin.school.priorityTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("admin.school.queueOrder")}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {t("admin.school.noActive")}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200/80">
          {rows.map((row) => {
            const tone = riskToneClasses(row.prediction.riskLevel);
            return (
              <li
                key={row.student.studentId}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <AdminAvatar name={row.student.fullName} size="sm" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.student.fullName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {row.student.certification} ·{" "}
                      {row.prediction.readinessProbability == null
                        ? t("admin.school.probEmpty")
                        : t("admin.school.prob", {
                            value: Math.round(
                              row.prediction.readinessProbability,
                            ),
                          })}{" "}
                      · {t("admin.file.readyBadge")}{" "}
                      {formatDateShort(
                        row.prediction.predictedReadinessDate,
                        locale,
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
                  >
                    {row.prediction.riskLevel} —{" "}
                    {t(riskKey(row.prediction.riskLevel))}
                  </span>
                  <Link
                    href={`/admin/students/${row.student.studentId}`}
                    className="inline-flex rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    {t("status.view")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
