"use client";

import type { FormEvent } from "react";
import {
  IconFilter,
  IconMore,
  IconRefresh,
  IconSearch,
  IconSort,
} from "@/components/admin/AdminIcons";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export function SchoolCurveToolbar({
  query,
  onQueryChange,
  onSearch,
  onToggleFilters,
  filtersOpen = false,
  onRefresh,
  onSort,
  onReset,
  sortLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onToggleFilters: () => void;
  filtersOpen?: boolean;
  onRefresh: () => void;
  onSort: () => void;
  onReset: () => void;
  sortLabel?: string;
}) {
  const { t } = useLanguage();
  const resolvedSortLabel = sortLabel ?? t("admin.school.sort");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch();
  }

  return (
    <div className="ko-curve-toolbar" aria-label={t("admin.school.searchAria")}>
      <form className="ko-curve-tools" onSubmit={handleSubmit}>
        <button
          type="button"
          className={`ko-curve-tool-btn${filtersOpen ? " is-active" : ""}`}
          onClick={onToggleFilters}
          aria-pressed={filtersOpen}
        >
          <IconFilter className="ko-icon" />
          {t("common.filter")}
        </button>

        <label className="ko-curve-search">
          <IconSearch className="ko-curve-search-icon" />
          <span className="sr-only">
            {t("admin.school.searchLearner")}
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("admin.school.searchPlaceholder")}
            autoComplete="off"
          />
        </label>

        <button type="submit" className="ko-curve-search-btn">
          <IconSearch className="ko-icon" />
          {t("common.search")}
        </button>

        <div className="ko-curve-tool-actions">
          <button
            type="button"
            className="ko-curve-icon-btn"
            aria-label={resolvedSortLabel}
            title={resolvedSortLabel}
            onClick={onSort}
          >
            <IconSort className="ko-icon" />
          </button>
          <button
            type="button"
            className="ko-curve-icon-btn"
            aria-label={t("admin.school.refreshOverview")}
            title={t("common.refresh")}
            onClick={onRefresh}
          >
            <IconRefresh className="ko-icon" />
          </button>
          <button
            type="button"
            className="ko-curve-icon-btn"
            aria-label={t("admin.school.resetSearch")}
            title={t("common.reset")}
            onClick={onReset}
          >
            <IconMore className="ko-icon" />
          </button>
        </div>
      </form>
    </div>
  );
}
