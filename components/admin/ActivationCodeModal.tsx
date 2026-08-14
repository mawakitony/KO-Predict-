"use client";

import { useState } from "react";

export interface ActivationCodeModalData {
  fullName: string;
  email: string;
  activationCode: string;
  expiresAt: string;
}

function formatExpiresFr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ActivationCodeModal({
  data,
  onClose,
  title = "Accès KO Predict™ préparé",
  hint = "Communiquez ce code à l’apprenant. Il ne pourra plus être relu plus tard.",
}: {
  data: ActivationCodeModalData;
  onClose: () => void;
  title?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

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
          {title}
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Nom</dt>
            <dd className="font-medium text-slate-900">{data.fullName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{data.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Code d’activation</dt>
            <dd className="mt-1 rounded-lg bg-slate-100 px-3 py-2 font-mono text-base font-semibold tracking-wide text-slate-900">
              {data.activationCode}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Expiration</dt>
            <dd className="font-medium text-slate-900">
              {formatExpiresFr(data.expiresAt)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">{hint}</p>
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
            {copied ? "Copié" : "Copier le code"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
