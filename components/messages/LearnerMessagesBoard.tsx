"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { LearnerReminder } from "@/lib/learner/reminders-shared";
import { Icon3dBell } from "@/components/dashboard/LearnerHeaderIcons";

export function LearnerMessagesBoard({
  initialReminders,
}: {
  initialReminders: LearnerReminder[];
}) {
  const { t } = useLanguage();

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
        <h2>{t("learner.messages.emptyTitle")}</h2>
        <p>{t("learner.messages.emptyBody")}</p>
        <Link href="/plan" className="ko-msg-link">
          {t("learner.messages.seePlan")}
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
                  ? t("learner.messages.coach")
                  : t("learner.messages.auto")}
              </p>
              {reminder.unread ? (
                <span className="ko-msg-pill">{t("learner.messages.new")}</span>
              ) : null}
            </div>
            <h2 className="ko-msg-title">{reminder.title}</h2>
            <p className="ko-msg-body">{reminder.body}</p>
            <Link href={reminder.href} className="ko-msg-link">
              {t("learner.open")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
