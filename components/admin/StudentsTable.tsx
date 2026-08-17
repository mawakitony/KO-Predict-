"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminStudentRow } from "@/lib/admin/types";
import {
  formatDateShortFr,
  formatPercent,
  formatScore,
  riskLabel,
  riskToneClasses,
} from "@/lib/dashboard/format";
import { AccountStatusBadge, AdminAvatar } from "@/components/admin/AdminUi";
import { IconBan, IconCheck, IconEye } from "@/components/admin/AdminIcons";
import { AdminRowAction, AdminRowActions } from "@/components/admin/AdminRowActions";

interface StudentsTableProps {
  rows: AdminStudentRow[];
  onChanged?: () => void;
  canManageStudents?: boolean;
}

export function StudentsTable({
  rows,
  onChanged,
  canManageStudents = false,
}: StudentsTableProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleAccess(
    studentId: string,
    kind: "disable" | "enable",
  ) {
    if (kind === "disable") {
      const ok = window.confirm(
        "Voulez-vous vraiment désactiver l'accès KO Predict™ de cet apprenant ?\nSes données seront conservées.",
      );
      if (!ok) return;
    }
    setBusyId(studentId);
    setError(null);
    try {
      const path =
        kind === "disable"
          ? "/api/admin/students/disable"
          : "/api/admin/students/enable";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Action échouée.");
      } else {
        onChanged?.();
        window.location.reload();
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-500 sm:p-10">
        Aucun apprenant ne correspond à ces filtres.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Mobile / tablette : cartes */}
      <ul className="grid gap-3 md:hidden">
        {rows.map((row) => {
          const tone = riskToneClasses(row.prediction.riskLevel);
          const access = row.accountStatus ?? "ACTIVE";
          const targetLabel = row.student.targetExamDate
            ? formatDateShortFr(row.student.targetExamDate)
            : "Date non renseignée";
          return (
            <li key={row.student.studentId} className="ko-admin-student-card">
              <div className="flex items-start gap-3">
                <AdminAvatar name={row.student.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/students/${row.student.studentId}`}
                    className="font-semibold text-slate-900 hover:text-[var(--accent-hover)]"
                  >
                    {row.student.fullName}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.student.certification}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
                  title={riskLabel(row.prediction.riskLevel)}
                >
                  {row.prediction.riskLevel ?? "—"}
                </span>
              </div>

              <dl className="ko-admin-student-meta">
                <div>
                  <dt>Readiness</dt>
                  <dd>
                    {formatScore(row.prediction.readinessScore)}
                    {row.prediction.readinessScore != null ? " / 100" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Progression</dt>
                  <dd>{formatPercent(row.prediction.progressPercent)}</dd>
                </div>
                <div>
                  <dt>Date cible</dt>
                  <dd>{targetLabel}</dd>
                </div>
                <div>
                  <dt>Accès</dt>
                  <dd>
                    <AccountStatusBadge
                      status={access}
                      label={access === "DISABLED" ? "Désactivé" : "Actif"}
                    />
                  </dd>
                </div>
              </dl>

              <AdminRowActions>
                <AdminRowAction
                  href={`/admin/students/${row.student.studentId}`}
                  label="Voir"
                  tone="primary"
                  icon={<IconEye className="ko-icon-sm" />}
                />
                {canManageStudents && access === "ACTIVE" ? (
                  <AdminRowAction
                    label="Désactiver"
                    tone="danger"
                    disabled={busyId === row.student.studentId}
                    onClick={() =>
                      toggleAccess(row.student.studentId, "disable")
                    }
                    icon={<IconBan className="ko-icon-sm" />}
                  />
                ) : null}
                {canManageStudents && access === "DISABLED" ? (
                  <AdminRowAction
                    labeled
                    label="Réactiver"
                    tone="success"
                    disabled={busyId === row.student.studentId}
                    onClick={() =>
                      toggleAccess(row.student.studentId, "enable")
                    }
                    icon={<IconCheck className="ko-icon-sm" />}
                  />
                ) : null}
              </AdminRowActions>
            </li>
          );
        })}
      </ul>

      {/* Desktop : tableau */}
      <div className="ko-admin-table-wrap hidden md:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              <th className="px-2 py-3 font-semibold sm:px-3">Apprenant</th>
              <th className="px-2 py-3 font-semibold sm:px-3">Certification</th>
              <th className="px-2 py-3 font-semibold sm:px-3">Readiness</th>
              <th className="hidden px-3 py-3 font-semibold lg:table-cell">
                Progression
              </th>
              <th className="hidden px-3 py-3 font-semibold xl:table-cell">
                Date cible
              </th>
              <th className="px-2 py-3 font-semibold sm:px-3">Risque</th>
              <th className="px-2 py-3 font-semibold sm:px-3">Accès</th>
              <th className="px-2 py-3 text-right font-semibold sm:px-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tone = riskToneClasses(row.prediction.riskLevel);
              const access = row.accountStatus ?? "ACTIVE";
              const targetLabel = row.student.targetExamDate
                ? formatDateShortFr(row.student.targetExamDate)
                : "Date d'examen non renseignée";
              return (
                <tr
                  key={row.student.studentId}
                  className="border-b border-slate-100 last:border-0 transition hover:bg-[var(--admin-blue-soft)]/50"
                >
                  <td className="px-2 py-3.5 sm:px-3">
                    <div className="flex items-center gap-3">
                      <AdminAvatar name={row.student.fullName} size="sm" />
                      <Link
                        href={`/admin/students/${row.student.studentId}`}
                        className="font-semibold text-slate-900 hover:text-[var(--accent-hover)]"
                      >
                        {row.student.fullName}
                      </Link>
                    </div>
                  </td>
                  <td className="px-2 py-3.5 text-slate-700 sm:px-3">
                    {row.student.certification}
                  </td>
                  <td className="px-2 py-3.5 font-medium text-slate-800 sm:px-3">
                    {formatScore(row.prediction.readinessScore)}
                    {row.prediction.readinessScore != null ? " / 100" : ""}
                  </td>
                  <td className="hidden px-3 py-3.5 text-slate-700 lg:table-cell">
                    {formatPercent(row.prediction.progressPercent)}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 text-slate-700 xl:table-cell">
                    {targetLabel}
                  </td>
                  <td className="px-2 py-3.5 sm:px-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
                      title={riskLabel(row.prediction.riskLevel)}
                    >
                      {row.prediction.riskLevel ?? "—"}
                    </span>
                  </td>
                  <td className="px-2 py-3.5 sm:px-3">
                    <AccountStatusBadge
                      status={access}
                      label={access === "DISABLED" ? "Désactivé" : "Actif"}
                    />
                  </td>
                  <td className="px-2 py-3.5 sm:px-3">
                    <div className="flex justify-end">
                      <AdminRowActions>
                        <AdminRowAction
                          href={`/admin/students/${row.student.studentId}`}
                          label="Voir"
                          tone="primary"
                          icon={<IconEye className="ko-icon-sm" />}
                        />
                        {canManageStudents && access === "ACTIVE" ? (
                          <AdminRowAction
                            label="Désactiver"
                            tone="danger"
                            disabled={busyId === row.student.studentId}
                            onClick={() =>
                              toggleAccess(row.student.studentId, "disable")
                            }
                            icon={<IconBan className="ko-icon-sm" />}
                          />
                        ) : null}
                        {canManageStudents && access === "DISABLED" ? (
                          <AdminRowAction
                            labeled
                            label="Réactiver"
                            tone="success"
                            disabled={busyId === row.student.studentId}
                            onClick={() =>
                              toggleAccess(row.student.studentId, "enable")
                            }
                            icon={<IconCheck className="ko-icon-sm" />}
                          />
                        ) : null}
                      </AdminRowActions>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
