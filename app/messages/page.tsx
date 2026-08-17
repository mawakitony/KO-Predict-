import { LearnerHubLayout } from "@/components/dashboard/LearnerHubLayout";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { LearnerMessagesBoard } from "@/components/messages/LearnerMessagesBoard";
import { getCurrentProfile } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { loadOwnLearnerReminders } from "@/lib/learner/reminders";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Messages · KO Predict™",
};

export default async function MessagesPage() {
  const profile = await getCurrentProfile();
  const showAdmin = canAccessAdmin(profile?.role);
  const { reminders, error } = await loadOwnLearnerReminders();

  return (
    <LearnerHubLayout
      email={profile?.email}
      firstName={profile?.firstName ?? undefined}
      lastName={profile?.lastName}
      displayName={profile?.displayName}
      avatarUrl={profile?.avatarUrl}
      title="Messages & rappels"
      subtitle="Rappels automatiques KO Predict™ et messages coach"
      page="messages"
      showAdminLink={showAdmin}
    >
      {error === "UNAVAILABLE" ? (
        <section className="ko-dash-card p-5 text-sm text-slate-600">
          <TranslatedText messageKey="learner.messagesUnavailable" />
        </section>
      ) : (
        <LearnerMessagesBoard initialReminders={reminders} />
      )}
    </LearnerHubLayout>
  );
}
