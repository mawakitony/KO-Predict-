import { LearnWorldsSuperAdminAuthorizationsPanel } from "@/components/admin/LearnWorldsSuperAdminAuthorizationsPanel";
import { TeamBoard } from "@/components/admin/TeamBoard";
import { listLearnWorldsSuperAdminAuthorizations } from "@/lib/admin/learnworlds-super-admin-authorizations";
import type { LwSuperAdminAuthorizationListItem } from "@/lib/admin/learnworlds-super-admin-auth-ui";
import { listTeamMembers } from "@/lib/admin/team";
import { requireSuperAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const profile = await requireSuperAdmin();
  const [members, authorizations] = await Promise.all([
    listTeamMembers(),
    listLearnWorldsSuperAdminAuthorizations(),
  ]);

  const initialAuthorizations: LwSuperAdminAuthorizationListItem[] =
    authorizations.map((row) => ({
      id: row.id,
      email: row.email,
      learnworldsUserId: row.learnworldsUserId,
      status: row.status,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      revokedBy: row.revokedBy,
      revokedAt: row.revokedAt,
      note: row.note,
      learnworldsRoleLevel: row.learnworldsRoleLevel,
    }));

  return (
    <div className="space-y-6">
      <TeamBoard
        initialMembers={members}
        currentUserId={profile.id}
        lwSuperAdminAuthorizations={initialAuthorizations}
      />
      <LearnWorldsSuperAdminAuthorizationsPanel
        initialAuthorizations={initialAuthorizations}
      />
    </div>
  );
}
