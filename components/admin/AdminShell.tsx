"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminBoard } from "@/components/admin/AdminBoard";
import { LearnWorldsRoster } from "@/components/admin/LearnWorldsRoster";
import {
  IconBook,
  IconDownload,
  IconSpark,
} from "@/components/admin/AdminIcons";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminTab>(() =>
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setTab(resolveTab(searchParams.get("tab")));
  }, [searchParams]);

  const koCount = useMemo(() => rows.length, [rows]);

  function selectTab(next: AdminTab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "kopredict") {
      params.set("tab", "kopredict");
    } else {
      params.delete("tab");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_16px_48px_-28px_rgba(15,23,42,0.28)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="tablist"
            aria-label="Source apprenants"
            className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100/90 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "learnworlds"}
              data-active={tab === "learnworlds"}
              onClick={() => selectTab("learnworlds")}
              className="ko-admin-pill-tab"
            >
              <IconBook className="ko-icon-sm" />
              Tous les apprenants
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "kopredict"}
              data-active={tab === "kopredict"}
              onClick={() => selectTab("kopredict")}
              className="ko-admin-pill-tab"
            >
              <IconSpark className="ko-icon-sm" />
              <span className="ko-brand inline-flex items-baseline text-[0.95rem] tracking-tight">
                <span className="ko-brand-ko">KO</span>
                <span className="ko-brand-predict text-inherit">
                  &nbsp;Predict™
                </span>
              </span>
              <span className="ko-admin-pill-count">{koCount}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-xs text-slate-400">
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
              className="ko-admin-toolbar-btn"
              title="Export CSV bientôt disponible"
              disabled
            >
              <IconDownload className="ko-icon-sm" />
              Exporter
            </button>
          </div>
        </div>
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
