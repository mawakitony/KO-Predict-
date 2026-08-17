"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import {
  ESTIMATION_POPUP_DELAY_MS,
  ESTIMATION_POPUP_ENTER_KEY,
  ESTIMATION_POPUP_SESSION_KEY,
  type EstimationPopupContent,
} from "@/lib/dashboard/estimation-popup";

function QuestionIcon() {
  return (
    <div className="ko-est-pop-icon" aria-hidden>
      <span className="ko-est-pop-blob" />
      <svg viewBox="0 0 64 64" className="ko-est-pop-glyph">
        <circle
          cx="32"
          cy="32"
          r="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
        />
        <path
          d="M26 26c0-4.2 3-7 6.5-7s6.5 2.6 6.5 6.2c0 3.2-1.8 4.6-4.2 6.2-1.8 1.2-2.8 2.2-2.8 4.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <circle cx="32" cy="44" r="2.4" fill="currentColor" />
      </svg>
    </div>
  );
}

function readSeen(): boolean {
  try {
    return sessionStorage.getItem(ESTIMATION_POPUP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(ESTIMATION_POPUP_SESSION_KEY, "1");
  } catch {
    // ignore
  }
}

/** Horodatage d’entrée espace apprenant — survit aux remounts React. */
function remainingDelayMs(): number {
  try {
    const raw = sessionStorage.getItem(ESTIMATION_POPUP_ENTER_KEY);
    const enterAt = raw ? Number(raw) : NaN;
    if (!Number.isFinite(enterAt)) {
      sessionStorage.setItem(ESTIMATION_POPUP_ENTER_KEY, String(Date.now()));
      return ESTIMATION_POPUP_DELAY_MS;
    }
    return Math.max(0, ESTIMATION_POPUP_DELAY_MS - (Date.now() - enterAt));
  } catch {
    return ESTIMATION_POPUP_DELAY_MS;
  }
}

/**
 * Popup espace apprenant — ~10 s après l’entrée si estimation indisponible.
 * Timer persistant (sessionStorage) pour ne pas être annulé au remount.
 */
export function LearnerEstimationPopup({
  initialContent = null,
  enabled = true,
}: {
  initialContent?: EstimationPopupContent | null;
  /** Désactivé tant qu’un guide prioritaire occupe la file auto. */
  enabled?: boolean;
}) {
  const titleId = useId();
  const [popup, setPopup] = useState<EstimationPopupContent | null>(
    initialContent?.show ? initialContent : null,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      return;
    }
    if (readSeen()) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const delay = remainingDelayMs();

    const reveal = (content: EstimationPopupContent) => {
      if (cancelled || readSeen() || !content.show) return;
      timer = setTimeout(() => {
        if (cancelled || readSeen()) return;
        setPopup(content);
        setOpen(true);
      }, delay);
    };

    if (initialContent?.show) {
      reveal(initialContent);
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }

    void (async () => {
      try {
        const res = await fetch("/api/me/estimation-popup", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean;
          popup?: EstimationPopupContent;
        } | null;
        if (cancelled || !res.ok || !body?.ok || !body.popup) return;
        reveal(body.popup);
      } catch {
        // silencieux
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [initialContent, enabled]);

  function dismiss() {
    setOpen(false);
    markSeen();
  }

  if (!open || !popup) return null;

  return (
    <div className="ko-est-pop-root" role="presentation">
      <button
        type="button"
        className="ko-est-pop-backdrop"
        aria-label="Fermer"
        onClick={dismiss}
      />
      <div
        className="ko-est-pop-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <QuestionIcon />
        <h2 id={titleId} className="ko-est-pop-title">
          {popup.title}
        </h2>
        <p className="ko-est-pop-body">{popup.body}</p>
        {popup.reasons.length > 0 ? (
          <ul className="ko-est-pop-reasons">
            {popup.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="ko-est-pop-primary" onClick={dismiss}>
          {popup.primaryLabel}
        </button>
        <Link
          href={popup.secondaryHref}
          className="ko-est-pop-secondary"
          onClick={dismiss}
        >
          {popup.secondaryLabel}
        </Link>
      </div>
    </div>
  );
}
