"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";

const STEPS = [
  {
    id: "activation",
    title: "Activation par WOLOYEM",
    text: "L’administration WOLOYEM active votre accès KO Predict™ une fois votre inscription validée.",
  },
  {
    id: "code",
    title: "Code secret reçu",
    text: "Pour votre sécurité, vous recevez un code secret personnel transmis par l’administration — jamais affiché publiquement.",
  },
  {
    id: "connect",
    title: "Première connexion",
    text: "Saisissez votre e-mail et le code secret, puis créez votre mot de passe pour ouvrir le tableau de bord.",
  },
] as const;

export function ConnectionGuideDemo() {
  const [step, setStep] = useState(0);
  const [codeReveal, setCodeReveal] = useState(false);

  useEffect(() => {
    setCodeReveal(false);
    if (step !== 1) return;
    const t = window.setTimeout(() => setCodeReveal(true), 450);
    return () => window.clearTimeout(t);
  }, [step]);

  const active = STEPS[step];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="ko-demo-card ko-fade-up">
        <div className="text-center">
          <BrandMark href="/" size="md" tone="light" className="items-center" />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
            Démo · Première connexion
          </p>
          <h1 className="ko-display mt-2 text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
            Comment accéder à votre tableau de bord
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/65">
            Avant de vous connecter, voici le parcours sécurisé mis en place
            pour les apprenants KO Predict™.
          </p>
        </div>

        <ol className="ko-demo-steps" aria-label="Étapes de connexion">
          {STEPS.map((item, index) => {
            const isActive = index === step;
            const isDone = index < step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`ko-demo-step ${isActive ? "is-active" : ""} ${
                    isDone ? "is-done" : ""
                  }`}
                  onClick={() => setStep(index)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="ko-demo-step-num" aria-hidden>
                    {isDone ? "✓" : index + 1}
                  </span>
                  <span className="ko-demo-step-label">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="ko-demo-panel" key={active.id}>
          <div className="ko-demo-copy">
            <p className="ko-demo-kicker">Étape {step + 1} / {STEPS.length}</p>
            <h2 className="ko-demo-title">{active.title}</h2>
            <p className="ko-demo-text">{active.text}</p>

            {step === 1 ? (
              <div className="ko-demo-security" role="note">
                <span className="ko-demo-security-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <path
                      d="M12 3.5 5.5 6.2v5.3c0 4.1 2.7 7.1 6.5 8.5 3.8-1.4 6.5-4.4 6.5-8.5V6.2L12 3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.4 12.1 11.1 13.8l3.6-3.7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <p className="font-bold text-white">Sécurité WOLOYEM</p>
                  <p className="mt-0.5 text-sm text-white/70">
                    Le code secret est délivré uniquement par l’administration
                    WOLOYEM. Ne le partagez jamais et contactez-les si vous ne
                    l’avez pas reçu.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="ko-demo-preview" aria-hidden>
            {step === 0 ? (
              <div className="ko-demo-mock">
                <div className="ko-demo-mock-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300/80">
                  Admin WOLOYEM
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  Accès apprenant activé
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Compte prêt · envoi du code secret
                </p>
                <div className="ko-demo-pulse mt-5">
                  <i />
                  Activation sécurisée
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="ko-demo-mock">
                <div className="ko-demo-mock-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-300/80">
                  Message sécurisé
                </p>
                <p className="mt-2 text-base font-semibold text-white/90">
                  Votre code secret KO Predict™
                </p>
                <div
                  className={`ko-demo-code ${codeReveal ? "is-revealed" : ""}`}
                >
                  {codeReveal ? "K7•M2•9X•Q4" : "••••••••••••"}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/55">
                  Transmis par l’administration WOLOYEM · usage unique
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="ko-demo-mock">
                <div className="ko-demo-mock-bar">
                  <span />
                  <span />
                  <span />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-300/80">
                  Première connexion
                </p>
                <div className="mt-4 space-y-3">
                  <div className="ko-demo-field">
                    <span>E-mail</span>
                    <strong>apprenant@exemple.com</strong>
                  </div>
                  <div className="ko-demo-field">
                    <span>Code secret</span>
                    <strong>• • • • • •</strong>
                  </div>
                  <div className="ko-demo-field is-pass">
                    <span>Créer mon mot de passe</span>
                    <strong>········</strong>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="ko-demo-nav">
          <button
            type="button"
            className="ko-demo-nav-btn"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Précédent
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="ko-demo-nav-btn is-primary"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Suivant
            </button>
          ) : (
            <Link href="/first-access" className="ko-auth-btn ko-demo-cta">
              Je me connecte maintenant
            </Link>
          )}
        </div>

        <div className="mt-6 space-y-2 text-center text-sm">
          {step < STEPS.length - 1 ? (
            <p>
              <Link href="/first-access" className="ko-auth-link font-semibold">
                Je me connecte maintenant
              </Link>
            </p>
          ) : null}
          <p className="ko-auth-muted">
            Déjà un mot de passe ?{" "}
            <Link href="/login" className="ko-auth-link font-semibold">
              Se connecter
            </Link>
          </p>
          <p>
            <Link href="/" className="ko-auth-link text-xs">
              Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
