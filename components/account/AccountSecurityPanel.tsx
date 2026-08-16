"use client";

import { useActionState, useState } from "react";
import {
  removeMfaFactorAction,
  signOutAllDevicesAction,
  type MfaSecurityActionState,
} from "@/lib/auth/mfa-security-actions";
import {
  canRemoveVerifiedTotpFactor,
  mfaStatusLabel,
} from "@/lib/auth/mfa-security";
import type { MfaChallengeFactorOption } from "@/lib/auth/mfa-challenge";
import { MfaAddFactorForm } from "@/components/account/MfaAddFactorForm";

const removeInitial: MfaSecurityActionState = { error: null };

interface AccountSecurityPanelProps {
  verifiedFactors: MfaChallengeFactorOption[];
}

export function AccountSecurityPanel({
  verifiedFactors,
}: AccountSecurityPanelProps) {
  const [adding, setAdding] = useState(false);
  const [removeState, removeAction, removePending] = useActionState(
    removeMfaFactorAction,
    removeInitial,
  );
  const verifiedCount = verifiedFactors.length;
  const canRemove = canRemoveVerifiedTotpFactor(verifiedCount);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              MFA
            </dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">
              {mfaStatusLabel(verifiedCount)}
            </dd>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Facteurs configurés
            </dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">
              {verifiedCount}
            </dd>
          </div>
        </dl>

        <p className="text-sm text-slate-600">
          Ajoutez un deuxième facteur pour éviter un blocage si vous perdez votre
          téléphone.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Facteurs TOTP</h2>
        <ul className="space-y-2">
          {verifiedFactors.map((factor) => (
            <li
              key={factor.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-sm font-medium text-slate-800">
                {factor.label}
              </span>
              {canRemove ? (
                <form action={removeAction}>
                  <input type="hidden" name="factorId" value={factor.id} />
                  <button
                    type="submit"
                    disabled={removePending}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </form>
              ) : (
                <span className="text-xs text-slate-400">
                  Suppression interdite (dernier facteur)
                </span>
              )}
            </li>
          ))}
        </ul>
        {removeState.error ? (
          <p className="text-sm text-red-600" role="alert">
            {removeState.error}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Ajouter un facteur
        </h2>
        {adding ? (
          <MfaAddFactorForm onCancel={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            className="rounded-xl bg-[var(--admin-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--admin-blue-hover)]"
            onClick={() => setAdding(true)}
          >
            Ajouter un facteur
          </button>
        )}
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-semibold text-slate-900">Sessions</h2>
        <p className="text-sm text-slate-600">
          Déconnecte ce compte sur tous les appareils et navigateurs.
        </p>
        <form action={signOutAllDevicesAction}>
          <button
            type="submit"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Déconnecter tous les appareils
          </button>
        </form>
      </section>
    </div>
  );
}
