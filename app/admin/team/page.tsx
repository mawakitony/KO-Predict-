import { TeamBoard } from "@/components/admin/TeamBoard";
import { listTeamMembers } from "@/lib/admin/team";
import { requireSuperAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const profile = await requireSuperAdmin();
  const members = await listTeamMembers();

  return <TeamBoard initialMembers={members} currentUserId={profile.id} />;
}
