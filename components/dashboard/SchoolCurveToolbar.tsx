"use client";

import type { FormEvent } from "react";
import {
  IconFilter,
  IconMore,
  IconRefresh,
  IconSearch,
  IconSort,
} from "@/components/admin/AdminIcons";

export function SchoolCurveToolbar({
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
          <span className="sr-only">
            Rechercher un apprenant sur la vue d&apos;ensemble
          </span>
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
