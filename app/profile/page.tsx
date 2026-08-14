import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { requireActiveAccount } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mon profil · KO Predict™",
};

export default async function ProfilePage() {
  const profile = await requireActiveAccount({ next: "/profile" });

  return (
    <div className="ko-profile-page min-h-full flex-1">
      <div aria-hidden className="ko-profile-page-aurora" />
      <div className="relative mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-9">
        <ProfileEditor
          email={profile.email}
          firstName={profile.firstName}
          lastName={profile.lastName}
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
          role={profile.role}
        />
      </div>
    </div>
  );
}
