"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SchoolOverviewAlert,
  SchoolOverviewStats,
  SchoolTrendPoint,
} from "@/lib/admin/school-overview";
import {
  SchoolHeroChart,
  SchoolMetricCard,
  SchoolProgressBars,
  SchoolRiskDonut,
} from "@/components/dashboard/SchoolCharts";
import { SchoolCurveToolbar } from "@/components/dashboard/SchoolCurveToolbar";
import { riskToneClasses } from "@/lib/dashboard/format";
import type { RiskLevel } from "@/types/prediction";

interface SchoolOverviewBoardProps {
  overview: SchoolOverviewStats;
  trends: SchoolTrendPoint[];
}

type SortKey = "risk" | "name" | "prob";

const RISK_ORDER: Record<string, number> = {
  CRITICAL: 0,
  RED: 1,
  AMBER: 2,
  GREEN: 3,
  NONE: 4,
};

function metricPct(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)} %`;
}

function metricNum(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function matchesQuery(alert: SchoolOverviewAlert, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    alert.fullName.toLowerCase().includes(q) ||
    alert.certification.toLowerCase().includes(q) ||
    alert.riskLevel.toLowerCase().includes(q)
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 32 32" className="ko-inv-metric-svg" aria-hidden>
      <circle cx="21.5" cy="11" r="4.4" fill="#c2410c" />
      <path d="M14.8 26.8c0-3.7 3-6.7 6.7-6.7s6.7 3 6.7 6.7V28H14.8v-1.2Z" fill="#c2410c" />
      <circle cx="12" cy="10.2" r="5.4" fill="#ea580c" />
      <path d="M3.2 27c0-4.6 3.8-8.3 8.8-8.3S20.8 22.4 20.8 27V28.2H3.2V27Z" fill="#ea580c" />
      <circle cx="10.2" cy="8.6" r="1.4" fill="#ffedd5" />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg viewBox="0 0 32 32" className="ko-inv-metric-svg" aria-hidden>
      <rect x="4.5" y="19" width="5" height="9" rx="1.4" fill="#14b8a6" />
      <rect x="11.5" y="13.5" width="5" height="14.5" rx="1.4" fill="#0d9488" />
      <rect x="18.5" y="8" width="5" height="20" rx="1.4" fill="#0f766e" />
      <path
        d="M9 18.5 16.2 11l3.2 3.2L27 6.2V12h-2.4V9.2l-5.4 5.6-3.2-3.2L10.8 20 9 18.5Z"
        fill="#134e4a"
      />
      <circle cx="26.2" cy="6.4" r="2.4" fill="#99f6e4" stroke="#0f766e" strokeWidth="1.5" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 32 32" className="ko-inv-metric-svg" aria-hidden>
      <circle cx="16" cy="16" r="12" fill="#1d4ed8" />
      <circle cx="16" cy="16" r="8.2" fill="#93c5fd" />
      <circle cx="16" cy="16" r="5.2" fill="#2563eb" />
      <circle cx="16" cy="16" r="2.4" fill="#eff6ff" />
      <circle cx="13.6" cy="13.4" r="1.3" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 32 32" className="ko-inv-metric-svg" aria-hidden>
      <path
        d="M15.1 4.2c.4-.8 1.4-.8 1.8 0l11.4 20.6c.4.8-.2 1.8-1.1 1.8H4.8c-.9 0-1.5-1-1.1-1.8L15.1 4.2Z"
        fill="#dc2626"
      />
      <path
        d="M15.4 6.4c.3-.5.9-.5 1.2 0l9.4 17c.3.5-.1 1.1-.6 1.1H6.6c-.5 0-.9-.6-.6-1.1l9.4-17Z"
        fill="#ef4444"
      />
      <rect x="14.4" y="11" width="3.2" height="7.6" rx="1.6" fill="#fff" />
      <circle cx="16" cy="22.4" r="1.7" fill="#fff" />
    </svg>
  );
}

export function SchoolOverviewBoard({
  overview,
  trends,
}: SchoolOverviewBoardProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("risk");

  const evaluated =
    overview.riskCounts.GREEN +
    overview.riskCounts.AMBER +
    overview.riskCounts.RED +
    overview.riskCounts.CRITICAL;

  const heroValue =
    overview.avgReadinessScore != null
      ? `${Math.round(overview.avgReadinessScore)}`
      : overview.avgSuccessProbability != null
        ? `${Math.round(overview.avgSuccessProbability)} %`
        : "—";

  const riskSegments = [
    { key: "GREEN", label: "GREEN", count: overview.riskCounts.GREEN, color: "#10b981" },
    { key: "AMBER", label: "AMBER", count: overview.riskCounts.AMBER, color: "#f59e0b" },
    { key: "RED", label: "RED", count: overview.riskCounts.RED, color: "#ef4444" },
    { key: "CRITICAL", label: "CRITICAL", count: overview.riskCounts.CRITICAL, color: "#7f1d1d" },
    { key: "NONE", label: "Non évalué", count: overview.riskCounts.NONE, color: "#94a3b8" },
  ];

  const progressPoints = overview.progressProfile.map((p) => ({
    label: p.label.replace("-", "–"),
    value: p.value,
  }));

  const filteredAlerts = useMemo(() => {
    const list = overview.alerts
      .filter((a) => matchesQuery(a, appliedQuery))
      .filter((a) => (riskFilter === "ALL" ? true : a.riskLevel === riskFilter));

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortKey === "name") {
        return a.fullName.localeCompare(b.fullName, "fr");
      }
      if (sortKey === "prob") {
        return (b.readinessProbability ?? -1) - (a.readinessProbability ?? -1);
      }
      return (RISK_ORDER[a.riskLevel] ?? 99) - (RISK_ORDER[b.riskLevel] ?? 99);
    });
    return sorted;
  }, [overview.alerts, appliedQuery, riskFilter, sortKey]);

  function runSearch() {
    setAppliedQuery(query);
    setShowFilters(false);
    requestAnimationFrame(() => {
      document.getElementById("alerts-title")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function cycleSort() {
    setSortKey((prev) =>
      prev === "risk" ? "name" : prev === "name" ? "prob" : "risk",
    );
  }

  return (
    <div className="ko-inv-board">
      <section className="ko-curve-block" aria-label="Évolution de la promotion">
        <SchoolCurveToolbar
          query={query}
          onQueryChange={setQuery}
          onSearch={runSearch}
          onToggleFilters={() => setShowFilters((v) => !v)}
          filtersOpen={showFilters}
          onRefresh={() => router.refresh()}
          onSort={cycleSort}
          onReset={() => {
            setQuery("");
            setAppliedQuery("");
            setRiskFilter("ALL");
            setSortKey("risk");
            setShowFilters(false);
          }}
          sortLabel={
            sortKey === "risk"
              ? "Tri : risque"
              : sortKey === "name"
                ? "Tri : nom"
                : "Tri : proba"
          }
        />

        {showFilters ? (
          <div className="ko-curve-filters" role="group" aria-label="Filtres alertes">
            <p className="ko-curve-filters-label">Risque</p>
            {(
              [
                ["ALL", "Tous"],
                ["CRITICAL", "CRITICAL"],
                ["RED", "RED"],
                ["AMBER", "AMBER"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`ko-curve-filter-chip${riskFilter === value ? " is-active" : ""}`}
                onClick={() => {
                  setRiskFilter(value);
                  setAppliedQuery(query);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        <SchoolHeroChart
          trends={trends}
          headline="Préparation moyenne de la promotion"
          headlineValue={heroValue}
        />
      </section>

      <section aria-label="Indicateurs" className="ko-inv-metrics">
        <SchoolMetricCard
          title="Taux global"
          value={metricPct(overview.globalSuccessRate)}
          hint={evaluated > 0 ? `${evaluated} évalués` : "En attente de données"}
          tone="blue"
          icon={<IconTarget />}
        />
        <SchoolMetricCard
          title="Préparation"
          value={metricNum(overview.avgReadinessScore)}
          hint="Score moyen"
          tone="teal"
          icon={<IconTrend />}
        />
        <SchoolMetricCard
          title="Apprenants"
          value={String(overview.totalStudents)}
          hint={`${overview.withEstimation} avec estimation`}
          tone="amber"
          icon={<IconUsers />}
        />
        <SchoolMetricCard
          title="À alerter"
          value={String(overview.alertCount)}
          hint="Révision à relancer"
          tone="red"
          icon={<IconAlert />}
        />
      </section>

      <div className="ko-inv-bottom">
        <section className="ko-inv-card ko-inv-alerts" aria-labelledby="alerts-title">
          <div className="ko-inv-card-head">
            <h3 id="alerts-title">À alerter</h3>
            <span className="ko-inv-chip is-red">{filteredAlerts.length}</span>
          </div>

          {appliedQuery.trim() || riskFilter !== "ALL" ? (
            <p className="ko-inv-filter-hint">
              {filteredAlerts.length} résultat
              {filteredAlerts.length > 1 ? "s" : ""}
              {appliedQuery.trim() ? ` pour « ${appliedQuery.trim()} »` : ""}
              {riskFilter !== "ALL" ? ` · ${riskFilter}` : ""}
            </p>
          ) : null}

          {overview.alerts.length === 0 ? (
            <p className="ko-inv-empty">
              Aucune alerte — promotion stable.
            </p>
          ) : filteredAlerts.length === 0 ? (
            <p className="ko-inv-empty">
              Aucun apprenant ne correspond à cette recherche.
            </p>
          ) : (
            <ul className="ko-inv-alert-list">
              {filteredAlerts.map((alert) => {
                const tone = riskToneClasses(alert.riskLevel);
                return (
                  <li key={alert.studentId} className="ko-inv-alert-row">
                    <div className="ko-inv-alert-left">
                      <span className="ko-inv-avatar" aria-hidden>
                        {initials(alert.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="ko-inv-alert-name">{alert.fullName}</p>
                        <p className="ko-inv-alert-meta">
                          {alert.certification}
                          {" · "}
                          {alert.readinessProbability == null
                            ? "Prob. —"
                            : `Prob. ${Math.round(alert.readinessProbability)} %`}
                        </p>
                      </div>
                    </div>
                    <div className="ko-inv-alert-right">
                      <span className={`ko-inv-risk ${tone.badge}`}>
                        {alert.riskLevel}
                      </span>
                      <Link
                        href={`/admin/students/${alert.studentId}`}
                        className="ko-inv-see"
                      >
                        Voir
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <SchoolRiskDonut segments={riskSegments} />
        <SchoolProgressBars points={progressPoints} />
      </div>

      <p className="ko-inv-footnote">
        KO Predict™ — vue école agrégée, sans garantie de réussite.
        {" "}
        {overview.collectingData > 0
          ? `${overview.collectingData} en collecte de données.`
          : null}
      </p>
    </div>
  );
}
