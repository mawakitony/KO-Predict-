"use client";

import {
  IconChevronLeft,
  IconChevronRight,
} from "@/components/admin/AdminIcons";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface AdminPaginationProps {
  page: number;
  totalPages: number | null;
  pending?: boolean;
  onChange: (page: number) => void;
  pageSize?: number;
  rowCount?: number;
}

function pageWindow(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let p = current - 1; p <= current + 1; p += 1) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export function AdminPagination({
  page,
  totalPages,
  pending = false,
  onChange,
  pageSize = 5,
  rowCount = 0,
}: AdminPaginationProps) {
  const knownTotal = totalPages != null && totalPages > 0;
  const canPrev = page > 1 && !pending;
  const canNext = knownTotal
    ? page < totalPages! && !pending
    : rowCount >= pageSize && !pending;

  const items = knownTotal ? pageWindow(page, totalPages!) : null;
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 border-t border-slate-100 pt-4">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onChange(page - 1)}
        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-[var(--admin-blue-hover)] hover:bg-[var(--admin-blue-soft)] disabled:opacity-40"
        aria-label={t("common.previousPage")}
      >
        <IconChevronLeft className="ko-icon-sm" />
        {t("common.previous")}
      </button>

      {items ? (
        items.map((item, idx) =>
          item === "ellipsis" ? (
            <span
              key={`e-${idx}`}
              className="px-2 text-sm text-slate-400"
              aria-hidden
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              disabled={pending}
              onClick={() => onChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={`min-w-9 rounded-full px-3 py-2 text-sm font-semibold transition ${
                item === page
                  ? "bg-[var(--admin-blue)] text-white shadow-[0_6px_16px_-8px_rgba(37,99,235,0.9)]"
                  : "text-slate-600 hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue-hover)]"
              }`}
            >
              {item}
            </button>
          ),
        )
      ) : (
        <span className="px-3 text-sm text-slate-500">
          {t("common.page", { page })}
        </span>
      )}

      <button
        type="button"
        disabled={!canNext}
        onClick={() => onChange(page + 1)}
        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-[var(--admin-blue-hover)] hover:bg-[var(--admin-blue-soft)] disabled:opacity-40"
        aria-label={t("common.nextPage")}
      >
        {t("common.next")}
        <IconChevronRight className="ko-icon-sm" />
      </button>
    </div>
  );
}
