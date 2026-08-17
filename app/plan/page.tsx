import { LearnerHubLayout } from "@/components/dashboard/LearnerHubLayout";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { WorkPlanDetail } from "@/components/plan/WorkPlanDetail";
import { getCurrentProfile } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { loadOwnWorkPlans } from "@/lib/planning/work-plan/load-own";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mon plan · KO Predict™",
};

export default async function PlanPage() {
  const profile = await getCurrentProfile();
  const showAdmin = canAccessAdmin(profile?.role);
  const { active, previous, error } = await loadOwnWorkPlans({
    previousLimit: 10,
  });

  return (
    <LearnerHubLayout
      email={profile?.email}
      firstName={profile?.firstName ?? undefined}
      lastName={profile?.lastName}
      displayName={profile?.displayName}
      avatarUrl={profile?.avatarUrl}
      title="Mon plan de progression"
      subtitle="Courbe d'avancement, objectifs et historique du cycle"
      page="plan"
      showAdminLink={showAdmin}
    >
      {error === "UNAVAILABLE" ? (
        <section className="ko-dash-card p-5 text-sm text-slate-600">
          <TranslatedText messageKey="learner.planUnavailable" />
        </section>
      ) : (
        <WorkPlanDetail active={active} previous={previous} />
      )}
    </LearnerHubLayout>
  );
}
