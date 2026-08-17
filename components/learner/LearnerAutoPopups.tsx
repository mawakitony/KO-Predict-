"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LearnerEstimationPopup } from "@/components/dashboard/LearnerEstimationPopup";
import { LearnerGuideModal } from "@/components/learner/LearnerGuideModal";
import {
  ESTIMATION_POPUP_ENTER_KEY,
  ESTIMATION_POPUP_SESSION_KEY,
  type EstimationPopupContent,
} from "@/lib/dashboard/estimation-popup";
import {
  pageFromLearnerPathname,
  type LearnerGuideContent,
} from "@/lib/learner/guides";

function readEstimationSeen(): boolean {
  try {
    return sessionStorage.getItem(ESTIMATION_POPUP_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Une seule popup auto à la fois : welcome → estimation → autres guides.
 * Après fermeture, pas de second auto-guide tant que la page ne change pas.
 */
export function LearnerAutoPopups({
  initialEstimation = null,
}: {
  initialEstimation?: EstimationPopupContent | null;
}) {
  const pathname = usePathname();
  const page = pageFromLearnerPathname(pathname);
  const [guide, setGuide] = useState<LearnerGuideContent | null>(null);
  const [estimationEnabled, setEstimationEnabled] = useState(false);
  const [slotConsumed, setSlotConsumed] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(ESTIMATION_POPUP_ENTER_KEY)) {
        sessionStorage.setItem(ESTIMATION_POPUP_ENTER_KEY, String(Date.now()));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGuide(null);
    setEstimationEnabled(false);
    setSlotConsumed(false);

    const estimationSeen = readEstimationSeen();

    void (async () => {
      try {
        const res = await fetch(
          `/api/me/guides?page=${encodeURIComponent(page)}&estimationSeen=${estimationSeen ? "1" : "0"}`,
          { credentials: "same-origin", cache: "no-store" },
        );
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean;
          auto?: "guide" | "estimation" | "none";
          guide?: LearnerGuideContent | null;
        } | null;
        if (cancelled) return;
        if (!res.ok || !body?.ok) {
          if (!estimationSeen && initialEstimation?.show) {
            setEstimationEnabled(true);
          }
          return;
        }
        if (body.auto === "guide" && body.guide) {
          setGuide(body.guide);
          return;
        }
        if (body.auto === "estimation") {
          setEstimationEnabled(true);
        }
      } catch {
        // silencieux
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, initialEstimation]);

  async function ack(action: "dismiss" | "complete") {
    const key = guide?.key;
    setGuide(null);
    setSlotConsumed(true);
    if (!key) return;
    try {
      await fetch("/api/me/guides/ack", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, action }),
      });
    } catch {
      // silencieux
    }
  }

  return (
    <>
      {guide && !slotConsumed ? (
        <LearnerGuideModal guide={guide} onAck={ack} />
      ) : null}
      <LearnerEstimationPopup
        initialContent={initialEstimation}
        enabled={estimationEnabled && !guide && !slotConsumed}
      />
    </>
  );
}
