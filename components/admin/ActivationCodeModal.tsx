"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateTime } from "@/lib/i18n/format-date";

export interface ActivationCodeModalData {
  fullName: string;
  email: string;
  activationCode: string;
  expiresAt: string;
}

export function ActivationCodeModal({
  data,
  onClose,
  title,
  hint,
}: {
  data: ActivationCodeModalData;
  onClose: () => void;
  title?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { t, locale } = useLanguage();
  const heading = title ?? t("admin.modal.activationTitle");
  const hintText = hint ?? t("admin.modal.activationHint");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activation-code-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="activation-code-title"
          className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-slate-900"
        >
          {heading}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">{t("common.name")}</dt>
            <dd className="font-medium text-slate-900">{data.fullName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("common.email")}</dt>
            <dd className="font-medium text-slate-900">{data.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("admin.modal.activationCode")}</dt>
            <dd className="mt-1 rounded-lg bg-slate-100 px-3 py-2 font-mono text-base font-semibold tracking-wide text-slate-900">
              {data.activationCode}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t("admin.modal.expiration")}</dt>
            <dd className="font-medium text-slate-900">
              {formatDateTime(data.expiresAt, locale)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">{hintText}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(data.activationCode);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? t("common.copied") : t("admin.modal.copyCode")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
