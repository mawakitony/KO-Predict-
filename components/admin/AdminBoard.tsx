"use client";

import { useMemo, useState } from "react";
import { InterventionCenter } from "@/components/admin/InterventionCenter";
import { RiskFilter } from "@/components/admin/RiskFilter";
import { StudentsTable } from "@/components/admin/StudentsTable";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { CoachInterventionCard } from "@/lib/admin/interventions/types";
import {
  RISK_SORT_ORDER,
  type AdminStudentRow,
} from "@/lib/admin/types";
import type { RiskLevel } from "@/types/prediction";

interface AdminBoardProps {
  rows: AdminStudentRow[];
  interventions: AdminStudentRow[];
  interventionCards: CoachInterventionCard[];
  certifications: string[];
  dataSource: "demo" | "database";
  canManageStudents?: boolean;
  canManageInterventions?: boolean;
}

export function AdminBoard({
  rows,
  interventionCards,
  certifications,
  dataSource,
  canManageStudents = false,
  canManageInterventions = false,
}: AdminBoardProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [certification, setCertification] = useState("ALL");
  const [risk, setRisk] = useState<RiskLevel | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        const nameOk =
          !q || row.student.fullName.toLowerCase().includes(q);
        const certOk =
          certification === "ALL" ||
          row.student.certification === certification;
        const riskOk =
          risk === "ALL" || row.prediction.riskLevel === risk;
        return nameOk && certOk && riskOk;
      })
      .sort((a, b) => {
        const ra = a.prediction.riskLevel
          ? RISK_SORT_ORDER[a.prediction.riskLevel]
          : 99;
        const rb = b.prediction.riskLevel
          ? RISK_SORT_ORDER[b.prediction.riskLevel]
          : 99;
        return ra - rb;
      });
  }, [rows, search, certification, risk]);

  return (
    <div className="space-y-5">
      <InterventionCenter
        cards={interventionCards}
        canManage={canManageInterventions}
        dataSource={dataSource}
      />

      <div className="flex flex-col gap-1">
        <h2 className="ko-display text-lg font-semibold text-slate-900">
          {t("admin.learners.title")}
        </h2>
        <p className="text-xs text-slate-400">
          {t("admin.learners.source", {
            source:
              dataSource === "database"
                ? t("admin.learners.sourceDb")
                : t("admin.learners.sourceDemo"),
            count: filtered.length,
          })}
        </p>
      </div>

      <RiskFilter
        search={search}
        onSearchChange={setSearch}
        certifications={certifications}
        certification={certification}
        onCertificationChange={setCertification}
        value={risk}
        onChange={setRisk}
      />

      <StudentsTable
        rows={filtered}
        canManageStudents={canManageStudents}
      />
    </div>
  );
}
