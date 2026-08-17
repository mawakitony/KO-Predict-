import { AdminHubLayout } from "@/components/admin/AdminHubLayout";
import { LearnerHubLayout } from "@/components/dashboard/LearnerHubLayout";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import {
  canAccessAdmin,
  staffPermissions,
} from "@/lib/auth/permissions";
import { requireActiveAccount } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mon profil · KO Predict™",
};

export default async function ProfilePage() {
  const profile = await requireActiveAccount({ next: "/profile" });
  const isStaff = canAccessAdmin(profile.role);
  const permissions = staffPermissions(profile.role);

  const editor = (
    <div className="ko-profile-page-inner">
      <ProfileEditor
        email={profile.email}
        firstName={profile.firstName}
        lastName={profile.lastName}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        role={profile.role}
      />
    </div>
  );

  if (isStaff) {
    return (
      <AdminHubLayout
        email={profile.email}
        firstName={profile.firstName}
        lastName={profile.lastName}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        canManageTeam={permissions.canManageTeam}
        showSecurityLink={profile.role === "super_admin"}
      >
        <section className="ko-admin-panel">
          <div className="ko-admin-panel-head">
            <div>
              <TranslatedText
                as="p"
                messageKey="nav.account"
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
              />
              <TranslatedText
                as="h1"
                messageKey="nav.profile"
                className="ko-display mt-1 text-xl font-semibold text-slate-900"
              />
              <TranslatedText
                as="p"
                messageKey="chrome.profilePrefsStaff"
                className="mt-1 text-sm text-slate-500"
              />
            </div>
          </div>
          <div className="ko-admin-panel-body">{editor}</div>
        </section>
      </AdminHubLayout>
    );
  }

  return (
    <LearnerHubLayout
      email={profile.email}
      firstName={profile.firstName ?? undefined}
      lastName={profile.lastName}
      displayName={profile.displayName}
      avatarUrl={profile.avatarUrl}
      title="Mon profil"
      page="profile"
      showAdminLink={false}
    >
      {editor}
    </LearnerHubLayout>
  );
}
