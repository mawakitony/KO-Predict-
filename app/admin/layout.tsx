import { AdminHubLayout } from "@/components/admin/AdminHubLayout";
import { staffPermissions } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  const permissions = staffPermissions(profile.role);

  return (
    <AdminHubLayout
      email={profile.email}
      firstName={profile.firstName}
      lastName={profile.lastName}
      displayName={profile.displayName}
      avatarUrl={profile.avatarUrl}
      canManageTeam={permissions.canManageTeam}
    >
      {children}
    </AdminHubLayout>
  );
}
