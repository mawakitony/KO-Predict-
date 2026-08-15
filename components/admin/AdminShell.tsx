"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminBoard } from "@/components/admin/AdminBoard";
import { AdminLearnersKoCountSync } from "@/components/admin/AdminLearnersHeaderTabs";
import { LearnWorldsRoster } from "@/components/admin/LearnWorldsRoster";
import { IconDownload } from "@/components/admin/AdminIcons";
import type { AdminStudentRow } from "@/lib/admin/types";
import type { StaffPermissions } from "@/lib/auth/permissions";

type AdminTab = "learnworlds" | "kopredict";

interface AdminShellProps {
  rows: AdminStudentRow[];
  interventions: AdminStudentRow[];
  interventionCards: import("@/lib/admin/interventions/types").CoachInterventionCard[];
  certifications: string[];
  dataSource: "demo" | "database";
  permissions: StaffPermissions;
  operatorEmail?: string | null;
}

function resolveTab(raw: string | null): AdminTab {
  return raw === "kopredict" ? "kopredict" : "learnworlds";
}

export function AdminShell({
  rows,
  interventions,
  interventionCards,
  certifications,
  dataSource,
  permissions,
}: AdminShellProps) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminTab>(() =>
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setTab(resolveTab(searchParams.get("tab")));
  }, [searchParams]);

  const koCount = useMemo(() => rows.length, [rows]);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_16px_48px_-28px_rgba(15,23,42,0.28)]">
      <AdminLearnersKoCountSync count={koCount} />

      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-slate-400">
          Source :{" "}
          {tab === "learnworlds"
            ? "LearnWorlds"
            : dataSource === "database"
              ? "Supabase"
              : "démo"}
          {permissions.canManageStudents ? " · gestion" : " · lecture seule"}
        </p>
        <button
          type="button"
          className="ko-admin-toolbar-btn self-start sm:self-auto"
          title="Export CSV bientôt disponible"
          disabled
        >
          <IconDownload className="ko-icon-sm" />
          Exporter
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {tab === "learnworlds" ? (
          <LearnWorldsRoster
            canManageStudents={permissions.canManageStudents}
          />
        ) : (
          <AdminBoard
            rows={rows}
            interventions={interventions}
            interventionCards={interventionCards}
            certifications={certifications}
            dataSource={dataSource}
            canManageStudents={permissions.canManageStudents}
            canManageInterventions={permissions.canManageInterventions}
          />
        )}
      </div>
    </section>
  );
}
