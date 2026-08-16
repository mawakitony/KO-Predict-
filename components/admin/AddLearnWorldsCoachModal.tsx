"use client";

import { useState, useTransition } from "react";
import {
  LW_COACH_CREATE_SUCCESS_NOTE,
  LW_COACH_PASSWORD_NOTE,
  mapLwCoachApiError,
  mapLwCoachEligibilityUiMessage,
  type LwCoachLookupEligibilityStatus,
} from "@/lib/admin/learnworlds-coach-ui";
import { IconCheck, IconMail } from "@/components/admin/AdminIcons";

type LookupIdentity = {
  learnworldsUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleLevel: string | null;
  roleName: string | null;
  isInstructor: boolean;
  isAdmin: boolean;
};

type LookupOk = {
  ok: true;
  email: string;
  eligibility: {
    status: LwCoachLookupEligibilityStatus;
    canCreateCoachV1: boolean;
    message: string;
  };
  identity: LookupIdentity | null;
};

export type AddLearnWorldsCoachCreated = {
  fullName: string;
  email: string;
  activationCode: string;
  expiresAt: string;
};

interface AddLearnWorldsCoachModalProps {
  onClose: () => void;
  onCreated: (payload: AddLearnWorldsCoachCreated) => void;
}

export function AddLearnWorldsCoachModal({
  onClose,
  onCreated,
}: AddLearnWorldsCoachModalProps) {
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<LookupOk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [mfaHref, setMfaHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"idle" | "lookup" | "create">("idle");

  function resetResult() {
    setLookup(null);
    setError(null);
    setSuccessNote(null);
    setMfaHref(null);
  }

  function handleApiError(
    status: number,
    body: { error?: string; code?: string; reasonCode?: string } | null,
  ) {
    const mapped = mapLwCoachApiError({ status, body });
    setError(mapped.message);
    if (mapped.needsMfaChallenge) {
      setMfaHref(
        `/auth/mfa/challenge?next=${encodeURIComponent("/admin/team")}`,
      );
    } else {
      setMfaHref(null);
    }
  }

  function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNote(null);
    setMfaHref(null);
    setLookup(null);
    setPhase("lookup");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/team/learnworlds/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const json = (await res.json().catch(() => null)) as
          | LookupOk
          | { ok: false; error?: string; code?: string; reasonCode?: string }
          | null;
        if (!res.ok || !json || !json.ok) {
          handleApiError(res.status, json && "ok" in json && !json.ok ? json : null);
          return;
        }
        setLookup(json);
      } catch {
        setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      } finally {
        setPhase("idle");
      }
    });
  }

  function onCreate() {
    if (!lookup || lookup.eligibility.status !== "ELIGIBLE_INSTRUCTOR") return;
    setError(null);
    setSuccessNote(null);
    setMfaHref(null);
    setPhase("create");
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/team/learnworlds/create-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Email seul — le rôle LW est revalidé côté serveur.
          body: JSON.stringify({ email: lookup.email }),
        });
        const json = (await res.json().catch(() => null)) as
          | {
              ok: true;
              created: true;
              email: string;
              activationCode: string;
              expiresAt: string;
            }
          | {
              ok: true;
              created: false;
              alreadyCoach: true;
              message?: string;
            }
          | { ok: false; error?: string; code?: string; reasonCode?: string }
          | null;

        if (!res.ok || !json || !("ok" in json) || !json.ok) {
          handleApiError(
            res.status,
            json && "ok" in json && json.ok === false ? json : null,
          );
          return;
        }

        if ("alreadyCoach" in json && json.alreadyCoach) {
          setError("Ce coach existe déjà dans KO Predict™.");
          return;
        }

        if ("created" in json && json.created) {
          const identity = lookup.identity;
          const fullName =
            [identity?.firstName, identity?.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || json.email;
          setSuccessNote(LW_COACH_CREATE_SUCCESS_NOTE);
          onCreated({
            fullName,
            email: json.email,
            activationCode: json.activationCode,
            expiresAt: json.expiresAt,
          });
        }
      } catch {
        setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
      } finally {
        setPhase("idle");
      }
    });
  }

  const canCreate =
    lookup?.eligibility.status === "ELIGIBLE_INSTRUCTOR" &&
    lookup.eligibility.canCreateCoachV1 === true;

  const displayName = lookup?.identity
    ? [lookup.identity.firstName, lookup.identity.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || "—"
    : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lw-coach-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
        <h2
          id="lw-coach-modal-title"
          className="ko-display text-lg font-semibold text-slate-900"
        >
          Ajouter un coach LearnWorlds
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Vérifiez d’abord l’email dans LearnWorlds. KO Predict™ décide ensuite
          du rôle coach.
        </p>

        <form onSubmit={onVerify} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Adresse email LearnWorlds
            <input
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                resetResult();
              }}
              placeholder="coach@exemple.com"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !email.trim()}
            className="ko-btn-blue w-full min-h-11 justify-center sm:w-auto"
          >
            <IconMail className="ko-icon-sm" />
            {phase === "lookup" && pending ? "Vérification…" : "Vérifier"}
          </button>
        </form>

        {lookup ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p
              className={`text-sm font-semibold ${
                canCreate ? "text-emerald-800" : "text-slate-800"
              }`}
            >
              {mapLwCoachEligibilityUiMessage(lookup.eligibility.status)}
            </p>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Nom</dt>
                <dd className="font-medium text-slate-900">{displayName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">
                  {lookup.identity?.email ?? lookup.email}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Rôle LearnWorlds</dt>
                <dd className="font-medium text-slate-900">
                  {lookup.identity
                    ? `${lookup.identity.roleLevel ?? "—"} (${lookup.identity.roleName ?? "—"})`
                    : "—"}
                </dd>
              </div>
            </dl>

            {canCreate ? (
              <>
                <p className="text-xs leading-relaxed text-slate-600">
                  {LW_COACH_PASSWORD_NOTE}
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={onCreate}
                  className="ko-btn-blue w-full min-h-11 justify-center"
                >
                  <IconCheck className="ko-icon-sm" />
                  {phase === "create" && pending
                    ? "Création…"
                    : "Créer comme coach KO Predict™"}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {successNote ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {successNote}
          </p>
        ) : null}

        {error ? (
          <div className="mt-4 space-y-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p>{error}</p>
            {mfaHref ? (
              <a
                href={mfaHref}
                className="inline-flex font-semibold text-red-900 underline"
              >
                Ouvrir la vérification MFA
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
