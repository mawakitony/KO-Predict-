"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import {
  IconBook,
  IconFilter,
  IconMore,
  IconRefresh,
  IconSearch,
  IconSort,
  IconSpark,
} from "@/components/admin/AdminIcons";

export function SchoolCurveToolbar({
  learnerCount,
  query,
  onQueryChange,
  onSearch,
  onToggleFilters,
  filtersOpen = false,
  onRefresh,
  onSort,
  onReset,
  sortLabel = "Trier",
}: {
  learnerCount: number;
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
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSearch();
  }

  return (
    <div className="ko-curve-toolbar" aria-label="Recherche sur la vue d'ensemble">
      <div className="ko-curve-scope" role="navigation" aria-label="Portée">
        <Link href="/admin" className="ko-curve-scope-seg is-active">
          <IconBook className="ko-curve-scope-icon" />
          <span>Tous les apprenants</span>
        </Link>

        <Link
          href="/admin?tab=kopredict"
          className="ko-curve-scope-seg"
          aria-label="KO Predict™"
        >
          <IconSpark className="ko-curve-scope-icon is-muted" />
          <span className="ko-curve-scope-mark">
            <span className="ko-curve-scope-ko">KO</span>
            <span className="ko-curve-scope-predict">
              Predict<sup>™</sup>
            </span>
          </span>
          <span className="ko-curve-scope-count">{learnerCount}</span>
        </Link>
      </div>

      <form className="ko-curve-tools" onSubmit={handleSubmit}>
        <button
          type="button"
          className={`ko-curve-tool-btn${filtersOpen ? " is-active" : ""}`}
          onClick={onToggleFilters}
          aria-pressed={filtersOpen}
        >
          <IconFilter className="ko-icon" />
          Filtrer
        </button>

        <label className="ko-curve-search">
          <IconSearch className="ko-curve-search-icon" />
          <span className="sr-only">Rechercher un apprenant sur la vue d&apos;ensemble</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Rechercher un apprenant..."
            autoComplete="off"
          />
        </label>

        <button type="submit" className="ko-curve-search-btn">
          <IconSearch className="ko-icon" />
          Rechercher
        </button>

        <div className="ko-curve-tool-actions">
          <button
            type="button"
            className="ko-curve-icon-btn"
            aria-label={sortLabel}
            title={sortLabel}
            onClick={onSort}
          >
            <IconSort className="ko-icon" />
          </button>
          <button
            type="button"
            className="ko-curve-icon-btn"
            aria-label="Actualiser la vue d'ensemble"
            title="Actualiser"
            onClick={onRefresh}
          >
            <IconRefresh className="ko-icon" />
          </button>
          <button
            type="button"
            className="ko-curve-icon-btn"
            aria-label="Réinitialiser la recherche"
            title="Réinitialiser"
            onClick={onReset}
          >
            <IconMore className="ko-icon" />
          </button>
        </div>
      </form>
    </div>
  );
}
