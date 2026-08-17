"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconBook, IconSpark } from "@/components/admin/AdminIcons";

type AdminTab = "learnworlds" | "kopredict";

const LearnersChromeContext = createContext<{
  koCount: number | null;
  setKoCount: (n: number | null) => void;
  studentFocus: { fullName: string; formationTitle: string | null } | null;
  setStudentFocus: (
    value: { fullName: string; formationTitle: string | null } | null,
  ) => void;
} | null>(null);

export function AdminLearnersChromeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [koCount, setKoCount] = useState<number | null>(null);
  const [studentFocus, setStudentFocus] = useState<{
    fullName: string;
    formationTitle: string | null;
  } | null>(null);
  const value = useMemo(
    () => ({ koCount, setKoCount, studentFocus, setStudentFocus }),
    [koCount, studentFocus],
  );
  return (
    <LearnersChromeContext.Provider value={value}>
      {children}
    </LearnersChromeContext.Provider>
  );
}

export function useAdminLearnersChrome() {
  const ctx = useContext(LearnersChromeContext);
  if (!ctx) {
    throw new Error("useAdminLearnersChrome hors AdminLearnersChromeProvider");
  }
  return ctx;
}

function resolveTab(raw: string | null): AdminTab {
  return raw === "kopredict" ? "kopredict" : "learnworlds";
}

/** Onglets source — placés dans le header entre le titre et le profil. */
export function AdminLearnersHeaderTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { koCount } = useAdminLearnersChrome();
  const onAdminHome = pathname === "/admin";
  const onSchool = pathname === "/admin/ecole";
  const tab = onAdminHome
    ? resolveTab(searchParams.get("tab"))
    : null;

  if (!onAdminHome && !onSchool) return null;

  function selectTab(next: AdminTab) {
    const href =
      next === "kopredict" ? "/admin?tab=kopredict" : "/admin";
    if (onAdminHome) {
      router.replace(href, { scroll: false });
      return;
    }
    router.push(href);
  }

  return (
    <div
      role="tablist"
      aria-label="Source apprenants"
      className="ko-admin-source-tabs"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "learnworlds"}
        data-active={tab === "learnworlds"}
        onClick={() => selectTab("learnworlds")}
        className="ko-admin-source-tab"
      >
        <IconBook className="ko-admin-source-tab-icon" />
        <span className="hidden sm:inline">Tous les apprenants</span>
        <span className="sm:hidden">Tous</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "kopredict"}
        data-active={tab === "kopredict"}
        onClick={() => selectTab("kopredict")}
        className="ko-admin-source-tab"
      >
        <IconSpark className="ko-admin-source-tab-icon" />
        <span className="ko-brand inline-flex items-baseline tracking-tight">
          <span className="ko-brand-ko">KO</span>
          <span className="ko-brand-predict text-inherit">&nbsp;Predict™</span>
        </span>
        {koCount != null ? (
          <span className="ko-admin-source-tab-count">{koCount}</span>
        ) : null}
      </button>
    </div>
  );
}

/** Publie le compteur KO Predict™ vers le header. */
export function AdminLearnersKoCountSync({ count }: { count: number }) {
  const { setKoCount } = useAdminLearnersChrome();
  useEffect(() => {
    setKoCount(count);
    return () => setKoCount(null);
  }, [count, setKoCount]);
  return null;
}

/** Publie le nom de l’apprenant vers le header (fiche étudiant). */
export function AdminStudentFocusSync({
  fullName,
  formationTitle,
}: {
  fullName: string;
  formationTitle: string | null;
}) {
  const { setStudentFocus } = useAdminLearnersChrome();
  useEffect(() => {
    setStudentFocus({ fullName, formationTitle });
    return () => setStudentFocus(null);
  }, [fullName, formationTitle, setStudentFocus]);
  return null;
}
