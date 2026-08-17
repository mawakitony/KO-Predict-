import { Suspense } from "react";
import { LearnerHubLayout } from "@/components/dashboard/LearnerHubLayout";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { LearnerLearningPanel } from "@/components/learning/LearnerLearningPanel";
import { getCurrentProfile } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { getStudentDashboardData } from "@/lib/dashboard/get-student-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ma progression · KO Predict™",
};

export default async function LearningPage() {
  const profile = await getCurrentProfile();
  const showAdmin = canAccessAdmin(profile?.role);

  let qcmAverage: number | null = null;
  let recentQcmAverage: number | null = null;
  let recordedAt: string | null = null;
  let firstName = profile?.firstName ?? undefined;
  let lastName = profile?.lastName ?? null;

  try {
    const data = await getStudentDashboardData();
    qcmAverage =
      data.metrics.qcmAverage == null
        ? null
        : Number(data.metrics.qcmAverage);
    recentQcmAverage =
      data.metrics.recentQcmAverage == null
        ? null
        : Number(data.metrics.recentQcmAverage);
    recordedAt = data.metrics.recordedAt;
    firstName = profile?.firstName ?? data.student.firstName;
    lastName = profile?.lastName ?? data.student.lastName;
  } catch {
    // Page utilisable avec données LearnWorlds live même si agrégats absents.
  }

  return (
    <LearnerHubLayout
      email={profile?.email}
      firstName={firstName}
      lastName={lastName}
      displayName={profile?.displayName}
      avatarUrl={profile?.avatarUrl}
      title="Ma progression pédagogique"
      page="learning"
      recordedAt={recordedAt}
      showAdminLink={showAdmin}
    >
      <Suspense
        fallback={
          <TranslatedText
            messageKey="learner.loadingPath"
            className="text-sm text-slate-500"
          />
        }
      >
        <LearnerLearningPanel
          qcmAverage={qcmAverage}
          recentQcmAverage={recentQcmAverage}
        />
      </Suspense>
    </LearnerHubLayout>
  );
}
