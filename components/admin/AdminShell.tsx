"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminBoard } from "@/components/admin/AdminBoard";
import { AdminLearnersKoCountSync } from "@/components/admin/AdminLearnersHeaderTabs";
import { LearnWorldsRoster } from "@/components/admin/LearnWorldsRoster";
import { IconDownload } from "@/components/admin/AdminIcons";
import type { AdminStudentRow } from "@/lib/admin/types";
import type { StaffPermissions } from "@/lib/auth/permissions";
import { useLanguage } from "@/components/i18n/LanguageProvider";

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
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AdminTab>(() =>
    resolveTab(searchParams.get("tab")),
  );

  useEffect(() => {
    setTab(resolveTab(searchParams.get("tab")));
  }, [searchParams]);

  const koCount = useMemo(() => rows.length, [rows]);

  return (
    <section className="ko-admin-panel">
      <AdminLearnersKoCountSync count={koCount} />

      <div className="ko-admin-panel-head">
        <p className="text-xs text-slate-400">
          {t("admin.learners.sourceLine", {
            source:
              tab === "learnworlds"
                ? t("admin.learners.sourceLw")
                : dataSource === "database"
                  ? t("admin.learners.sourceDb")
                  : t("admin.learners.sourceDemo"),
            mode: permissions.canManageStudents
              ? t("common.management")
              : t("common.readOnly"),
          })}
        </p>
        <button
          type="button"
          className="ko-admin-toolbar-btn self-start sm:self-auto"
          title={t("admin.learners.exportSoon")}
          disabled
        >
          <IconDownload className="ko-icon-sm" />
          {t("admin.learners.export")}
        </button>
      </div>

      <div className="ko-admin-panel-body">
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
