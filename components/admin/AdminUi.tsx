import { UserAvatar } from "@/components/ui/UserAvatar";

interface AdminKpiCardProps {
  label: string;
  value: string | number;
  detail?: string;
  accent?: boolean;
}

export function AdminKpiCard({
  label,
  value,
  detail,
  accent = false,
}: AdminKpiCardProps) {
  if (accent) {
    return (
      <article className="rounded-2xl bg-[linear-gradient(145deg,#0b1f2a_0%,#0f766e_100%)] px-5 py-4 text-white shadow-[var(--shadow-panel)]">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
          {label}
        </p>
        <p className="ko-display mt-2 text-3xl font-semibold tracking-tight">
          {value}
        </p>
        {detail ? (
          <p className="mt-1 text-sm text-white/75">{detail}</p>
        ) : null}
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-[0_10px_30px_-20px_rgba(11,31,42,0.35)]">
      <p className="ko-label">{label}</p>
      <p className="ko-display mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </article>
  );
}

/** Compat — délègue à `UserAvatar`. */
export function AdminAvatar({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  return <UserAvatar displayName={name} imageUrl={imageUrl} size={size} />;
}

const ACCOUNT_STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  PENDING_ACTIVATION: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  NOT_ACTIVATED: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  DISABLED: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  ERROR: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

export function AccountStatusBadge({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        ACCOUNT_STATUS_CLASS[status] ?? ACCOUNT_STATUS_CLASS.NOT_ACTIVATED
      }`}
    >
      {label}
    </span>
  );
}
