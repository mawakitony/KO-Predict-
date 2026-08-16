"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { LearnerReminder } from "@/lib/learner/reminders-shared";
import { Icon3dBell } from "@/components/dashboard/LearnerHeaderIcons";

export function LearnerMessagesBoard({
  initialReminders,
}: {
  initialReminders: LearnerReminder[];
}) {
  useEffect(() => {
    const unreadIds = initialReminders.filter((r) => r.unread).map((r) => r.id);
    if (unreadIds.length === 0) return;
    void fetch("/api/me/reminders/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
  }, [initialReminders]);

  if (initialReminders.length === 0) {
    return (
      <section className="ko-msg-empty">
        <Icon3dBell className="ko-header-3d mx-auto" style={{ width: "3.2rem", height: "3.2rem" }} />
        <h2>Aucun rappel pour le moment</h2>
        <p>
          Le point rouge n&apos;apparaît que lorsqu&apos;un rappel automatique
          KO Predict™ ou un message coach est disponible.
        </p>
        <Link href="/plan" className="ko-msg-link">
          Voir mon plan de progression
        </Link>
      </section>
    );
  }

  return (
    <ul className="ko-msg-list">
      {initialReminders.map((reminder) => (
        <li
          key={reminder.id}
          className={`ko-msg-card${reminder.unread ? " is-unread" : ""}`}
        >
          <div className="ko-msg-card-icon">
            <Icon3dBell />
          </div>
          <div className="ko-msg-card-body">
            <div className="ko-msg-card-top">
              <p className="ko-msg-source">
                {reminder.source === "coach"
                  ? "Rappel coach"
                  : "Rappel automatique"}
              </p>
              {reminder.unread ? (
                <span className="ko-msg-pill">Nouveau</span>
              ) : null}
            </div>
            <h2 className="ko-msg-title">{reminder.title}</h2>
            <p className="ko-msg-body">{reminder.body}</p>
            <Link href={reminder.href} className="ko-msg-link">
              Ouvrir
              <span aria-hidden>→</span>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
