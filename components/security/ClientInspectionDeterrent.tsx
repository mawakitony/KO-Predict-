"use client";

import { useEffect } from "react";

/** Forme minimale d’un événement clavier — testable hors DOM. */
export type InspectionKeyLike = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

/**
 * Raccourcis d’inspection interceptables.
 * Ne couvre pas Ctrl/Cmd+C/V/X/A ni la saisie courante.
 */
export function isInspectionShortcut(event: InspectionKeyLike): boolean {
  if (event.key === "F12") return true;

  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return false;

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (event.shiftKey && (key === "i" || key === "j" || key === "c")) {
    return true;
  }

  if (!event.shiftKey && key === "u") {
    return true;
  }

  return false;
}

/**
 * Dissuasion frontend (clic droit + raccourcis DevTools si le navigateur
 * les laisse intercepter). Ce n’est pas une protection de sécurité.
 */
export function ClientInspectionDeterrent() {
  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      event.preventDefault();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (
        isInspectionShortcut({
          key: event.key,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        })
      ) {
        event.preventDefault();
      }
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
